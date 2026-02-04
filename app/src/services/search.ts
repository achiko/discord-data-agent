import { db } from '../db/client.js';
import { messages, users, channels, messageEmbeddings } from '../db/schema.js';
import { eq, and, gte, lte, sql, ilike, or, desc } from 'drizzle-orm';
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
  // Split query into words for ILIKE search
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 0);

  if (words.length === 0) {
    return [];
  }

  // Build OR conditions for each word
  const wordConditions = words.map((word) => ilike(messages.content, `%${word}%`));

  const allConditions = [...conditions];
  if (wordConditions.length > 0) {
    allConditions.push(or(...wordConditions)!);
  }

  const results = await db
    .select({
      messageId: messages.id,
      channelId: messages.channelId,
      channelName: channels.name,
      userId: messages.userId,
      username: users.username,
      content: messages.content,
      timestamp: messages.timestamp,
    })
    .from(messages)
    .leftJoin(users, eq(messages.userId, users.id))
    .leftJoin(channels, eq(messages.channelId, channels.id))
    .where(allConditions.length > 0 ? and(...allConditions) : undefined)
    .orderBy(desc(messages.timestamp))
    .limit(limit)
    .offset(offset);

  return results.map((r) => ({
    messageId: r.messageId,
    channelId: r.channelId,
    channelName: r.channelName || 'Unknown',
    userId: r.userId,
    username: r.username || 'Unknown',
    content: r.content,
    timestamp: r.timestamp,
    score: calculateKeywordScore(r.content, words),
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
    userId: r.userId,
    username: r.username || 'Unknown',
    content: r.content,
    timestamp: r.timestamp,
    score: r.similarity,
  }));
}

function calculateKeywordScore(content: string, words: string[]): number {
  const lowerContent = content.toLowerCase();
  let matchCount = 0;

  for (const word of words) {
    if (lowerContent.includes(word)) {
      matchCount++;
    }
  }

  return matchCount / words.length;
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
