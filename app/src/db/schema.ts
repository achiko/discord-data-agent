import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
  primaryKey,
  varchar,
  jsonb,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Custom vector type for pgvector
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const vector = (_name: string, _dimensions: number) =>
  text(_name).$type<number[]>();

// Guilds table
export const guilds = pgTable('guilds', {
  id: varchar('id', { length: 32 }).primaryKey(),
  name: text('name').notNull(),
  iconUrl: text('icon_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Channels table
export const channels = pgTable(
  'channels',
  {
    id: varchar('id', { length: 32 }).primaryKey(),
    guildId: varchar('guild_id', { length: 32 })
      .notNull()
      .references(() => guilds.id),
    name: text('name').notNull(),
    type: text('type').notNull(),
    topic: text('topic'),
    categoryId: varchar('category_id', { length: 32 }),
    category: text('category'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    guildIdIdx: index('channels_guild_id_idx').on(table.guildId),
  })
);

// Users table
export const users = pgTable('users', {
  id: varchar('id', { length: 32 }).primaryKey(),
  username: text('username').notNull(),
  discriminator: text('discriminator'),
  avatarUrl: text('avatar_url'),
  isBot: boolean('is_bot').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Messages table
export const messages = pgTable(
  'messages',
  {
    id: varchar('id', { length: 32 }).primaryKey(),
    channelId: varchar('channel_id', { length: 32 })
      .notNull()
      .references(() => channels.id),
    userId: varchar('user_id', { length: 32 })
      .notNull()
      .references(() => users.id),
    content: text('content').notNull(),
    timestamp: timestamp('timestamp').notNull(),
    editedTimestamp: timestamp('edited_timestamp'),
    type: text('type').notNull(),
    isPinned: boolean('is_pinned').default(false).notNull(),
    referenceId: varchar('reference_id', { length: 32 }),
    attachmentsJson: jsonb('attachments_json'),
    embedsJson: jsonb('embeds_json'),
    reactionsJson: jsonb('reactions_json'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    channelIdIdx: index('messages_channel_id_idx').on(table.channelId),
    userIdIdx: index('messages_user_id_idx').on(table.userId),
    timestampIdx: index('messages_timestamp_idx').on(table.timestamp),
    contentSearchIdx: index('messages_content_search_idx').using(
      'gin',
      sql`to_tsvector('english', ${table.content})`
    ),
  })
);

// Message embeddings table for vector search
export const messageEmbeddings = pgTable(
  'message_embeddings',
  {
    messageId: varchar('message_id', { length: 32 })
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull().default(0),
    chunkText: text('chunk_text').notNull(),
    embedding: vector('embedding', 1536).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.messageId, table.chunkIndex] }),
    embeddingIdx: index('message_embeddings_embedding_idx').using(
      'ivfflat',
      sql`${table.embedding} vector_cosine_ops`
    ),
  })
);

// Export runs table for incremental sync tracking
export const exportRuns = pgTable(
  'export_runs',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    guildId: varchar('guild_id', { length: 32 }).references(() => guilds.id),
    channelId: varchar('channel_id', { length: 32 }).references(() => channels.id),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    messageCount: integer('message_count'),
    lastMessageId: varchar('last_message_id', { length: 32 }),
    sinceDate: timestamp('since_date'),
    status: text('status').notNull().default('running'),
    error: text('error'),
  },
  (table) => ({
    channelIdIdx: index('export_runs_channel_id_idx').on(table.channelId),
    guildIdIdx: index('export_runs_guild_id_idx').on(table.guildId),
  })
);

// Type exports
export type Guild = typeof guilds.$inferSelect;
export type NewGuild = typeof guilds.$inferInsert;
export type Channel = typeof channels.$inferSelect;
export type NewChannel = typeof channels.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type MessageEmbedding = typeof messageEmbeddings.$inferSelect;
export type NewMessageEmbedding = typeof messageEmbeddings.$inferInsert;
export type ExportRun = typeof exportRuns.$inferSelect;
export type NewExportRun = typeof exportRuns.$inferInsert;
