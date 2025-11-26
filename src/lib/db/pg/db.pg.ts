import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema.pg';

const connectionString = process.env.POSTGRES_URL || process.env.POSTGRESQL_URL;

if (!connectionString) {
  throw new Error('POSTGRES_URL or POSTGRESQL_URL is not set');
}

const isSslDisabled = process.env.PGSSLMODE === 'disable';
const enforceCertificate = process.env.PGSSL_ENFORCE_CERT === '1';

const pool = new Pool({
  connectionString,
  ssl: isSslDisabled
    ? false
    : {
        rejectUnauthorized: enforceCertificate,
      },
});

export const pgDb = drizzle(pool, { schema });

export default pgDb;
