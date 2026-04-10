import { resolve } from 'path';
import { mkdirSync, existsSync, readdirSync } from 'fs';
import { runContainer, isDockerRunning, pullImageIfNeeded } from '../utils/docker.js';
import { logger } from '../utils/logger.js';
import type { DiscordGuild, DiscordChannel } from '../types/index.js';

const EXPORTER_IMAGE = 'tyrrrz/discordchatexporter:stable';

export interface ExporterOptions {
  token: string;
  channelId?: string;
  guildId?: string;
  since?: string;
  before?: string;
  format?: 'json' | 'html' | 'csv';
  includeThreads?: boolean;
  outputDir: string;
  liveOutput?: boolean;
}

export interface ExportResult {
  outputPath: string;
  messageCount?: number;
}

function parseDateOption(value: string): string {
  // Handle relative dates like "30d", "7d", "1w"
  const relativeMatch = value.match(/^(\d+)([dwmyDWMY])$/);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2].toLowerCase();

    const date = new Date();
    switch (unit) {
      case 'd':
        date.setDate(date.getDate() - amount);
        break;
      case 'w':
        date.setDate(date.getDate() - amount * 7);
        break;
      case 'm':
        date.setMonth(date.getMonth() - amount);
        break;
      case 'y':
        date.setFullYear(date.getFullYear() - amount);
        break;
    }
    return date.toISOString().split('T')[0];
  }

  // Assume it's already a date string
  return value;
}

export async function runDiscordExporter(options: ExporterOptions): Promise<ExportResult> {
  const dockerRunning = await isDockerRunning();
  if (!dockerRunning) {
    throw new Error('Docker is not running. Please start Docker first.');
  }

  // Ensure output directory exists
  const outputDir = resolve(options.outputDir);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  await pullImageIfNeeded(EXPORTER_IMAGE);

  // Build command arguments
  const args: string[] = [];

  if (options.channelId) {
    args.push('export', '-c', options.channelId);
  } else if (options.guildId) {
    args.push('exportguild', '-g', options.guildId);
  } else {
    throw new Error('Either channelId or guildId must be specified');
  }

  args.push('-t', options.token);
  args.push('-f', options.format || 'Json');
  args.push('-o', '/app/out');

  if (options.since) {
    args.push('--after', parseDateOption(options.since));
  }

  if (options.before) {
    args.push('--before', parseDateOption(options.before));
  }

  if (options.includeThreads) {
    args.push('--include-threads');
  }

  logger.debug('Running Discord exporter', { args: args.filter((a) => a !== options.token) });

  const result = await runContainer({
    image: EXPORTER_IMAGE,
    command: args,
    volumes: {
      [outputDir]: { bind: '/app/out', mode: 'rw' },
    },
    autoRemove: true,
    tty: options.liveOutput,
    liveOutput: options.liveOutput,
  });

  if (result.exitCode !== 0) {
    logger.debug('Exporter output', { stdout: result.stdout, stderr: result.stderr });
    if (options.liveOutput) {
      throw new Error(`Export failed with exit code ${result.exitCode}. See live DiscordChatExporter output above.`);
    }

    throw new Error(`Export failed with exit code ${result.exitCode}: ${result.stderr || result.stdout}`);
  }

  // Find the exported file(s) - log for debugging
  const exportedFiles = readdirSync(outputDir).filter((f) =>
    f.endsWith(`.${options.format || 'json'}`)
  );
  logger.debug(`Exported files: ${exportedFiles.join(', ')}`);

  return {
    outputPath: outputDir,
    messageCount: undefined, // Will be populated after parsing
  };
}

export async function listGuilds(token: string): Promise<DiscordGuild[]> {
  const dockerRunning = await isDockerRunning();
  if (!dockerRunning) {
    throw new Error('Docker is not running. Please start Docker first.');
  }

  await pullImageIfNeeded(EXPORTER_IMAGE);

  const result = await runContainer({
    image: EXPORTER_IMAGE,
    command: ['guilds', '-t', token],
    autoRemove: true,
  });

  if (result.exitCode !== 0) {
    throw new Error(`Failed to list guilds: ${result.stderr || result.stdout}`);
  }

  // Parse the output - format is "ID | Name"
  const lines = result.stdout.split('\n').filter((line) => line.includes('|'));
  const guilds: DiscordGuild[] = [];

  for (const line of lines) {
    const [id, ...nameParts] = line.split('|').map((s) => s.trim());
    if (id && nameParts.length > 0) {
      guilds.push({
        id,
        name: nameParts.join('|').trim(),
        iconUrl: null,
      });
    }
  }

  return guilds;
}

export async function listChannels(token: string, guildId: string): Promise<DiscordChannel[]> {
  const dockerRunning = await isDockerRunning();
  if (!dockerRunning) {
    throw new Error('Docker is not running. Please start Docker first.');
  }

  await pullImageIfNeeded(EXPORTER_IMAGE);

  const result = await runContainer({
    image: EXPORTER_IMAGE,
    command: ['channels', '-g', guildId, '-t', token],
    autoRemove: true,
  });

  if (result.exitCode !== 0) {
    throw new Error(`Failed to list channels: ${result.stderr || result.stdout}`);
  }

  // Parse the output - format is "ID | Name (Category) [Type]"
  const lines = result.stdout.split('\n').filter((line) => line.includes('|'));
  const channels: DiscordChannel[] = [];

  for (const line of lines) {
    const match = line.match(/^\s*(\d+)\s*\|\s*(.+?)\s*(?:\((.+?)\))?\s*(?:\[(.+?)\])?\s*$/);
    if (match) {
      const [, id, name, category, type] = match;
      channels.push({
        id,
        name: name.trim(),
        category: category?.trim() || null,
        categoryId: null,
        type: type?.trim() || 'GuildTextChat',
        topic: null,
      });
    }
  }

  return channels;
}
