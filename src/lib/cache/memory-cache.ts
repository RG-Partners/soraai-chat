import type { Cache } from './cache.interface';

type Entry<V> = { value: V; expiresAt: number };

interface MemoryCacheOptions {
  defaultTtlMs?: number;
  cleanupIntervalMs?: number;
}

export class MemoryCache implements Cache {
  private readonly store = new Map<string, Entry<unknown>>();
  private readonly defaultTtlMs: number;

  constructor(options: MemoryCacheOptions = {}) {
    this.defaultTtlMs = options.defaultTtlMs ?? Infinity;
    const cleanupInterval = options.cleanupIntervalMs ?? 60_000;

    if (Number.isFinite(cleanupInterval) && cleanupInterval > 0) {
      setInterval(() => this.sweep(), cleanupInterval).unref?.();
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);

    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  async set(key: string, value: unknown, ttlMs = this.defaultTtlMs): Promise<void> {
    const expiresAt = Number.isFinite(ttlMs) ? Date.now() + ttlMs : Infinity;
    this.store.set(key, { value, expiresAt });
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== undefined;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async getAll(): Promise<Map<string, unknown>> {
    const result = new Map<string, unknown>();
    const now = Date.now();

    for (const [key, entry] of this.store.entries()) {
      if (now <= entry.expiresAt) {
        result.set(key, entry.value);
      } else {
        this.store.delete(key);
      }
    }

    return result;
  }

  private sweep() {
    const now = Date.now();

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}
