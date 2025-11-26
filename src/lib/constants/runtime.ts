import { parseEnvBoolean } from '@/lib/utils/env';

export const IS_DEV = process.env.NODE_ENV !== 'production';
export const IS_BROWSER = typeof window !== 'undefined';
export const IS_VERCEL_ENV = process.env.VERCEL === '1';
export const IS_DOCKER_ENV = process.env.DOCKER_BUILD === '1';
export const FILE_BASED_MCP_CONFIG = parseEnvBoolean(
  process.env.FILE_BASED_MCP_CONFIG,
  false,
);
export const LOG_TAG = process.env.LOG_TAG?.trim() || 'soraai';
