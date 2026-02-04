import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { getConfig } from '../config.js';
import { logger } from '../utils/logger.js';
import { generateEmbeddings, getEmbeddingStats } from '../services/embeddings.js';

export const embedCommand = new Command('embed')
  .description('Generate embeddings for messages')
  .option('-c, --channel <id>', 'Generate embeddings for a specific channel')
  .option('--batch-size <size>', 'Number of messages to process per batch', '100')
  .option('--force', 'Regenerate embeddings for all messages (including existing)', false)
  .option('--stats', 'Show embedding statistics only', false)
  .action(async (options) => {
    const config = getConfig();

    if (!config.openai.apiKey) {
      logger.failure('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
      process.exit(1);
    }

    if (options.stats) {
      const spinner = ora('Fetching embedding statistics...').start();
      try {
        const stats = await getEmbeddingStats();
        spinner.stop();

        console.log(chalk.bold('\nEmbedding Statistics:\n'));
        console.log(chalk.gray(`  Total messages: ${stats.totalMessages}`));
        console.log(chalk.gray(`  Messages with embeddings: ${stats.embeddedMessages}`));
        console.log(chalk.gray(`  Pending embeddings: ${stats.pendingMessages}`));
        console.log(chalk.gray(`  Coverage: ${stats.coverage}%`));
        return;
      } catch (error) {
        spinner.fail('Failed to fetch statistics');
        logger.error((error as Error).message);
        process.exit(1);
      }
    }

    const spinner = ora('Generating embeddings...').start();

    try {
      const result = await generateEmbeddings({
        channelId: options.channel,
        batchSize: parseInt(options.batchSize, 10),
        force: options.force,
        onProgress: (processed, total) => {
          spinner.text = `Generating embeddings... ${processed}/${total}`;
        },
      });

      spinner.succeed(`Generated ${result.embeddingsCreated} embeddings`);

      if (result.errors.length > 0) {
        logger.warn(`${result.errors.length} messages failed to embed`);
      }
    } catch (error) {
      spinner.fail('Embedding generation failed');
      logger.error((error as Error).message);
      process.exit(1);
    }
  });
