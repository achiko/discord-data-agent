import Fastify from 'fastify';
import cors from '@fastify/cors';
import { getConfig } from '../config.js';
import { logger } from '../utils/logger.js';

// Import routes
import { searchRoutes } from './routes/search.js';
import { channelsRoutes } from './routes/channels.js';
import { analyticsRoutes } from './routes/analytics.js';
import { messagesRoutes } from './routes/messages.js';

const fastify = Fastify({
  logger: {
    level: getConfig().logging.level,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  },
});

async function start() {
  const config = getConfig();

  // Register CORS
  await fastify.register(cors, {
    origin: [`http://localhost:${config.server.webPort}`],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register routes
  await fastify.register(searchRoutes, { prefix: '/api' });
  await fastify.register(channelsRoutes, { prefix: '/api' });
  await fastify.register(analyticsRoutes, { prefix: '/api' });
  await fastify.register(messagesRoutes, { prefix: '/api' });

  // Start server
  try {
    await fastify.listen({ port: config.server.apiPort, host: '0.0.0.0' });
    logger.info(`API server running on http://localhost:${config.server.apiPort}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();

export { fastify };
