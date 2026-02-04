import { FastifyInstance } from 'fastify';
import { db } from '../../db/client.js';
import { messages, users, channels } from '../../db/schema.js';
import { eq, and, desc, asc, lt, gt } from 'drizzle-orm';

export async function messagesRoutes(fastify: FastifyInstance) {
  // Get message by ID with context
  fastify.get<{
    Params: { id: string };
    Querystring: { context?: string };
  }>('/messages/:id', async (request, reply) => {
    const { id } = request.params;
    const contextSize = parseInt(request.query.context || '5', 10);

    try {
      // Get the message
      const [message] = await db
        .select({
          id: messages.id,
          content: messages.content,
          timestamp: messages.timestamp,
          editedTimestamp: messages.editedTimestamp,
          type: messages.type,
          isPinned: messages.isPinned,
          attachmentsJson: messages.attachmentsJson,
          embedsJson: messages.embedsJson,
          reactionsJson: messages.reactionsJson,
          channelId: messages.channelId,
          channelName: channels.name,
          userId: messages.userId,
          username: users.username,
          userAvatar: users.avatarUrl,
          isBot: users.isBot,
        })
        .from(messages)
        .leftJoin(users, eq(messages.userId, users.id))
        .leftJoin(channels, eq(messages.channelId, channels.id))
        .where(eq(messages.id, id));

      if (!message) {
        return reply.code(404).send({ error: 'Message not found' });
      }

      // Get context messages (before)
      const beforeMessages = await db
        .select({
          id: messages.id,
          content: messages.content,
          timestamp: messages.timestamp,
          userId: messages.userId,
          username: users.username,
        })
        .from(messages)
        .leftJoin(users, eq(messages.userId, users.id))
        .where(
          and(
            eq(messages.channelId, message.channelId),
            lt(messages.timestamp, message.timestamp)
          )
        )
        .orderBy(desc(messages.timestamp))
        .limit(contextSize);

      // Get context messages (after)
      const afterMessages = await db
        .select({
          id: messages.id,
          content: messages.content,
          timestamp: messages.timestamp,
          userId: messages.userId,
          username: users.username,
        })
        .from(messages)
        .leftJoin(users, eq(messages.userId, users.id))
        .where(
          and(
            eq(messages.channelId, message.channelId),
            gt(messages.timestamp, message.timestamp)
          )
        )
        .orderBy(asc(messages.timestamp))
        .limit(contextSize);

      return {
        message,
        context: {
          before: beforeMessages.reverse(),
          after: afterMessages,
        },
      };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch message' });
    }
  });

  // Get messages in a channel with pagination
  fastify.get<{
    Params: { channelId: string };
    Querystring: { limit?: string; before?: string; after?: string };
  }>('/channels/:channelId/messages', async (request, reply) => {
    const { channelId } = request.params;
    const { limit = '50', before, after } = request.query;

    try {
      // Build conditions
      const conditions = [eq(messages.channelId, channelId)];
      if (before) {
        conditions.push(lt(messages.id, before));
      }
      if (after) {
        conditions.push(gt(messages.id, after));
      }

      const result = await db
        .select({
          id: messages.id,
          content: messages.content,
          timestamp: messages.timestamp,
          editedTimestamp: messages.editedTimestamp,
          type: messages.type,
          isPinned: messages.isPinned,
          attachmentsJson: messages.attachmentsJson,
          userId: messages.userId,
          username: users.username,
          userAvatar: users.avatarUrl,
          isBot: users.isBot,
        })
        .from(messages)
        .leftJoin(users, eq(messages.userId, users.id))
        .where(and(...conditions))
        .orderBy(desc(messages.timestamp))
        .limit(parseInt(limit, 10));

      return {
        messages: result,
        hasMore: result.length === parseInt(limit, 10),
      };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch messages' });
    }
  });
}
