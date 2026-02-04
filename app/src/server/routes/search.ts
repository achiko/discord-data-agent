import { FastifyInstance } from 'fastify';
import { searchMessages } from '../../services/search.js';
import type { SearchOptions } from '../../types/index.js';

interface SearchQuery {
  q: string;
  channel?: string;
  user?: string;
  from?: string;
  to?: string;
  type?: 'semantic' | 'keyword' | 'hybrid';
  limit?: string;
  offset?: string;
}

export async function searchRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: SearchQuery }>('/search', async (request, reply) => {
    const { q, channel, user, from, to, type = 'hybrid', limit = '20', offset = '0' } = request.query;

    if (!q) {
      return reply.code(400).send({ error: 'Query parameter "q" is required' });
    }

    const options: SearchOptions = {
      query: q,
      channelId: channel,
      userId: user,
      fromDate: from ? new Date(from) : undefined,
      toDate: to ? new Date(to) : undefined,
      searchType: type,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    };

    try {
      const results = await searchMessages(options);
      return {
        results,
        total: results.length,
        query: q,
        filters: {
          channel,
          user,
          from,
          to,
          type,
        },
      };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Search failed' });
    }
  });
}
