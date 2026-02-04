#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { logger } from './utils/logger.js';

// Import commands
import { exportCommand } from './commands/export.js';
import { channelsCommand } from './commands/channels.js';
import { guildsCommand } from './commands/guilds.js';
import { ingestCommand } from './commands/ingest.js';
import { embedCommand } from './commands/embed.js';
import { searchCommand } from './commands/search.js';
import { dbCommand } from './commands/db.js';
import { startCommand } from './commands/start.js';
import { configCommand } from './commands/config.js';

const program = new Command();

program
  .name('discord-analyzer')
  .description('Discord Downloader & Analytics Platform with semantic search')
  .version('1.0.0')
  .option('-v, --verbose', 'Enable verbose logging')
  .hook('preAction', (thisCommand) => {
    if (thisCommand.opts().verbose) {
      logger.setLevel('debug');
    }
  });

// Export commands
program.addCommand(exportCommand);
program.addCommand(channelsCommand);
program.addCommand(guildsCommand);

// Database commands
program.addCommand(ingestCommand);
program.addCommand(dbCommand);

// Embedding and search
program.addCommand(embedCommand);
program.addCommand(searchCommand);

// Server management
program.addCommand(startCommand);

// Configuration
program.addCommand(configCommand);

// Show help if no command provided
program.action(() => {
  console.log(chalk.bold.cyan('\n  Discord Analyzer\n'));
  console.log(chalk.gray('  A CLI tool for downloading, storing, and searching Discord messages\n'));
  console.log(chalk.yellow('  Quick Start:'));
  console.log(chalk.gray('    1. Set up your Discord token:'));
  console.log(chalk.white('       export DISCORD_TOKEN=your_token_here\n'));
  console.log(chalk.gray('    2. Start the database:'));
  console.log(chalk.white('       docker compose up -d postgres\n'));
  console.log(chalk.gray('    3. Run migrations:'));
  console.log(chalk.white('       discord-analyzer db:migrate\n'));
  console.log(chalk.gray('    4. Export a channel:'));
  console.log(chalk.white('       discord-analyzer export --channel <channel_id>\n'));
  console.log(chalk.gray('    5. Ingest exported data:'));
  console.log(chalk.white('       discord-analyzer ingest\n'));
  console.log(chalk.gray('  Use --help with any command for more details.\n'));
  program.help();
});

program.parse();
