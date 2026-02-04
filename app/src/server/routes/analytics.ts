import { FastifyInstance } from 'fastify';
import { db } from '../../db/client.js';
import { messages, users, channels, guilds } from '../../db/schema.js';
import { sql, desc, eq } from 'drizzle-orm';

export async function analyticsRoutes(fastify: FastifyInstance) {
  // Overview statistics
  fastify.get('/analytics/overview', async (request, reply) => {
    try {
      // Total counts
      const [totals] = await db
        .select({
          totalMessages: sql<number>`(SELECT COUNT(*) FROM messages)`,
          totalUsers: sql<number>`(SELECT COUNT(*) FROM users)`,
          totalChannels: sql<number>`(SELECT COUNT(*) FROM channels)`,
          totalGuilds: sql<number>`(SELECT COUNT(*) FROM guilds)`,
          totalEmbeddings: sql<number>`(SELECT COUNT(DISTINCT message_id) FROM message_embeddings)`,
        })
        .from(sql`(SELECT 1) as dummy`);

      // Date range
      const [dateRange] = await db
        .select({
          firstMessage: sql<Date>`min(timestamp)`,
          lastMessage: sql<Date>`max(timestamp)`,
        })
        .from(messages);

      // Top channels by message count
      const topChannels = await db
        .select({
          channelId: channels.id,
          channelName: channels.name,
          guildName: guilds.name,
          messageCount: sql<number>`count(${messages.id})`,
        })
        .from(messages)
        .innerJoin(channels, eq(messages.channelId, channels.id))
        .innerJoin(guilds, eq(channels.guildId, guilds.id))
        .groupBy(channels.id, channels.name, guilds.name)
        .orderBy(desc(sql`count(${messages.id})`))
        .limit(10);

      // Top users by message count
      const topUsers = await db
        .select({
          userId: users.id,
          username: users.username,
          messageCount: sql<number>`count(${messages.id})`,
        })
        .from(messages)
        .innerJoin(users, eq(messages.userId, users.id))
        .where(eq(users.isBot, false))
        .groupBy(users.id, users.username)
        .orderBy(desc(sql`count(${messages.id})`))
        .limit(10);

      return {
        totals: {
          messages: Number(totals?.totalMessages || 0),
          users: Number(totals?.totalUsers || 0),
          channels: Number(totals?.totalChannels || 0),
          guilds: Number(totals?.totalGuilds || 0),
          embeddings: Number(totals?.totalEmbeddings || 0),
        },
        dateRange: {
          first: dateRange?.firstMessage,
          last: dateRange?.lastMessage,
        },
        topChannels: topChannels.map((c) => ({
          ...c,
          messageCount: Number(c.messageCount),
        })),
        topUsers: topUsers.map((u) => ({
          ...u,
          messageCount: Number(u.messageCount),
        })),
      };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch analytics' });
    }
  });

  // Messages per day
  fastify.get<{
    Querystring: { days?: string; channel?: string };
  }>('/analytics/messages-per-day', async (request, reply) => {
    const { days = '30', channel } = request.query;

    try {
      const baseCondition = sql`${messages.timestamp} >= NOW() - INTERVAL '${sql.raw(days)} days'`;
      const channelCondition = channel ? eq(messages.channelId, channel) : undefined;

      const result = await db
        .select({
          date: sql<string>`date_trunc('day', ${messages.timestamp})::date`,
          count: sql<number>`count(*)`,
        })
        .from(messages)
        .where(channelCondition ? sql`${baseCondition} AND ${channelCondition}` : baseCondition)
        .groupBy(sql`date_trunc('day', ${messages.timestamp})`)
        .orderBy(sql`date_trunc('day', ${messages.timestamp})`);

      return {
        data: result.map((r) => ({
          date: r.date,
          count: Number(r.count),
        })),
      };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch message stats' });
    }
  });

  // User activity
  fastify.get<{
    Querystring: { userId: string };
  }>('/analytics/user/:userId', async (request, reply) => {
    const userId = (request.params as { userId: string }).userId;

    try {
      // User info
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Message stats
      const [stats] = await db
        .select({
          messageCount: sql<number>`count(*)`,
          firstMessage: sql<Date>`min(timestamp)`,
          lastMessage: sql<Date>`max(timestamp)`,
        })
        .from(messages)
        .where(eq(messages.userId, userId));

      // Activity by channel
      const channelActivity = await db
        .select({
          channelId: channels.id,
          channelName: channels.name,
          messageCount: sql<number>`count(${messages.id})`,
        })
        .from(messages)
        .innerJoin(channels, eq(messages.channelId, channels.id))
        .where(eq(messages.userId, userId))
        .groupBy(channels.id, channels.name)
        .orderBy(desc(sql`count(${messages.id})`))
        .limit(10);

      return {
        user,
        stats: {
          messageCount: Number(stats?.messageCount || 0),
          firstMessage: stats?.firstMessage,
          lastMessage: stats?.lastMessage,
        },
        channelActivity: channelActivity.map((c) => ({
          ...c,
          messageCount: Number(c.messageCount),
        })),
      };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch user analytics' });
    }
  });
}
