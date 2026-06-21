import 'dotenv/config';
import { logger } from './logger';
import { LicenseEventIndexer } from './indexer';

async function main() {
  logger.info('Starting Soroban License indexer...');
  const indexer = new LicenseEventIndexer();
  await indexer.start();
}

main().catch((err) => {
  logger.error(err, 'Indexer fatal error');
  process.exit(1);
});
