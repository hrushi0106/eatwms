import app from './app';
import { env } from './config/env';
import logger from './utils/logger';
import db from './config/database';
import { connectRedis } from './config/redis';
import { startScheduledJobs } from './services/scheduler';

async function bootstrap(): Promise<void> {
  try {
    // Test DB connection
    await db.raw('SELECT 1');
    logger.info('Database connected');

    // Connect Redis (optional — degrade gracefully if not available in dev)
    try {
      await connectRedis();
    } catch (err) {
      logger.warn({ err }, 'Redis connection failed — running without cache');
    }

    // Start scheduled jobs
    if (!env.isTest()) {
      startScheduledJobs();
      logger.info('Scheduled jobs started');
    }

    // Start server
    const server = app.listen(env.PORT, () => {
      logger.info(`Server started on port ${env.PORT} [${env.NODE_ENV}]`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down gracefully`);
      server.close(async () => {
        await db.destroy();
        logger.info('Database connections closed');
        process.exit(0);
      });

      // Force exit after 30s
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();
