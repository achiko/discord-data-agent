import { runMigrations, closeConnection } from './client.js';
import { logger } from '../utils/logger.js';

async function main() {
  try {
    await runMigrations();
    logger.success('Migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed', { error: (error as Error).message });
    process.exit(1);
  } finally {
    await closeConnection();
  }
}

main();
