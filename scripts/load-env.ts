import path from 'node:path';
import fs from 'node:fs';
import { config } from 'dotenv';

type LoadEnvOptions = {
  root?: string;
};

export const loadEnv = ({ root = process.cwd() }: LoadEnvOptions = {}) => {
  const candidates = [
    '.env.local',
    process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : undefined,
    '.env',
  ].filter(Boolean) as string[];

  candidates.forEach((file) => {
    const fullPath = path.resolve(root, file);
    if (!fs.existsSync(fullPath)) {
      return;
    }

    config({ path: fullPath });
  });
};

loadEnv();
