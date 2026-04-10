import { Command } from 'commander';
import chalk from 'chalk';
import { getConfig, validateConfig } from '../config.js';
import { logger } from '../utils/logger.js';
import { runDiscordExporter } from '../services/discord-exporter.js';

export const exportCommand = new Command('export')
  .description('Export messages from Discord channels')
  .option('-c, --channel <id>', 'Export a specific channel')
  .option('-g, --guild <id>', 'Export all channels in a guild')
  .option('-s, --since <date>', 'Export messages after this date (YYYY-MM-DD or relative like "30d")')
  .option('-b, --before <date>', 'Export messages before this date (YYYY-MM-DD)')
  .option('-t, --threads', 'Include threads', false)
  .option('-f, --format <format>', 'Export format (json, html, csv)', 'json')
  .option('--dry-run', 'Show what would be exported without actually exporting', false)
  .action(async (options) => {
    const config = getConfig();

    try {
      validateConfig(config);
    } catch (error) {
      logger.failure((error as Error).message);
      process.exit(1);
    }

    if (!options.channel && !options.guild) {
      logger.failure('Please specify either --channel or --guild');
      process.exit(1);
    }

    if (options.dryRun) {
      console.log(chalk.yellow('\n[DRY RUN] Would export with options:'));
      console.log(chalk.gray(JSON.stringify(options, null, 2)));
      return;
    }

    logger.info('Starting export. Live DiscordChatExporter output will stream below.');

    try {
      const result = await runDiscordExporter({
        token: config.discord.token,
        channelId: options.channel,
        guildId: options.guild,
        since: options.since,
        before: options.before,
        format: options.format,
        includeThreads: options.threads,
        outputDir: config.exports.dir,
        liveOutput: true,
      });

      logger.success(`Export completed: ${result.outputPath}`);

      if (result.messageCount !== undefined) {
        logger.info(`Exported ${result.messageCount} messages`);
      }
    } catch (error) {
      logger.failure(`Export failed: ${(error as Error).message}`);
      process.exit(1);
    }
  });
