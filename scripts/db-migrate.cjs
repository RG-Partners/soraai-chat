'use strict';

require('dotenv/config');

const { migrate } = require('drizzle-orm/node-postgres/migrator');
const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const path = require('path');

function createPool() {
  const connectionString = process.env.POSTGRES_URL || process.env.POSTGRESQL_URL;

  if (!connectionString) {
    throw new Error('POSTGRES_URL or POSTGRESQL_URL is not set');
  }

  const isSslDisabled = process.env.PGSSLMODE === 'disable';
  const enforceCertificate = process.env.PGSSL_ENFORCE_CERT === '1';

  return new Pool({
    connectionString,
    ssl: isSslDisabled
      ? false
      : {
          rejectUnauthorized: enforceCertificate,
        },
  });
}

async function main() {
  const pool = createPool();
  const db = drizzle(pool);

  console.log('⏳ Running PostgreSQL migrations...');

  const start = Date.now();

  try {
    await migrate(db, {
      migrationsFolder: path.join(process.cwd(), 'src/lib/db/migrations/pg'),
    });
  } catch (err) {
    console.error('❌ PostgreSQL migrations failed. Ensure the database is reachable.', err);
    throw err;
  } finally {
    await pool.end();
  }

  const end = Date.now();
  console.log('✅ PostgreSQL migrations completed in', end - start, 'ms');
}

main()
  .then(() => {
    console.info('🚀 DB migration completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    console.warn(
      [
        '🚨 Migration failed due to incompatible schema.',
        '',
        '❗️DB migration failed – incompatible schema detected.',
        'This switch introduces a new PostgreSQL schema.',
        'If this database already has the old SQLite tables, drop or rename them and run:',
        'pnpm db:migrate',
        '',
        'Need help? Please open an issue on GitHub.',
      ].join('\n'),
    );
    process.exit(1);
  });
