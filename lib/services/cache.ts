/* ═══════════════════════════════════════════════════════════════
   EquityLens — In-Memory TTL Cache
   Server-side singleton. Survives across requests in a single
   Node.js process. Drop-in compatible with Redis when needed.
═══════════════════════════════════════════════════════════════ */

interface CacheEntry<T> {
  data:    T;
  expires: number;
  hits:    number;
}

class InMemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private maxSize = 500; // prevent unbounded growth

  /** Store value with TTL in seconds */
  set<T>(key: string, data: T, ttlSeconds: number): void {
    // Evict oldest entry if at capacity
    if (this.store.size >= this.maxSize) {
      const oldest = [...this.store.entries()]
        .sort(([, a], [, b]) => a.expires - b.expires)[0];
      if (oldest) this.store.delete(oldest[0]);
    }
    this.store.set(key, { data, expires: Date.now() + ttlSeconds * 1000, hits: 0 });
  }

  /** Retrieve value or null if missing/expired */
  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return null;
    }
    entry.hits++;
    return entry.data;
  }

  /** Check if key exists and is not expired */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /** Delete specific key */
  del(key: string): void {
    this.store.delete(key);
  }

  /** Delete all keys matching a prefix */
  invalidate(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  /** Clear everything */
  flush(): void {
    this.store.clear();
  }

  /** Cache stats for debugging */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.store.size,
      keys: [...this.store.keys()],
    };
  }

  /**
   * Get-or-set pattern: return cached value or run fn() and cache the result.
   * Usage: cache.wrap('key', 60, async () => expensiveCall())
   */
  async wrap<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;
    const fresh = await fn();
    this.set(key, fresh, ttlSeconds);
    return fresh;
  }
}

/* Singleton — shared across all API route invocations */
const globalForCache = global as typeof globalThis & { equitylensCache?: InMemoryCache };
export const cache = globalForCache.equitylensCache ?? new InMemoryCache();
if (process.env.NODE_ENV !== "production") globalForCache.equitylensCache = cache;

/* Typed TTL constants (seconds) */
export const TTL = {
  INTELLIGENCE: parseInt(process.env.CACHE_TTL_INTELLIGENCE ?? "1200"),
  NEWS:         parseInt(process.env.CACHE_TTL_NEWS         ?? "600"),
  SENTIMENT:    parseInt(process.env.CACHE_TTL_SENTIMENT    ?? "300"),
  MARKET:       parseInt(process.env.CACHE_TTL_MARKET       ?? "60"),
  STATIC:       86400, // 24 hours — for company profiles, sector info
} as const;
