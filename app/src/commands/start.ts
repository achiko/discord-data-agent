import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { spawn, ChildProcess } from 'child_process';
import { logger } from '../utils/logger.js';
import { getConfig } from '../config.js';
import { isDockerRunning, isContainerRunning } from '../utils/docker.js';

export const startCommand = new Command('start')
  .description('Start all services (database, API server, web UI)')
  .option('--db-only', 'Start only the database', false)
  .option('--api-only', 'Start only the API server', false)
  .option('--web-only', 'Start only the web UI', false)
  .action(async (options) => {
    const config = getConfig();

    // Check Docker is running
    const dockerRunning = await isDockerRunning();
    if (!dockerRunning) {
      logger.failure('Docker is not running. Please start Docker first.');
      process.exit(1);
    }

    const processes: ChildProcess[] = [];

    // Start database if needed
    if (!options.apiOnly && !options.webOnly) {
      const dbRunning = await isContainerRunning('discord_analyzer_db');

      if (dbRunning) {
        logger.success('Database already running');
      } else {
        const spinner = ora('Starting database...').start();

        try {
          const dockerCompose = spawn('docker', ['compose', 'up', '-d', 'postgres'], {
            stdio: 'inherit',
          });

          await new Promise<void>((resolve, reject) => {
            dockerCompose.on('close', (code) => {
              if (code === 0) resolve();
              else reject(new Error(`docker compose exited with code ${code}`));
            });
          });

          // Wait for database to be ready
          await new Promise((resolve) => setTimeout(resolve, 2000));
          spinner.succeed('Database started');
        } catch (error) {
          spinner.fail('Failed to start database');
          logger.error((error as Error).message);
          process.exit(1);
        }
      }

      if (options.dbOnly) {
        console.log(chalk.green('\nDatabase is running on localhost:5432'));
        return;
      }
    }

    // Start API server
    if (!options.dbOnly && !options.webOnly) {
      console.log(chalk.cyan('\nStarting API server...'));

      const apiServer = spawn('node', ['--import', 'tsx', 'src/server/index.ts'], {
        stdio: 'inherit',
        env: { ...process.env },
      });

      processes.push(apiServer);
      console.log(chalk.green(`API server starting on http://localhost:${config.server.apiPort}`));
    }

    // Start web UI
    if (!options.dbOnly && !options.apiOnly) {
      console.log(chalk.cyan('\nStarting web UI...'));

      const webServer = spawn('npm', ['run', 'dev'], {
        cwd: './web',
        stdio: 'inherit',
        env: { ...process.env },
      });

      processes.push(webServer);
      console.log(chalk.green(`Web UI starting on http://localhost:${config.server.webPort}`));
    }

    if (processes.length > 0) {
      console.log(chalk.yellow('\nPress Ctrl+C to stop all services\n'));

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log(chalk.yellow('\nShutting down...'));
        for (const proc of processes) {
          proc.kill('SIGTERM');
        }
        process.exit(0);
      });

      // Keep the process running
      await new Promise(() => {});
    }
  });

// Stop command
export const stopCommand = new Command('stop')
  .description('Stop all services')
  .action(async () => {
    const spinner = ora('Stopping services...').start();

    try {
      const dockerCompose = spawn('docker', ['compose', 'down'], {
        stdio: 'inherit',
      });

      await new Promise<void>((resolve, reject) => {
        dockerCompose.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`docker compose exited with code ${code}`));
        });
      });

      spinner.succeed('All services stopped');
    } catch (error) {
      spinner.fail('Failed to stop services');
      logger.error((error as Error).message);
      process.exit(1);
    }
  });
