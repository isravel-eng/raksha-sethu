import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.join(__dirname, 'db', 'schema.sql');

/**
 * Apply the idempotent PostgreSQL schema at service startup.
 * This keeps the prototype deployable on Render without requiring a separate
 * shell command after provisioning the database. It does not seed or truncate
 * application data.
 */
export async function initializeDatabase() {
  const schema = await fs.readFile(schemaPath, 'utf8');
  const client = await pool.connect();
  try {
    await client.query(schema);
  } finally {
    client.release();
  }
}

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
