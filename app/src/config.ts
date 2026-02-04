import { config as dotenvConfig } from 'dotenv';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import YAML from 'yaml';
import { z } from 'zod';
import type { Config } from './types/index.js';

// Load .env file
dotenvConfig();

const CONFIG_DIR = join(homedir(), '.discord-analyzer');
const CONFIG_FILE = join(CONFIG_DIR, 'config.yaml');

// Partial config schema for file-based config (all optional)
const FileConfigSchema = z.object({
  discord: z.object({
    token: z.string().optional(),
  }).optional(),
  database: z.object({
    url: z.string().optional(),
  }).optional(),
  openai: z.object({
    apiKey: z.string().optional(),
  }).optional(),
  server: z.object({
    apiPort: z.number().optional(),
    webPort: z.number().optional(),
  }).optional(),
  exports: z.object({
    dir: z.string().optional(),
  }).optional(),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  }).optional(),
});

type FileConfig = z.infer<typeof FileConfigSchema>;

function loadFileConfig(): FileConfig {
  if (!existsSync(CONFIG_FILE)) {
    return {};
  }

  try {
    const content = readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = YAML.parse(content);
    return FileConfigSchema.parse(parsed);
  } catch (error) {
    console.warn(`Warning: Could not parse config file at ${CONFIG_FILE}`);
    return {};
  }
}

function mergeConfigs(fileConfig: FileConfig): Config {
  // Environment variables take precedence over file config
  const merged = {
    discord: {
      token: process.env.DISCORD_TOKEN || fileConfig.discord?.token || '',
    },
    database: {
      url: process.env.DATABASE_URL ||
           fileConfig.database?.url ||
           'postgresql://discord_analyzer:discord_analyzer@localhost:5432/discord_analyzer',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || fileConfig.openai?.apiKey,
    },
    server: {
      apiPort: parseInt(process.env.API_PORT || '') || fileConfig.server?.apiPort || 3001,
      webPort: parseInt(process.env.WEB_PORT || '') || fileConfig.server?.webPort || 3000,
    },
    exports: {
      dir: process.env.EXPORTS_DIR || fileConfig.exports?.dir || './exports',
    },
    logging: {
      level: (process.env.LOG_LEVEL as Config['logging']['level']) ||
             fileConfig.logging?.level ||
             'info',
    },
  };

  return merged;
}

export function getConfig(): Config {
  const fileConfig = loadFileConfig();
  return mergeConfigs(fileConfig);
}

export function validateConfig(config: Config, requireDiscord = true): void {
  if (requireDiscord && !config.discord.token) {
    throw new Error(
      'Discord token is required. Set DISCORD_TOKEN environment variable or add to config file.'
    );
  }
}

export function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function saveConfig(config: Partial<FileConfig>): void {
  ensureConfigDir();

  const existingConfig = loadFileConfig();
  const merged = {
    ...existingConfig,
    ...config,
    discord: { ...existingConfig.discord, ...config.discord },
    database: { ...existingConfig.database, ...config.database },
    openai: { ...existingConfig.openai, ...config.openai },
    server: { ...existingConfig.server, ...config.server },
    exports: { ...existingConfig.exports, ...config.exports },
    logging: { ...existingConfig.logging, ...config.logging },
  };

  writeFileSync(CONFIG_FILE, YAML.stringify(merged), 'utf-8');
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export { CONFIG_DIR, CONFIG_FILE };
