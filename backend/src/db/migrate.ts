import 'dotenv/config';
import { db } from './client';

async function migrate() {
  console.log('Running migrations...');
  await db.migrate.latest();
  console.log('Migrations complete.');
  await db.destroy();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
