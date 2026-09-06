import 'dotenv/config';
import { app } from './app.js';
import { config } from './config.js';
import { initializeDatabase, pool } from './db.js';

if (!config.jwtSecret || config.jwtSecret === 'replace-with-a-long-random-secret') {
  console.warn('Warning: set JWT_SECRET in backend/.env before using authentication.');
}

try {
  await initializeDatabase();
  console.log('RakshaSetu PostgreSQL schema is ready.');
} catch (error) {
  console.error('Database initialization failed:', error);
  process.exit(1);
}

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`RakshaSetu API listening on port ${config.port}`);
});

async function shutdown() {
  server.close();
  await pool.end();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
