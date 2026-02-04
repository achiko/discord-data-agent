import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { getConfig } from '../config.js';
import * as schema from './schema.js';
import { sql } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    const config = getConfig();
    pool = new Pool({
      connectionString: config.database.url,
    });
  }
  return pool;
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema });
  }
  return dbInstance;
}

// Export for convenience
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle>];
  },
});

export async function runMigrations(): Promise<void> {
  const database = getDb();

  // First, ensure extensions are enabled
  const pool = getPool();
  await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
  await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');

  logger.info('Running migrations...');

  await migrate(database, {
    migrationsFolder: './src/db/migrations',
  });

  logger.info('Migrations completed');
}

export async function resetDatabase(): Promise<void> {
  const pool = getPool();

  logger.warn('Resetting database...');

  // Drop all tables in reverse order of dependencies
  await pool.query('DROP TABLE IF EXISTS export_runs CASCADE');
  await pool.query('DROP TABLE IF EXISTS message_embeddings CASCADE');
  await pool.query('DROP TABLE IF EXISTS messages CASCADE');
  await pool.query('DROP TABLE IF EXISTS channels CASCADE');
  await pool.query('DROP TABLE IF EXISTS users CASCADE');
  await pool.query('DROP TABLE IF EXISTS guilds CASCADE');

  // Run migrations to recreate
  await runMigrations();

  logger.info('Database reset complete');
}

export async function getDatabaseStats(): Promise<{
  guilds: number;
  channels: number;
  users: number;
  messages: number;
  embeddings: number;
  oldestMessage: Date | null;
  newestMessage: Date | null;
}> {
  const database = getDb();

  const [guildsCount] = await database
    .select({ count: sql<number>`count(*)` })
    .from(schema.guilds);

  const [channelsCount] = await database
    .select({ count: sql<number>`count(*)` })
    .from(schema.channels);

  const [usersCount] = await database
    .select({ count: sql<number>`count(*)` })
    .from(schema.users);

  const [messagesCount] = await database
    .select({ count: sql<number>`count(*)` })
    .from(schema.messages);

  const [embeddingsCount] = await database
    .select({ count: sql<number>`count(distinct message_id)` })
    .from(schema.messageEmbeddings);

  const [dateRange] = await database
    .select({
      oldest: sql<Date>`min(timestamp)`,
      newest: sql<Date>`max(timestamp)`,
    })
    .from(schema.messages);

  return {
    guilds: Number(guildsCount?.count || 0),
    channels: Number(channelsCount?.count || 0),
    users: Number(usersCount?.count || 0),
    messages: Number(messagesCount?.count || 0),
    embeddings: Number(embeddingsCount?.count || 0),
    oldestMessage: dateRange?.oldest || null,
    newestMessage: dateRange?.newest || null,
  };
}

export async function closeConnection(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    dbInstance = null;
  }
}
