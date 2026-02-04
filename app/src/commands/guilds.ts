import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { getConfig, validateConfig } from '../config.js';
import { logger } from '../utils/logger.js';
import { listGuilds } from '../services/discord-exporter.js';

export const guildsCommand = new Command('guilds')
  .description('List available guilds (Discord servers)')
  .option('--json', 'Output as JSON', false)
  .action(async (options) => {
    const config = getConfig();

    try {
      validateConfig(config);
    } catch (error) {
      logger.failure((error as Error).message);
      process.exit(1);
    }

    const spinner = ora('Fetching guilds...').start();

    try {
      const guilds = await listGuilds(config.discord.token);
      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(guilds, null, 2));
        return;
      }

      console.log(chalk.bold('\nAvailable Guilds:\n'));

      for (const guild of guilds) {
        console.log(chalk.cyan(`  ${guild.name}`));
        console.log(chalk.gray(`    ID: ${guild.id}`));
        console.log();
      }

      console.log(chalk.gray(`Total: ${guilds.length} guilds`));
    } catch (error) {
      spinner.fail('Failed to fetch guilds');
      logger.error((error as Error).message);
      process.exit(1);
    }
  });
