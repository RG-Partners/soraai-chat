import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { join } from 'path';

import logger from '../../logger';
import { pgDb } from './db.pg';

const migrationLogger = logger.withDefaults({ tag: 'db:migrate' });

export const runMigrate = async () => {
  migrationLogger.info('Running PostgreSQL migrations...');

  const start = Date.now();

  try {
    await migrate(pgDb, {
      migrationsFolder: join(process.cwd(), 'src/lib/db/migrations/pg'),
    });
  } catch (error) {
    migrationLogger.error('PostgreSQL migrations failed. Ensure the database is reachable.', error);
    throw error;
  }

  const durationMs = Date.now() - start;
  migrationLogger.success(`PostgreSQL migrations completed in ${durationMs}ms`);
};
