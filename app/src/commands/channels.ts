import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { getConfig, validateConfig } from '../config.js';
import { logger } from '../utils/logger.js';
import { listChannels } from '../services/discord-exporter.js';

export const channelsCommand = new Command('channels')
  .description('List available channels in a guild')
  .requiredOption('-g, --guild <id>', 'Guild ID to list channels from')
  .option('--json', 'Output as JSON', false)
  .action(async (options) => {
    const config = getConfig();

    try {
      validateConfig(config);
    } catch (error) {
      logger.failure((error as Error).message);
      process.exit(1);
    }

    const spinner = ora('Fetching channels...').start();

    try {
      const channels = await listChannels(config.discord.token, options.guild);
      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(channels, null, 2));
        return;
      }

      console.log(chalk.bold(`\nChannels in guild ${options.guild}:\n`));

      // Group by category
      const byCategory: Record<string, typeof channels> = {};
      for (const channel of channels) {
        const category = channel.category || 'No Category';
        if (!byCategory[category]) {
          byCategory[category] = [];
        }
        byCategory[category].push(channel);
      }

      for (const [category, categoryChannels] of Object.entries(byCategory)) {
        console.log(chalk.yellow(`  ${category}`));
        for (const channel of categoryChannels) {
          const typeIcon = channel.type === 'GuildTextChat' ? '#' :
                          channel.type === 'GuildVoice' ? '🔊' : '•';
          console.log(chalk.gray(`    ${typeIcon} ${channel.name} (${channel.id})`));
        }
        console.log();
      }

      console.log(chalk.gray(`Total: ${channels.length} channels`));
    } catch (error) {
      spinner.fail('Failed to fetch channels');
      logger.error((error as Error).message);
      process.exit(1);
    }
  });
