import 'dotenv/config';
import { app } from './app.js';
import { config } from './config.js';
import { pool } from './db.js';

if (!config.jwtSecret || config.jwtSecret === 'replace-with-a-long-random-secret') {
  console.warn('Warning: set JWT_SECRET in backend/.env before using authentication.');
}

const server = app.listen(config.port, () => {
  console.log(`RakshaSetu API listening on http://127.0.0.1:${config.port}`);
});

async function shutdown() {
  server.close();
  await pool.end();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
