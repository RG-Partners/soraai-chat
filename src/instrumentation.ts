export const runtime = 'nodejs';

export const register = async () => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  const logger = await import('./lib/logger').then((m) => m.default);
  const { IS_VERCEL_ENV } = await import('./lib/constants/runtime');

  if (!IS_VERCEL_ENV) {
    try {
      logger.info('Running database migrations...');

      const dynamicRequire = eval('require') as NodeJS.Require;
      const childProcess = dynamicRequire('child_process') as typeof import('child_process');
      const path = dynamicRequire('path') as typeof import('path');
      const { spawn } = childProcess;
      const { join } = path;

      const migrateScript = join(process.cwd(), 'scripts/db-migrate.cjs');

      await new Promise<void>((resolve, reject) => {
        const child = spawn(process.execPath, [migrateScript], {
          stdio: 'inherit',
        });

        child.once('error', reject);
        child.once('exit', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Migration script exited with code ${code}`));
          }
        });
      });

      logger.success('Database migrations completed successfully');
    } catch (error) {
      logger.error('Failed to run database migrations.', error);
      process.exit(1);
    }
  }
};
