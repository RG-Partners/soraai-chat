import { Redis } from '@upstash/redis';
import type { Cache } from './cache.interface';
import { getRedisClient } from './redis-client';

export interface RedisCacheOptions {
  redis?: Redis;
  defaultTtlMs?: number;
  keyPrefix?: string;
  redisRestUrl?: string;
  redisRestToken?: string;
}

export class RedisCache implements Cache {
  private readonly redis: Redis;
  private readonly defaultTtlMs: number;
  private readonly keyPrefix: string;

  constructor(options: RedisCacheOptions = {}) {
    const {
      redis,
      defaultTtlMs,
      keyPrefix,
      redisRestUrl,
      redisRestToken,
    } = options;

    const client =
      redis ??
      (redisRestUrl && redisRestToken
        ? new Redis({ url: redisRestUrl, token: redisRestToken })
        : getRedisClient());

    if (!client) {
      throw new Error('Redis client is not configured');
    }

    this.redis = client;
    this.defaultTtlMs = defaultTtlMs ?? Infinity;
    this.keyPrefix = keyPrefix ?? '';
  }

  private toKey(key: string): string {
    return this.keyPrefix ? `${this.keyPrefix}${key}` : key;
  }

  async get<T>(key: string): Promise<T | undefined> {
    const value = await this.redis.get<string>(this.toKey(key));

    if (value === null || value === undefined) {
      return undefined;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
    const ttl = ttlMs ?? this.defaultTtlMs;
    const serialized = JSON.stringify(value);
    const namespacedKey = this.toKey(key);

    if (Number.isFinite(ttl)) {
      await this.redis.set(namespacedKey, serialized, { px: Math.max(1, Math.trunc(ttl)) });
    } else {
      await this.redis.set(namespacedKey, serialized);
    }
  }

  async has(key: string): Promise<boolean> {
    return (await this.redis.exists(this.toKey(key))) === 1;
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(this.toKey(key));
  }

  async clear(): Promise<void> {
    const pattern = this.keyPrefix ? `${this.keyPrefix}*` : '*';
    const keys = await this.redis.keys(pattern);

    if (keys.length === 0) {
      return;
    }

    await this.redis.del(...keys);
  }

  async getAll(): Promise<Map<string, unknown>> {
    const result = new Map<string, unknown>();
    const pattern = this.keyPrefix ? `${this.keyPrefix}*` : '*';
    const keys = await this.redis.keys(pattern);

    if (keys.length === 0) {
      return result;
    }

    const values = await this.redis.mget(...keys);

    keys.forEach((namespacedKey, index) => {
      const value = values[index];

      if (value === null || value === undefined) {
        return;
      }

      const key = this.keyPrefix
        ? namespacedKey.slice(this.keyPrefix.length)
        : namespacedKey;

      if (typeof value === 'string') {
        try {
          result.set(key, JSON.parse(value));
          return;
        } catch {
          result.set(key, value);
          return;
        }
      }

      result.set(key, value);
    });

    return result;
  }
}
