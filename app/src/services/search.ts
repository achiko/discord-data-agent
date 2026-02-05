import { db } from '../db/client.js';
import { messages, users, channels, messageEmbeddings } from '../db/schema.js';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { getEmbedding } from './embeddings.js';
import type { SearchOptions, SearchResult } from '../types/index.js';
import { logger } from '../utils/logger.js';

export async function searchMessages(options: SearchOptions): Promise<SearchResult[]> {
  const {
    query,
    channelId,
    userId,
    fromDate,
    toDate,
    searchType = 'hybrid',
    limit = 20,
    offset = 0,
  } = options;

  logger.debug('Search options', { query, channelId, userId, searchType });

  // Build base conditions
  const conditions: ReturnType<typeof eq>[] = [];

  if (channelId) {
    conditions.push(eq(messages.channelId, channelId));
  }

  if (userId) {
    conditions.push(eq(messages.userId, userId));
  }

  if (fromDate) {
    conditions.push(gte(messages.timestamp, fromDate));
  }

  if (toDate) {
    conditions.push(lte(messages.timestamp, toDate));
  }

  let results: SearchResult[] = [];

  if (searchType === 'keyword' || searchType === 'hybrid') {
    // Full-text keyword search
    const keywordResults = await keywordSearch(query, conditions, limit, offset);
    results = keywordResults;
  }

  if (searchType === 'semantic' || searchType === 'hybrid') {
    // Vector similarity search
    const semanticResults = await semanticSearch(query, conditions, limit, offset);

    if (searchType === 'hybrid') {
      // Merge and deduplicate results
      results = mergeResults(results, semanticResults, limit);
    } else {
      results = semanticResults;
    }
  }

  return results;
}

async function keywordSearch(
  query: string,
  conditions: ReturnType<typeof eq>[],
  limit: number,
  offset: number
): Promise<SearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  // Use PostgreSQL full-text search with ts_rank for BM25-style ranking
  // This uses the existing GIN index on to_tsvector('english', content)
  const tsQuery = sql`plainto_tsquery('english', ${query})`;
  const tsVector = sql`to_tsvector('english', ${messages.content})`;

  // ts_rank with normalization option 1 divides by 1 + log(document length)
  // This provides BM25-like length normalization
  const rank = sql<number>`ts_rank(${tsVector}, ${tsQuery}, 1)`.as('rank');

  const allConditions = [
    sql`${tsVector} @@ ${tsQuery}`,
    ...conditions,
  ];

  const results = await db
    .select({
      messageId: messages.id,
      channelId: messages.channelId,
      channelName: channels.name,
      guildId: channels.guildId,
      userId: messages.userId,
      username: users.username,
      content: messages.content,
      timestamp: messages.timestamp,
      rank,
    })
    .from(messages)
    .leftJoin(users, eq(messages.userId, users.id))
    .leftJoin(channels, eq(messages.channelId, channels.id))
    .where(and(...allConditions))
    .orderBy(sql`rank DESC`)
    .limit(limit)
    .offset(offset);

  // Normalize scores to 0-1 range
  const maxRank = results.length > 0 ? Math.max(...results.map((r) => r.rank || 0)) : 1;

  return results.map((r) => ({
    messageId: r.messageId,
    channelId: r.channelId,
    channelName: r.channelName || 'Unknown',
    guildId: r.guildId || '',
    userId: r.userId,
    username: r.username || 'Unknown',
    content: r.content,
    timestamp: r.timestamp,
    score: maxRank > 0 ? (r.rank || 0) / maxRank : 0,
  }));
}

async function semanticSearch(
  query: string,
  conditions: ReturnType<typeof eq>[],
  limit: number,
  offset: number
): Promise<SearchResult[]> {
  // Generate embedding for query
  const queryEmbedding = await getEmbedding(query);

  // Use cosine similarity for vector search
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  const results = await db
    .select({
      messageId: messages.id,
      channelId: messages.channelId,
      channelName: channels.name,
      guildId: channels.guildId,
      userId: messages.userId,
      username: users.username,
      content: messages.content,
      timestamp: messages.timestamp,
      similarity: sql<number>`1 - (${messageEmbeddings.embedding} <=> ${embeddingStr}::vector)`.as('similarity'),
    })
    .from(messageEmbeddings)
    .innerJoin(messages, eq(messageEmbeddings.messageId, messages.id))
    .leftJoin(users, eq(messages.userId, users.id))
    .leftJoin(channels, eq(messages.channelId, channels.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${messageEmbeddings.embedding} <=> ${embeddingStr}::vector`)
    .limit(limit)
    .offset(offset);

  return results.map((r) => ({
    messageId: r.messageId,
    channelId: r.channelId,
    channelName: r.channelName || 'Unknown',
    guildId: r.guildId || '',
    userId: r.userId,
    username: r.username || 'Unknown',
    content: r.content,
    timestamp: r.timestamp,
    score: r.similarity,
  }));
}

export interface CompareSearchResult {
  keyword: SearchResult[];
  semantic: SearchResult[];
  hybrid: SearchResult[];
}

export async function compareSearchMethods(options: SearchOptions): Promise<CompareSearchResult> {
  const {
    query,
    channelId,
    userId,
    fromDate,
    toDate,
    limit = 20,
    offset = 0,
  } = options;

  logger.debug('Compare search options', { query, channelId, userId });

  // Build base conditions
  const conditions: ReturnType<typeof eq>[] = [];

  if (channelId) {
    conditions.push(eq(messages.channelId, channelId));
  }

  if (userId) {
    conditions.push(eq(messages.userId, userId));
  }

  if (fromDate) {
    conditions.push(gte(messages.timestamp, fromDate));
  }

  if (toDate) {
    conditions.push(lte(messages.timestamp, toDate));
  }

  // Run all three search types in parallel
  const [keywordResults, semanticResults] = await Promise.all([
    keywordSearch(query, conditions, limit, offset),
    semanticSearch(query, conditions, limit, offset),
  ]);

  const hybridResults = mergeResults(keywordResults, semanticResults, limit);

  return {
    keyword: keywordResults,
    semantic: semanticResults,
    hybrid: hybridResults,
  };
}

function mergeResults(
  keywordResults: SearchResult[],
  semanticResults: SearchResult[],
  limit: number
): SearchResult[] {
  const seen = new Set<string>();
  const merged: SearchResult[] = [];

  // Interleave results, preferring higher scores
  const all = [...keywordResults, ...semanticResults].sort((a, b) => b.score - a.score);

  for (const result of all) {
    if (!seen.has(result.messageId)) {
      seen.add(result.messageId);
      merged.push(result);

      if (merged.length >= limit) {
        break;
      }
    }
  }

  return merged;
}
