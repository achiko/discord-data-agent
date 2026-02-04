import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { select } from '@inquirer/prompts';
import { logger } from '../utils/logger.js';
import { runMigrations, resetDatabase, getDatabaseStats } from '../db/client.js';

export const dbCommand = new Command('db')
  .description('Database management commands');

dbCommand
  .command('migrate')
  .description('Run database migrations')
  .action(async () => {
    const spinner = ora('Running migrations...').start();

    try {
      await runMigrations();
      spinner.succeed('Migrations completed successfully');
    } catch (error) {
      spinner.fail('Migration failed');
      logger.error((error as Error).message);
      process.exit(1);
    }
  });

dbCommand
  .command('reset')
  .description('Reset the database (WARNING: deletes all data)')
  .option('-f, --force', 'Skip confirmation prompt', false)
  .action(async (options) => {
    if (!options.force) {
      const confirm = await select({
        message: chalk.red('This will delete ALL data. Are you sure?'),
        choices: [
          { name: 'No, cancel', value: false },
          { name: 'Yes, delete everything', value: true },
        ],
      });

      if (!confirm) {
        console.log('Cancelled.');
        return;
      }
    }

    const spinner = ora('Resetting database...').start();

    try {
      await resetDatabase();
      spinner.succeed('Database reset complete');
    } catch (error) {
      spinner.fail('Reset failed');
      logger.error((error as Error).message);
      process.exit(1);
    }
  });

dbCommand
  .command('stats')
  .description('Show database statistics')
  .action(async () => {
    const spinner = ora('Fetching statistics...').start();

    try {
      const stats = await getDatabaseStats();
      spinner.stop();

      console.log(chalk.bold('\nDatabase Statistics:\n'));
      console.log(chalk.gray(`  Guilds:    ${stats.guilds}`));
      console.log(chalk.gray(`  Channels:  ${stats.channels}`));
      console.log(chalk.gray(`  Users:     ${stats.users}`));
      console.log(chalk.gray(`  Messages:  ${stats.messages}`));
      console.log(chalk.gray(`  Embeddings: ${stats.embeddings}`));

      if (stats.oldestMessage && stats.newestMessage) {
        console.log(chalk.gray(`\n  Date Range:`));
        console.log(chalk.gray(`    Oldest: ${stats.oldestMessage.toLocaleDateString()}`));
        console.log(chalk.gray(`    Newest: ${stats.newestMessage.toLocaleDateString()}`));
      }
    } catch (error) {
      spinner.fail('Failed to fetch statistics');
      logger.error((error as Error).message);
      process.exit(1);
    }
  });
