import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

const connectionString = process.env.POSTGRES_URL || process.env.POSTGRESQL_URL;

if (!connectionString) {
  throw new Error('POSTGRES_URL or POSTGRESQL_URL is not set');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/pg/schema.pg.ts',
  out: './src/lib/db/migrations/pg',
  dbCredentials: {
    url: connectionString,
  },
});
