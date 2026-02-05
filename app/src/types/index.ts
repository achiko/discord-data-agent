import { z } from 'zod';

// Configuration schema
export const ConfigSchema = z.object({
  discord: z.object({
    token: z.string().min(1, 'Discord token is required'),
  }),
  database: z.object({
    url: z.string().url('Invalid database URL'),
  }),
  openai: z.object({
    apiKey: z.string().optional(),
  }),
  server: z.object({
    apiPort: z.number().int().positive().default(3001),
    webPort: z.number().int().positive().default(3000),
  }),
  exports: z.object({
    dir: z.string().default('./exports'),
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

// Discord types from DiscordChatExporter JSON format
export interface DiscordGuild {
  id: string;
  name: string;
  iconUrl: string | null;
}

export interface DiscordChannel {
  id: string;
  type: string;
  categoryId: string | null;
  category: string | null;
  name: string;
  topic: string | null;
}

export interface DiscordUser {
  id: string;
  name: string;
  discriminator: string;
  nickname: string | null;
  color: string | null;
  isBot: boolean;
  avatarUrl: string | null;
}

export interface DiscordAttachment {
  id: string;
  url: string;
  fileName: string;
  fileSizeBytes: number;
}

export interface DiscordEmbed {
  title: string | null;
  url: string | null;
  timestamp: string | null;
  description: string | null;
  color: string | null;
}

export interface DiscordReaction {
  emoji: {
    id: string | null;
    name: string;
    isAnimated: boolean;
    imageUrl: string;
  };
  count: number;
}

export interface DiscordMessageReference {
  messageId: string | null;
  channelId: string | null;
  guildId: string | null;
}

export interface DiscordMessage {
  id: string;
  type: string;
  timestamp: string;
  timestampEdited: string | null;
  callEndedTimestamp: string | null;
  isPinned: boolean;
  content: string;
  author: DiscordUser;
  attachments: DiscordAttachment[];
  embeds: DiscordEmbed[];
  reactions: DiscordReaction[];
  mentions: DiscordUser[];
  reference: DiscordMessageReference | null;
}

export interface DiscordExport {
  guild: DiscordGuild;
  channel: DiscordChannel;
  dateRange: {
    after: string | null;
    before: string | null;
  };
  messages: DiscordMessage[];
  messageCount: number;
}

// Search types
export interface SearchOptions {
  query: string;
  channelId?: string;
  userId?: string;
  fromDate?: Date;
  toDate?: Date;
  hasAttachments?: boolean;
  limit?: number;
  offset?: number;
  searchType?: 'semantic' | 'keyword' | 'hybrid';
}

export interface SearchResult {
  messageId: string;
  channelId: string;
  channelName: string;
  guildId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  score: number;
  highlightedContent?: string;
}

// Export options
export interface ExportOptions {
  channelId?: string;
  guildId?: string;
  since?: Date | string;
  before?: Date;
  format?: 'json' | 'html' | 'csv';
  includeThreads?: boolean;
}

// Analytics types
export interface ChannelStats {
  channelId: string;
  channelName: string;
  messageCount: number;
  userCount: number;
  firstMessage: Date;
  lastMessage: Date;
}

export interface UserStats {
  userId: string;
  username: string;
  messageCount: number;
  channelsActive: number;
  firstMessage: Date;
  lastMessage: Date;
}

export interface OverviewStats {
  totalMessages: number;
  totalUsers: number;
  totalChannels: number;
  totalGuilds: number;
  dateRange: {
    first: Date;
    last: Date;
  };
  topChannels: ChannelStats[];
  topUsers: UserStats[];
}
