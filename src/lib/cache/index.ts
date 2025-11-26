import { Cache } from './cache.interface';
import { MemoryCache } from './memory-cache';
import { SafeRedisCache } from './safe-redis-cache';
import { getRedisClient } from './redis-client';

const isDev = process.env.NODE_ENV !== 'production';

declare global {
  // eslint-disable-next-line no-var
  var __serverCache__: Cache | undefined;
}

const createCache = (): Cache => {
  const redisClient = getRedisClient();

  if (redisClient) {
    return new SafeRedisCache({ redis: redisClient, keyPrefix: 'soraai:' });
  }

  return new MemoryCache();
};

export const serverCache = globalThis.__serverCache__ ?? createCache();

if (isDev) {
  globalThis.__serverCache__ = serverCache;
}

export type { Cache } from './cache.interface';
export { MemoryCache } from './memory-cache';
export { RedisCache } from './redis-cache';
export { SafeRedisCache } from './safe-redis-cache';
export { CacheKeys } from './cache-keys';
export { getRedisClient, hasRedisClient } from './redis-client';
