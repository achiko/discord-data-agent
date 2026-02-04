import { readFileSync } from 'fs';
import type { DiscordExport } from '../types/index.js';

export async function parseExportFile(filePath: string): Promise<DiscordExport> {
  const content = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  // Validate the basic structure
  if (!data.guild || !data.channel || !Array.isArray(data.messages)) {
    throw new Error(`Invalid export file format: ${filePath}`);
  }

  return data as DiscordExport;
}

export function getExportStats(data: DiscordExport): {
  messageCount: number;
  uniqueUsers: number;
  dateRange: { start: Date | null; end: Date | null };
  attachmentCount: number;
} {
  const userIds = new Set<string>();
  let attachmentCount = 0;
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  for (const message of data.messages) {
    userIds.add(message.author.id);
    attachmentCount += message.attachments.length;

    const timestamp = new Date(message.timestamp);
    if (!startDate || timestamp < startDate) {
      startDate = timestamp;
    }
    if (!endDate || timestamp > endDate) {
      endDate = timestamp;
    }
  }

  return {
    messageCount: data.messages.length,
    uniqueUsers: userIds.size,
    dateRange: { start: startDate, end: endDate },
    attachmentCount,
  };
}
