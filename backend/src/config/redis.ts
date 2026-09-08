import { createClient } from 'redis';
import { env } from './env';
import logger from '../utils/logger';

const redisClient = createClient({
  url: env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 3) return false; // stop retrying after 3 attempts
      return Math.min(retries * 500, 2000);
    },
  },
});

redisClient.on('error', (err) => {
  // Only log once, not every retry
  if (!redisClient.isOpen) {
    logger.warn('Redis unavailable — running without cache');
  }
});

redisClient.on('connect', () => {
  logger.info('Redis connected');
});

export async function connectRedis(): Promise<void> {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch {
    // Redis is optional in development
    logger.warn('Redis connection failed — running without cache');
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient.isOpen) {
    await redisClient.disconnect();
  }
}

export default redisClient;
