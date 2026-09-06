import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';

const port = Number(process.env.PGPORT || 5432);
const databaseDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../data/pg');

const postgres = new EmbeddedPostgres({
  databaseDir,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  port,
  persistent: true,
});

await postgres.initialise();
await postgres.start();

try {
  await postgres.createDatabase('raksha_setu');
} catch (error) {
  const message = String(error.message || error);
  if (!/already exists/i.test(message)) {
    throw error;
  }
}

console.log(`Embedded PostgreSQL listening on 127.0.0.1:${port} (database raksha_setu)`);
console.log('Keep this process running. Press Ctrl+C to stop.');

const stop = async () => {
  await postgres.stop();
  process.exit(0);
};

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
