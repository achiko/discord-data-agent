import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { getConfig } from '../config.js';
import { logger } from '../utils/logger.js';
import { parseExportFile } from '../services/export-parser.js';
import { ingestMessages } from '../services/ingestion.js';

export const ingestCommand = new Command('ingest')
  .description('Ingest exported JSON files into the database')
  .option('-f, --file <path>', 'Ingest a specific file')
  .option('-d, --dir <path>', 'Ingest all JSON files from directory')
  .option('--dry-run', 'Show what would be ingested without actually ingesting', false)
  .action(async (options) => {
    const config = getConfig();
    const exportsDir = options.dir || config.exports.dir;

    let filesToIngest: string[] = [];

    if (options.file) {
      if (!existsSync(options.file)) {
        logger.failure(`File not found: ${options.file}`);
        process.exit(1);
      }
      filesToIngest = [options.file];
    } else {
      if (!existsSync(exportsDir)) {
        logger.failure(`Exports directory not found: ${exportsDir}`);
        process.exit(1);
      }

      filesToIngest = readdirSync(exportsDir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => join(exportsDir, f));

      if (filesToIngest.length === 0) {
        logger.failure(`No JSON files found in ${exportsDir}`);
        process.exit(1);
      }
    }

    console.log(chalk.bold(`\nFound ${filesToIngest.length} file(s) to ingest\n`));

    if (options.dryRun) {
      console.log(chalk.yellow('[DRY RUN] Would ingest:'));
      for (const file of filesToIngest) {
        console.log(chalk.gray(`  - ${file}`));
      }
      return;
    }

    let totalMessages = 0;

    for (const file of filesToIngest) {
      const spinner = ora(`Ingesting ${file}...`).start();

      try {
        const exportData = await parseExportFile(file);
        const result = await ingestMessages(exportData);

        spinner.succeed(
          `Ingested ${file}: ${result.messagesIngested} messages, ${result.usersIngested} users`
        );
        totalMessages += result.messagesIngested;
      } catch (error) {
        spinner.fail(`Failed to ingest ${file}`);
        logger.error((error as Error).message);
      }
    }

    console.log(chalk.bold.green(`\nTotal: ${totalMessages} messages ingested`));
  });
