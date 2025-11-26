import { Redis } from '@upstash/redis';

const redisEnv = () => {
  const url =
    process.env.REDIS_REST_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL;
  const token =
    process.env.REDIS_REST_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN;

  return { url, token };
};

declare global {
  // eslint-disable-next-line no-var
  var __upstashRedisClient__: Redis | undefined;
}

export const getRedisClient = (): Redis | null => {
  const existing = globalThis.__upstashRedisClient__;

  if (existing) {
    return existing;
  }

  const { url, token } = redisEnv();

  if (!url || !token) {
    return null;
  }

  const client = new Redis({ url, token });

  globalThis.__upstashRedisClient__ = client;

  return client;
};

export const hasRedisClient = (): boolean => {
  if (globalThis.__upstashRedisClient__) {
    return true;
  }

  const { url, token } = redisEnv();
  return Boolean(url && token);
};
