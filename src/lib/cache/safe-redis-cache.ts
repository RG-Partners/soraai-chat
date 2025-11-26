import type { Cache } from './cache.interface';
import { MemoryCache } from './memory-cache';
import { RedisCache, type RedisCacheOptions } from './redis-cache';
import logger from '@/lib/logger';

const redisLogger = logger.withDefaults({ tag: 'cache:redis' });

interface SafeRedisCacheOptions extends RedisCacheOptions {
  fallbackToMemory?: boolean;
  serverCache?: Cache;
  maxRetries?: number;
  retryDelayMs?: number;
}

export class SafeRedisCache implements Cache {
  private redisCache: RedisCache | null = null;
  private readonly serverCache: Cache;
  private isRedisUnavailable = false;
  private retryCount = 0;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private lastRetryTime = 0;
  private readonly redisOptions: RedisCacheOptions;

  constructor(options: SafeRedisCacheOptions = {}) {
    const {
      fallbackToMemory = true,
      serverCache,
      maxRetries = 3,
      retryDelayMs = 60_000,
      ...redisOptions
    } = options;

    this.serverCache = serverCache ?? new MemoryCache();
    this.maxRetries = maxRetries;
    this.retryDelayMs = retryDelayMs;
    this.redisOptions = redisOptions;

    if (fallbackToMemory) {
      try {
        this.redisCache = new RedisCache(redisOptions);
      } catch {
        this.isRedisUnavailable = true;
      }
    } else {
      this.redisCache = new RedisCache(redisOptions);
    }
  }

  private async runWithFallback<T>(
    redisOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
  ): Promise<T> {
    if (this.isRedisUnavailable || !this.redisCache) {
      await this.maybeRetryRedis();
      if (this.isRedisUnavailable || !this.redisCache) {
        return fallbackOperation();
      }
    }

    try {
      return await redisOperation();
    } catch (error) {
      this.isRedisUnavailable = true;
      redisLogger.warn(
        `Redis cache operation failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return fallbackOperation();
    }
  }

  private async maybeRetryRedis() {
    if (this.retryCount >= this.maxRetries) {
      return;
    }

    const now = Date.now();

    if (now - this.lastRetryTime < this.retryDelayMs) {
      return;
    }

    this.lastRetryTime = now;
    this.retryCount += 1;

    try {
      if (!this.redisCache) {
        this.redisCache = new RedisCache(this.redisOptions);
      }

      await this.redisCache.has('__healthcheck__');
      this.isRedisUnavailable = false;
      this.retryCount = 0;
    } catch {
      // swallow and keep fallback active
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.runWithFallback(
      () => this.redisCache!.get<T>(key),
      () => this.serverCache.get<T>(key),
    );
  }

  async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
    return this.runWithFallback(
      async () => {
        await this.redisCache!.set(key, value, ttlMs);
        await this.serverCache.set(key, value, ttlMs);
      },
      () => this.serverCache.set(key, value, ttlMs),
    );
  }

  async has(key: string): Promise<boolean> {
    return this.runWithFallback(
      () => this.redisCache!.has(key),
      () => this.serverCache.has(key),
    );
  }

  async delete(key: string): Promise<void> {
    return this.runWithFallback(
      async () => {
        await this.redisCache!.delete(key);
        await this.serverCache.delete(key);
      },
      () => this.serverCache.delete(key),
    );
  }

  async clear(): Promise<void> {
    return this.runWithFallback(
      async () => {
        await this.redisCache!.clear();
        await this.serverCache.clear();
      },
      () => this.serverCache.clear(),
    );
  }

  async getAll(): Promise<Map<string, unknown>> {
    return this.runWithFallback(
      () => this.redisCache!.getAll(),
      () => this.serverCache.getAll(),
    );
  }
}
