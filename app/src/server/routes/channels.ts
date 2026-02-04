import { FastifyInstance } from 'fastify';
import { db } from '../../db/client.js';
import { channels, guilds, messages } from '../../db/schema.js';
import { eq, sql } from 'drizzle-orm';

export async function channelsRoutes(fastify: FastifyInstance) {
  // Get all channels
  fastify.get('/channels', async (request, reply) => {
    try {
      const result = await db
        .select({
          id: channels.id,
          name: channels.name,
          type: channels.type,
          topic: channels.topic,
          category: channels.category,
          guildId: channels.guildId,
          guildName: guilds.name,
          messageCount: sql<number>`(
            SELECT COUNT(*) FROM messages WHERE messages.channel_id = ${channels.id}
          )`,
        })
        .from(channels)
        .leftJoin(guilds, eq(channels.guildId, guilds.id))
        .orderBy(guilds.name, channels.category, channels.name);

      return { channels: result };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch channels' });
    }
  });

  // Get channel by ID
  fastify.get<{ Params: { id: string } }>('/channels/:id', async (request, reply) => {
    const { id } = request.params;

    try {
      const [channel] = await db
        .select({
          id: channels.id,
          name: channels.name,
          type: channels.type,
          topic: channels.topic,
          category: channels.category,
          guildId: channels.guildId,
          guildName: guilds.name,
        })
        .from(channels)
        .leftJoin(guilds, eq(channels.guildId, guilds.id))
        .where(eq(channels.id, id));

      if (!channel) {
        return reply.code(404).send({ error: 'Channel not found' });
      }

      // Get message stats
      const [stats] = await db
        .select({
          messageCount: sql<number>`count(*)`,
          firstMessage: sql<Date>`min(timestamp)`,
          lastMessage: sql<Date>`max(timestamp)`,
        })
        .from(messages)
        .where(eq(messages.channelId, id));

      return {
        ...channel,
        stats: {
          messageCount: Number(stats?.messageCount || 0),
          firstMessage: stats?.firstMessage,
          lastMessage: stats?.lastMessage,
        },
      };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch channel' });
    }
  });

  // Get all guilds
  fastify.get('/guilds', async (request, reply) => {
    try {
      const result = await db
        .select({
          id: guilds.id,
          name: guilds.name,
          iconUrl: guilds.iconUrl,
          channelCount: sql<number>`(
            SELECT COUNT(*) FROM channels WHERE channels.guild_id = ${guilds.id}
          )`,
          messageCount: sql<number>`(
            SELECT COUNT(*) FROM messages
            WHERE messages.channel_id IN (
              SELECT id FROM channels WHERE channels.guild_id = ${guilds.id}
            )
          )`,
        })
        .from(guilds)
        .orderBy(guilds.name);

      return { guilds: result };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch guilds' });
    }
  });
}
