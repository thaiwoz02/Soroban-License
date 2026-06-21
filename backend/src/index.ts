import 'dotenv/config';
import { createApp } from './app';
import { logger } from './lib/logger';
import { db } from './db/client';
import { redis } from './lib/redis';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

async function main() {
  // Verify DB and Redis connectivity
  await db.raw('SELECT 1');
  logger.info('Database connected');

  await redis.ping();
  logger.info('Redis connected');

  const app = createApp();

  app.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV }, 'Soroban License API started');
  });
}

main().catch((err) => {
  logger.error(err, 'Fatal startup error');
  process.exit(1);
});
