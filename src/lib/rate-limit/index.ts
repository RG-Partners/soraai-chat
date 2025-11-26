import { Ratelimit } from '@upstash/ratelimit';
import type { Duration } from '@upstash/ratelimit';
import type { Redis } from '@upstash/redis';
import { getRedisClient } from '../cache/redis-client';

export type RateLimiterMode = 'sliding' | 'fixed' | 'token-bucket';

interface BaseRateLimiterOptions {
  keyPrefix: string;
  analytics?: boolean;
  timeoutMs?: number;
  ephemeralCache?: Map<string, number> | false;
}

interface SlidingOrFixedWindowOptions extends BaseRateLimiterOptions {
  requests: number;
  window: Duration;
  mode?: 'sliding' | 'fixed';
}

interface TokenBucketOptions extends BaseRateLimiterOptions {
  mode: 'token-bucket';
  refillRate: number;
  interval: Duration;
  maxTokens: number;
}

export type RateLimiterOptions =
  | SlidingOrFixedWindowOptions
  | TokenBucketOptions;

export interface RateLimitState {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  reason?: string;
  retryAfterMs: number;
}

export interface RateLimiterHandle {
  isEnabled: boolean;
  limit: (identifier: string) => Promise<RateLimitState>;
}

declare global {
  // eslint-disable-next-line no-var
  var __rateLimiters__: Map<string, Ratelimit> | undefined;
}

const limiterRegistry = () => {
  if (!globalThis.__rateLimiters__) {
    globalThis.__rateLimiters__ = new Map();
  }

  return globalThis.__rateLimiters__;
};

const limiterKey = (options: RateLimiterOptions) => {
  if (options.mode === 'token-bucket') {
    return [
      options.keyPrefix,
      'token',
      options.refillRate,
      options.interval,
      options.maxTokens,
    ].join('::');
  }

  const mode = options.mode ?? 'sliding';
  return [options.keyPrefix, mode, options.requests, options.window].join('::');
};

const buildLimiter = (
  client: Redis,
  options: RateLimiterOptions,
): Ratelimit => {
  const limiterConfig = {
    redis: client,
    analytics: options.analytics ?? false,
    prefix: options.keyPrefix,
    timeout: options.timeoutMs,
    ephemeralCache: options.ephemeralCache,
  } as const;

  if (options.mode === 'token-bucket') {
    return new Ratelimit({
      ...limiterConfig,
      limiter: Ratelimit.tokenBucket(
        options.refillRate,
        options.interval,
        options.maxTokens,
      ),
    });
  }

  if ((options.mode ?? 'sliding') === 'fixed') {
    return new Ratelimit({
      ...limiterConfig,
      limiter: Ratelimit.fixedWindow(options.requests, options.window),
    });
  }

  return new Ratelimit({
    ...limiterConfig,
    limiter: Ratelimit.slidingWindow(options.requests, options.window),
  });
};

const getLimiter = (
  client: Redis,
  options: RateLimiterOptions,
): Ratelimit => {
  const registry = limiterRegistry();
  const key = limiterKey(options);
  const existing = registry.get(key);

  if (existing) {
    return existing;
  }

  const limiter = buildLimiter(client, options);
  registry.set(key, limiter);
  return limiter;
};

type RatelimitResult = Awaited<ReturnType<Ratelimit['limit']>>;

const toRateLimitState = (response: RatelimitResult): RateLimitState => {
  // Ensure we don't surface analytics rejections
  response.pending.catch(() => undefined);

  return {
    success: response.success,
    limit: response.limit,
    remaining: response.remaining,
    reset: response.reset,
    reason: response.reason,
    retryAfterMs: Math.max(response.reset - Date.now(), 0),
  };
};

export const createRateLimiter = (
  options: RateLimiterOptions,
): RateLimiterHandle => {
  const client = getRedisClient();

  if (!client) {
    return {
      isEnabled: false,
      async limit() {
        return {
          success: true,
          limit: Number.POSITIVE_INFINITY,
          remaining: Number.POSITIVE_INFINITY,
          reset: Date.now(),
          retryAfterMs: 0,
        };
      },
    };
  }

  const limiter = getLimiter(client, options);

  return {
    isEnabled: true,
    async limit(identifier: string) {
      const result = await limiter.limit(identifier);
      return toRateLimitState(result);
    },
  };
};
