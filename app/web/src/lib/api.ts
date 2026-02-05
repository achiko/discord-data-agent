const API_BASE = '/api';

export interface SearchResult {
  messageId: string;
  channelId: string;
  channelName: string;
  guildId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
  score: number;
}

export const getDiscordMessageUrl = (guildId: string, channelId: string, messageId: string) =>
  `https://discord.com/channels/${guildId}/${channelId}/${messageId}`

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
}

export interface CompareSearchResponse {
  results: {
    keyword: SearchResult[];
    semantic: SearchResult[];
    hybrid: SearchResult[];
  };
  query: string;
}

export interface Channel {
  id: string;
  name: string;
  type: string;
  topic: string | null;
  category: string | null;
  guildId: string;
  guildName: string;
  messageCount: number;
}

export interface Guild {
  id: string;
  name: string;
  iconUrl: string | null;
  channelCount: number;
  messageCount: number;
}

export interface AnalyticsOverview {
  totals: {
    messages: number;
    users: number;
    channels: number;
    guilds: number;
    embeddings: number;
  };
  dateRange: {
    first: string | null;
    last: string | null;
  };
  topChannels: Array<{
    channelId: string;
    channelName: string;
    guildName: string;
    messageCount: number;
  }>;
  topUsers: Array<{
    userId: string;
    username: string;
    messageCount: number;
  }>;
}

export interface Message {
  id: string;
  content: string;
  timestamp: string;
  editedTimestamp: string | null;
  type: string;
  isPinned: boolean;
  attachmentsJson: unknown;
  embedsJson: unknown;
  reactionsJson: unknown;
  channelId: string;
  channelName: string;
  guildId: string;
  userId: string;
  username: string;
  userAvatar: string | null;
  isBot: boolean;
}

export interface MessageWithContext {
  message: Message;
  context: {
    before: Array<{
      id: string;
      content: string;
      timestamp: string;
      userId: string;
      username: string;
    }>;
    after: Array<{
      id: string;
      content: string;
      timestamp: string;
      userId: string;
      username: string;
    }>;
  };
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  search: (params: {
    q: string;
    channel?: string;
    user?: string;
    from?: string;
    to?: string;
    type?: 'semantic' | 'keyword' | 'hybrid';
    limit?: number;
  }): Promise<SearchResponse> => {
    const searchParams = new URLSearchParams();
    searchParams.set('q', params.q);
    if (params.channel) searchParams.set('channel', params.channel);
    if (params.user) searchParams.set('user', params.user);
    if (params.from) searchParams.set('from', params.from);
    if (params.to) searchParams.set('to', params.to);
    if (params.type) searchParams.set('type', params.type);
    if (params.limit) searchParams.set('limit', params.limit.toString());

    return fetchApi(`/search?${searchParams.toString()}`);
  },

  compareSearch: (params: {
    q: string;
    channel?: string;
    user?: string;
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<CompareSearchResponse> => {
    const searchParams = new URLSearchParams();
    searchParams.set('q', params.q);
    if (params.channel) searchParams.set('channel', params.channel);
    if (params.user) searchParams.set('user', params.user);
    if (params.from) searchParams.set('from', params.from);
    if (params.to) searchParams.set('to', params.to);
    if (params.limit) searchParams.set('limit', params.limit.toString());

    return fetchApi(`/search/compare?${searchParams.toString()}`);
  },

  getChannels: (): Promise<{ channels: Channel[] }> => {
    return fetchApi('/channels');
  },

  getChannel: (id: string): Promise<Channel & { stats: { messageCount: number; firstMessage: string; lastMessage: string } }> => {
    return fetchApi(`/channels/${id}`);
  },

  getGuilds: (): Promise<{ guilds: Guild[] }> => {
    return fetchApi('/guilds');
  },

  getAnalyticsOverview: (): Promise<AnalyticsOverview> => {
    return fetchApi('/analytics/overview');
  },

  getMessagesPerDay: (days?: number, channel?: string): Promise<{ data: Array<{ date: string; count: number }> }> => {
    const params = new URLSearchParams();
    if (days) params.set('days', days.toString());
    if (channel) params.set('channel', channel);
    return fetchApi(`/analytics/messages-per-day?${params.toString()}`);
  },

  getMessage: (id: string, context?: number): Promise<MessageWithContext> => {
    const params = context ? `?context=${context}` : '';
    return fetchApi(`/messages/${id}${params}`);
  },

  getChannelMessages: (channelId: string, options?: { limit?: number; before?: string; after?: string }): Promise<{ messages: Message[]; hasMore: boolean }> => {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.before) params.set('before', options.before);
    if (options?.after) params.set('after', options.after);
    return fetchApi(`/channels/${channelId}/messages?${params.toString()}`);
  },
};
