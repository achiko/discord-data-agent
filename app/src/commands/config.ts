import { Command } from 'commander';
import chalk from 'chalk';
import { input, password, select } from '@inquirer/prompts';
import { getConfig, saveConfig, getConfigPath, ensureConfigDir } from '../config.js';
import { logger } from '../utils/logger.js';

export const configCommand = new Command('config')
  .description('Manage configuration');

configCommand
  .command('show')
  .description('Show current configuration')
  .option('--json', 'Output as JSON', false)
  .action(async (options) => {
    const config = getConfig();

    // Mask sensitive values
    const masked = {
      ...config,
      discord: {
        token: config.discord.token ? '***' + config.discord.token.slice(-4) : '(not set)',
      },
      openai: {
        apiKey: config.openai.apiKey ? '***' + config.openai.apiKey.slice(-4) : '(not set)',
      },
    };

    if (options.json) {
      console.log(JSON.stringify(masked, null, 2));
      return;
    }

    console.log(chalk.bold('\nCurrent Configuration:\n'));
    console.log(chalk.gray(`  Config file: ${getConfigPath()}\n`));
    console.log(chalk.cyan('  Discord:'));
    console.log(chalk.gray(`    Token: ${masked.discord.token}`));
    console.log(chalk.cyan('\n  Database:'));
    console.log(chalk.gray(`    URL: ${config.database.url}`));
    console.log(chalk.cyan('\n  OpenAI:'));
    console.log(chalk.gray(`    API Key: ${masked.openai.apiKey}`));
    console.log(chalk.cyan('\n  Server:'));
    console.log(chalk.gray(`    API Port: ${config.server.apiPort}`));
    console.log(chalk.gray(`    Web Port: ${config.server.webPort}`));
    console.log(chalk.cyan('\n  Exports:'));
    console.log(chalk.gray(`    Directory: ${config.exports.dir}`));
    console.log(chalk.cyan('\n  Logging:'));
    console.log(chalk.gray(`    Level: ${config.logging.level}`));
  });

configCommand
  .command('set')
  .description('Set a configuration value')
  .action(async () => {
    ensureConfigDir();

    const setting = await select({
      message: 'What would you like to configure?',
      choices: [
        { name: 'Discord Token', value: 'discord.token' },
        { name: 'OpenAI API Key', value: 'openai.apiKey' },
        { name: 'Database URL', value: 'database.url' },
        { name: 'API Port', value: 'server.apiPort' },
        { name: 'Web Port', value: 'server.webPort' },
        { name: 'Exports Directory', value: 'exports.dir' },
        { name: 'Log Level', value: 'logging.level' },
      ],
    });

    let value: string | number;

    switch (setting) {
      case 'discord.token':
        value = await password({ message: 'Enter your Discord token:' });
        saveConfig({ discord: { token: value } });
        break;

      case 'openai.apiKey':
        value = await password({ message: 'Enter your OpenAI API key:' });
        saveConfig({ openai: { apiKey: value } });
        break;

      case 'database.url':
        value = await input({
          message: 'Enter database URL:',
          default: 'postgresql://discord_analyzer:discord_analyzer@localhost:5432/discord_analyzer',
        });
        saveConfig({ database: { url: value } });
        break;

      case 'server.apiPort':
        value = parseInt(
          await input({ message: 'Enter API port:', default: '3001' }),
          10
        );
        saveConfig({ server: { apiPort: value } });
        break;

      case 'server.webPort':
        value = parseInt(
          await input({ message: 'Enter web port:', default: '3000' }),
          10
        );
        saveConfig({ server: { webPort: value } });
        break;

      case 'exports.dir':
        value = await input({ message: 'Enter exports directory:', default: './exports' });
        saveConfig({ exports: { dir: value } });
        break;

      case 'logging.level':
        value = await select({
          message: 'Select log level:',
          choices: [
            { name: 'Debug', value: 'debug' },
            { name: 'Info', value: 'info' },
            { name: 'Warn', value: 'warn' },
            { name: 'Error', value: 'error' },
          ],
        });
        saveConfig({ logging: { level: value as 'debug' | 'info' | 'warn' | 'error' } });
        break;
    }

    logger.success('Configuration saved');
  });

configCommand
  .command('init')
  .description('Interactive configuration setup')
  .action(async () => {
    console.log(chalk.bold('\nDiscord Analyzer Setup\n'));

    ensureConfigDir();

    const discordToken = await password({
      message: 'Enter your Discord token (press Enter to skip):',
    });

    const openaiKey = await password({
      message: 'Enter your OpenAI API key (press Enter to skip):',
    });

    const dbUrl = await input({
      message: 'Database URL:',
      default: 'postgresql://discord_analyzer:discord_analyzer@localhost:5432/discord_analyzer',
    });

    saveConfig({
      discord: discordToken ? { token: discordToken } : undefined,
      openai: openaiKey ? { apiKey: openaiKey } : undefined,
      database: { url: dbUrl },
    });

    logger.success(`Configuration saved to ${getConfigPath()}`);
    console.log(chalk.gray('\nYou can also set DISCORD_TOKEN and OPENAI_API_KEY as environment variables.'));
  });
