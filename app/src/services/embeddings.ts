import OpenAI from 'openai';
import { getConfig } from '../config.js';
import { db } from '../db/client.js';
import { messages, messageEmbeddings } from '../db/schema.js';
import { eq, isNull, sql } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

export interface EmbeddingOptions {
  channelId?: string;
  batchSize?: number;
  force?: boolean;
  onProgress?: (processed: number, total: number) => void;
}

export interface EmbeddingResult {
  embeddingsCreated: number;
  errors: string[];
}

export interface EmbeddingStats {
  totalMessages: number;
  embeddedMessages: number;
  pendingMessages: number;
  coverage: number;
}

function chunkText(text: string, maxTokens: number = 512): string[] {
  // Simple chunking by character count (approximate)
  // A more sophisticated implementation would use a tokenizer
  const approxCharsPerToken = 4;
  const maxChars = maxTokens * approxCharsPerToken;

  if (text.length <= maxChars) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxChars;

    // Try to break at sentence boundaries
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > start + maxChars / 2) {
        end = breakPoint + 1;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end;
  }

  return chunks.filter((c) => c.length > 0);
}

export async function generateEmbeddings(options: EmbeddingOptions): Promise<EmbeddingResult> {
  const config = getConfig();

  if (!config.openai.apiKey) {
    throw new Error('OpenAI API key is required');
  }

  const openai = new OpenAI({ apiKey: config.openai.apiKey });
  const batchSize = options.batchSize || 100;

  let errors: string[] = [];
  let embeddingsCreated = 0;

  // Get messages that need embeddings
  let query = db
    .select({
      id: messages.id,
      content: messages.content,
    })
    .from(messages);

  if (options.channelId) {
    query = query.where(eq(messages.channelId, options.channelId)) as typeof query;
  }

  if (!options.force) {
    // Only get messages without embeddings
    query = query.where(
      isNull(
        db
          .select({ messageId: messageEmbeddings.messageId })
          .from(messageEmbeddings)
          .where(eq(messageEmbeddings.messageId, messages.id))
      )
    ) as typeof query;
  }

  const messagesToEmbed = await query;
  const total = messagesToEmbed.length;

  logger.info(`Found ${total} messages to embed`);

  // Process in batches
  for (let i = 0; i < messagesToEmbed.length; i += batchSize) {
    const batch = messagesToEmbed.slice(i, i + batchSize);

    // Prepare texts for embedding
    const textsToEmbed: { messageId: string; chunkIndex: number; text: string }[] = [];

    for (const message of batch) {
      if (!message.content || message.content.trim().length === 0) {
        continue;
      }

      const chunks = chunkText(message.content);
      for (let j = 0; j < chunks.length; j++) {
        textsToEmbed.push({
          messageId: message.id,
          chunkIndex: j,
          text: chunks[j],
        });
      }
    }

    if (textsToEmbed.length === 0) {
      continue;
    }

    try {
      // Generate embeddings
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: textsToEmbed.map((t) => t.text),
        dimensions: EMBEDDING_DIMENSIONS,
      });

      // Store embeddings
      for (let j = 0; j < response.data.length; j++) {
        const embedding = response.data[j].embedding;
        const { messageId, chunkIndex, text } = textsToEmbed[j];

        // Convert embedding array to pgvector string format
        const embeddingString = `[${embedding.join(',')}]`;

        await db
          .insert(messageEmbeddings)
          .values({
            messageId,
            chunkIndex,
            chunkText: text,
            embedding: embeddingString as unknown as number[],
          })
          .onConflictDoUpdate({
            target: [messageEmbeddings.messageId, messageEmbeddings.chunkIndex],
            set: {
              chunkText: text,
              embedding: embeddingString as unknown as number[],
            },
          });

        embeddingsCreated++;
      }
    } catch (error) {
      logger.error('Failed to generate embeddings for batch', { error });
      errors.push(`Batch ${i / batchSize}: ${(error as Error).message}`);
    }

    if (options.onProgress) {
      options.onProgress(Math.min(i + batchSize, total), total);
    }

    // Rate limiting - OpenAI allows 3000 RPM for embeddings
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return {
    embeddingsCreated,
    errors,
  };
}

export async function getEmbeddingStats(): Promise<EmbeddingStats> {
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(messages);

  const embeddedResult = await db
    .select({ count: sql<number>`count(distinct ${messageEmbeddings.messageId})` })
    .from(messageEmbeddings);

  const totalMessages = Number(totalResult[0]?.count || 0);
  const embeddedMessages = Number(embeddedResult[0]?.count || 0);
  const pendingMessages = totalMessages - embeddedMessages;
  const coverage = totalMessages > 0 ? Math.round((embeddedMessages / totalMessages) * 100) : 0;

  return {
    totalMessages,
    embeddedMessages,
    pendingMessages,
    coverage,
  };
}

export async function getEmbedding(text: string): Promise<number[]> {
  const config = getConfig();

  if (!config.openai.apiKey) {
    throw new Error('OpenAI API key is required');
  }

  const openai = new OpenAI({ apiKey: config.openai.apiKey });

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data[0].embedding;
}
