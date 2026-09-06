import 'dotenv/config';
import pg from 'pg';
import { seed } from './seed.js';

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const url = new URL(databaseUrl);
const dbName = url.pathname.replace(/^\//, '') || 'raksha_setu';
const adminUrl = new URL(databaseUrl);
adminUrl.pathname = '/postgres';

function quoteIdent(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Unsafe database name: ${name}`);
  }
  return `"${name}"`;
}

async function main() {
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    const found = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (!found.rowCount) {
      await admin.query(`CREATE DATABASE ${quoteIdent(dbName)}`);
      console.log(`Created database ${dbName}`);
    }
  } finally {
    await admin.end();
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const demo = await seed(client);
    console.log('Schema applied and demo data seeded.');
    console.log(`Demo citizen login: ${demo.email} / ${demo.password}`);
    console.log(`citizen_id=${demo.citizenId} case_id=${demo.caseId}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
