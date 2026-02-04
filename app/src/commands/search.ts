import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { getConfig } from '../config.js';
import { logger } from '../utils/logger.js';
import { searchMessages } from '../services/search.js';

export const searchCommand = new Command('search')
  .description('Search messages using semantic and keyword search')
  .argument('<query>', 'Search query')
  .option('-c, --channel <id>', 'Filter by channel')
  .option('-u, --user <id>', 'Filter by user')
  .option('--from <date>', 'Filter messages after this date (YYYY-MM-DD)')
  .option('--to <date>', 'Filter messages before this date (YYYY-MM-DD)')
  .option('-t, --type <type>', 'Search type: semantic, keyword, or hybrid', 'hybrid')
  .option('-l, --limit <count>', 'Maximum results to return', '20')
  .option('--json', 'Output as JSON', false)
  .action(async (query, options) => {
    const config = getConfig();

    if (options.type === 'semantic' && !config.openai.apiKey) {
      logger.failure('OpenAI API key is required for semantic search.');
      process.exit(1);
    }

    const spinner = ora('Searching...').start();

    try {
      const results = await searchMessages({
        query,
        channelId: options.channel,
        userId: options.user,
        fromDate: options.from ? new Date(options.from) : undefined,
        toDate: options.to ? new Date(options.to) : undefined,
        searchType: options.type,
        limit: parseInt(options.limit, 10),
      });

      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
        return;
      }

      if (results.length === 0) {
        console.log(chalk.yellow('\nNo results found.'));
        return;
      }

      console.log(chalk.bold(`\nFound ${results.length} result(s):\n`));

      for (const result of results) {
        const date = new Date(result.timestamp).toLocaleDateString();
        const score = (result.score * 100).toFixed(1);

        console.log(chalk.cyan(`[${score}%] `) + chalk.bold(result.username));
        console.log(chalk.gray(`  #${result.channelName} • ${date}`));
        console.log(chalk.white(`  ${truncate(result.content, 200)}`));
        console.log();
      }
    } catch (error) {
      spinner.fail('Search failed');
      logger.error((error as Error).message);
      process.exit(1);
    }
  });

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}
