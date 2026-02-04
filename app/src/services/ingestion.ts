import type { DiscordExport } from '../types/index.js';
import { db } from '../db/client.js';
import { guilds, channels, users, messages } from '../db/schema.js';
// drizzle-orm import for db operations
import { logger } from '../utils/logger.js';

export interface IngestionResult {
  messagesIngested: number;
  usersIngested: number;
  skippedDuplicates: number;
}

export async function ingestMessages(exportData: DiscordExport): Promise<IngestionResult> {
  const { guild, channel, messages: exportMessages } = exportData;

  let usersIngested = 0;
  let messagesIngested = 0;
  let skippedDuplicates = 0;

  // Upsert guild
  await db
    .insert(guilds)
    .values({
      id: guild.id,
      name: guild.name,
      iconUrl: guild.iconUrl,
    })
    .onConflictDoUpdate({
      target: guilds.id,
      set: {
        name: guild.name,
        iconUrl: guild.iconUrl,
      },
    });

  // Upsert channel
  await db
    .insert(channels)
    .values({
      id: channel.id,
      guildId: guild.id,
      name: channel.name,
      type: channel.type,
      topic: channel.topic,
      categoryId: channel.categoryId,
      category: channel.category,
    })
    .onConflictDoUpdate({
      target: channels.id,
      set: {
        name: channel.name,
        type: channel.type,
        topic: channel.topic,
        categoryId: channel.categoryId,
        category: channel.category,
      },
    });

  // Collect unique users
  const uniqueUsers = new Map<string, (typeof exportMessages)[0]['author']>();
  for (const message of exportMessages) {
    uniqueUsers.set(message.author.id, message.author);
    for (const mention of message.mentions) {
      uniqueUsers.set(mention.id, mention);
    }
  }

  // Upsert users
  for (const user of uniqueUsers.values()) {
    await db
      .insert(users)
      .values({
        id: user.id,
        username: user.name,
        discriminator: user.discriminator,
        avatarUrl: user.avatarUrl,
        isBot: user.isBot,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          username: user.name,
          discriminator: user.discriminator,
          avatarUrl: user.avatarUrl,
          isBot: user.isBot,
        },
      });

    usersIngested++;
  }

  // Insert messages in batches
  const batchSize = 500;
  for (let i = 0; i < exportMessages.length; i += batchSize) {
    const batch = exportMessages.slice(i, i + batchSize);

    for (const message of batch) {
      try {
        await db
          .insert(messages)
          .values({
            id: message.id,
            channelId: channel.id,
            userId: message.author.id,
            content: message.content,
            timestamp: new Date(message.timestamp),
            editedTimestamp: message.timestampEdited ? new Date(message.timestampEdited) : null,
            type: message.type,
            isPinned: message.isPinned,
            referenceId: message.reference?.messageId || null,
            attachmentsJson: message.attachments.length > 0 ? JSON.stringify(message.attachments) : null,
            embedsJson: message.embeds.length > 0 ? JSON.stringify(message.embeds) : null,
            reactionsJson: message.reactions.length > 0 ? JSON.stringify(message.reactions) : null,
          })
          .onConflictDoNothing();

        messagesIngested++;
      } catch (error) {
        // Skip duplicates
        skippedDuplicates++;
        logger.debug(`Skipped duplicate message: ${message.id}`);
      }
    }
  }

  return {
    messagesIngested,
    usersIngested,
    skippedDuplicates,
  };
}
