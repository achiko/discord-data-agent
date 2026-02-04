import chalk from 'chalk';
import { getConfig } from '../config.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_COLORS: Record<LogLevel, (text: string) => string> = {
  debug: chalk.gray,
  info: chalk.blue,
  warn: chalk.yellow,
  error: chalk.red,
};

const LEVEL_LABELS: Record<LogLevel, string> = {
  debug: 'DEBUG',
  info: 'INFO ',
  warn: 'WARN ',
  error: 'ERROR',
};

class Logger {
  private minLevel: LogLevel = 'info';

  constructor() {
    try {
      const config = getConfig();
      this.minLevel = config.logging.level;
    } catch {
      // Config not available yet, use default
    }
  }

  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.minLevel];
  }

  private formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const colorFn = LEVEL_COLORS[level];
    const label = LEVEL_LABELS[level];

    let formatted = `${chalk.gray(timestamp)} ${colorFn(`[${label}]`)} ${message}`;

    if (meta && Object.keys(meta).length > 0) {
      formatted += ` ${chalk.gray(JSON.stringify(meta))}`;
    }

    return formatted;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, meta));
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, meta));
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  error(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, meta));
    }
  }

  // Simple output without timestamp/level (for CLI user-facing messages)
  print(message: string): void {
    console.log(message);
  }

  success(message: string): void {
    console.log(chalk.green('✓ ') + message);
  }

  failure(message: string): void {
    console.log(chalk.red('✗ ') + message);
  }

  // Table output helper
  table(data: Record<string, unknown>[] | Record<string, unknown>): void {
    console.table(data);
  }
}

export const logger = new Logger();
export default logger;
