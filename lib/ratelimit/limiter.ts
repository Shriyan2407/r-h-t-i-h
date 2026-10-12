/**
 * Fixed-window rate limiter.
 *
 * Backends:
 *  - Upstash Redis (REST) when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set.
 *    State is shared by every serverless instance, so limits are real.
 *  - In-memory otherwise. Per-process only: fine for development and tests, and a
 *    best-effort speed bump in production if Redis is not configured (a warning is logged).
 *
 * If the Redis backend errors, requests are allowed (fail open) and the error is
 * logged: an Upstash outage must not take the whole product down.
 */

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the current window resets. */
  retryAfterSec: number;
}

export interface RateLimitBackend {
  /** Increment the counter for `key` and return the new count and seconds left in the window. */
  hit(key: string, windowSec: number): Promise<{ count: number; ttlSec: number }>;
}

/* ───────────────────────── in-memory backend ───────────────────────── */

export class MemoryBackend implements RateLimitBackend {
  private store = new Map<string, { count: number; expiresAt: number }>();
  private readonly maxKeys: number;

  constructor(maxKeys = 10_000) {
    this.maxKeys = maxKeys;
  }

  async hit(key: string, windowSec: number) {
    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry || entry.expiresAt <= now) {
      if (this.store.size >= this.maxKeys) this.evictExpired(now);
      entry = { count: 0, expiresAt: now + windowSec * 1000 };
      this.store.set(key, entry);
    }
    entry.count += 1;
    return { count: entry.count, ttlSec: Math.max(1, Math.ceil((entry.expiresAt - now) / 1000)) };
  }

  private evictExpired(now: number) {
    for (const [k, v] of this.store) {
      if (v.expiresAt <= now) this.store.delete(k);
    }
    // Still full of live keys: drop the oldest insertion to stay bounded.
    if (this.store.size >= this.maxKeys) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
  }
}

/* ───────────────────────── Upstash REST backend ───────────────────────── */

export class UpstashBackend implements RateLimitBackend {
  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async hit(key: string, windowSec: number) {
    // INCR, set the expiry only when the key is new (NX), then read the TTL.
    const res = await this.fetchImpl(`${this.url.replace(/\/+$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(windowSec), "NX"],
        ["TTL", key],
      ]),
      signal: AbortSignal.timeout(2_000),
    });
    if (!res.ok) throw new Error(`Upstash responded ${res.status}`);

    const out = (await res.json()) as Array<{ result?: number; error?: string }>;
    const count = out[0]?.result;
    const ttl = out[2]?.result;
    if (typeof count !== "number" || out[0]?.error) throw new Error("Unexpected Upstash response");
    return { count, ttlSec: typeof ttl === "number" && ttl > 0 ? ttl : windowSec };
  }
}

/* ───────────────────────── selection + public API ───────────────────────── */

let backend: RateLimitBackend | null = null;
let warnedMemoryInProd = false;

export function createBackend(env: NodeJS.ProcessEnv = process.env): RateLimitBackend {
  const url = env.UPSTASH_REDIS_REST_URL?.trim();
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url && token) return new UpstashBackend(url, token);

  if (env.NODE_ENV === "production" && !warnedMemoryInProd) {
    warnedMemoryInProd = true;
    console.warn(
      "[ratelimit] UPSTASH_REDIS_REST_URL/TOKEN not set: using per-instance in-memory limits. " +
        "Configure Upstash for limits that hold across serverless instances.",
    );
  }
  return new MemoryBackend();
}

/** Override the backend (tests). Pass null to reset to environment-based selection. */
export function setRateLimitBackend(b: RateLimitBackend | null) {
  backend = b;
}

export async function rateLimit(opts: {
  key: string;
  limit: number;
  windowSec: number;
}): Promise<RateLimitResult> {
  backend ??= createBackend();
  try {
    const { count, ttlSec } = await backend.hit(opts.key, opts.windowSec);
    return {
      allowed: count <= opts.limit,
      limit: opts.limit,
      remaining: Math.max(0, opts.limit - count),
      retryAfterSec: ttlSec,
    };
  } catch (err) {
    console.error("[ratelimit] backend error, failing open:", (err as Error).message);
    return { allowed: true, limit: opts.limit, remaining: opts.limit, retryAfterSec: 0 };
  }
}
