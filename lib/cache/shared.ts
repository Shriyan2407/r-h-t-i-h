/**
 * Shared JSON cache.
 *
 * Backends: Upstash Redis (REST) when UPSTASH_REDIS_REST_URL/TOKEN are set, shared by every
 * serverless instance; otherwise the per-process in-memory cache. Redis errors never break a
 * request: they are logged and the value is recomputed (fail open).
 *
 * Only JSON-serialisable values may be cached. `null`/`undefined` results are not cached.
 */
import { cache as memory } from "@/lib/services/cache";
import { log } from "@/lib/observability/logger";
import { incr } from "@/lib/observability/metrics";

export interface SharedCacheBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSec: number): Promise<void>;
  del(key: string): Promise<void>;
}

export class UpstashCache implements SharedCacheBackend {
  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async cmd(command: (string | number)[]): Promise<unknown> {
    const res = await this.fetchImpl(this.url.replace(/\/+$/, ""), {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(2_000),
    });
    if (!res.ok) throw new Error(`Upstash responded ${res.status}`);
    const body = (await res.json()) as { result?: unknown; error?: string };
    if (body.error) throw new Error(body.error);
    return body.result;
  }

  async get(key: string) {
    const r = await this.cmd(["GET", key]);
    return typeof r === "string" ? r : null;
  }
  async set(key: string, value: string, ttlSec: number) {
    await this.cmd(["SET", key, value, "EX", Math.max(1, Math.floor(ttlSec))]);
  }
  async del(key: string) {
    await this.cmd(["DEL", key]);
  }
}

export class MemoryCacheBackend implements SharedCacheBackend {
  async get(key: string) {
    return memory.get<string>(key);
  }
  async set(key: string, value: string, ttlSec: number) {
    memory.set(key, value, ttlSec);
  }
  async del(key: string) {
    memory.del(key);
  }
}

let backend: SharedCacheBackend | null = null;

export function createCacheBackend(env: NodeJS.ProcessEnv = process.env): SharedCacheBackend {
  const url = env.UPSTASH_REDIS_REST_URL?.trim();
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return url && token ? new UpstashCache(url, token) : new MemoryCacheBackend();
}

/** Override the backend (tests). Pass null to restore environment-based selection. */
export function setSharedCacheBackend(b: SharedCacheBackend | null) {
  backend = b;
}

const PREFIX = "c:";

export async function sharedGet<T>(namespace: string, key: string): Promise<T | null> {
  backend ??= createCacheBackend();
  try {
    const raw = await backend.get(`${PREFIX}${namespace}:${key}`);
    if (raw === null) {
      incr(`cache.${namespace}.miss`);
      return null;
    }
    incr(`cache.${namespace}.hit`);
    return JSON.parse(raw) as T;
  } catch (err) {
    incr(`cache.${namespace}.error`);
    log.warn("cache.read_failed", { namespace, error: err });
    return null;
  }
}

/** Existence check that does not touch hit/miss metrics (used to decide whether work is needed). */
export async function sharedPeek(namespace: string, key: string): Promise<boolean> {
  backend ??= createCacheBackend();
  try {
    return (await backend.get(`${PREFIX}${namespace}:${key}`)) !== null;
  } catch {
    return false;
  }
}

export async function sharedSet<T>(namespace: string, key: string, value: T, ttlSec: number): Promise<void> {
  if (value === null || value === undefined) return;
  backend ??= createCacheBackend();
  try {
    await backend.set(`${PREFIX}${namespace}:${key}`, JSON.stringify(value), ttlSec);
  } catch (err) {
    incr(`cache.${namespace}.error`);
    log.warn("cache.write_failed", { namespace, error: err });
  }
}

export async function sharedDel(namespace: string, key: string): Promise<void> {
  backend ??= createCacheBackend();
  try {
    await backend.del(`${PREFIX}${namespace}:${key}`);
  } catch (err) {
    log.warn("cache.delete_failed", { namespace, error: err });
  }
}

/** Default rule for upstream data: never cache null, empty arrays, or error-shaped objects. */
export function isUsable(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return !("error" in (v as object));
  return true;
}

/**
 * Get-or-compute. `isCacheable` lets callers refuse to store degraded results (e.g. error
 * objects) so a transient failure is never served for the whole TTL.
 */
export async function sharedWrap<T>(
  namespace: string,
  key: string,
  ttlSec: number,
  compute: () => Promise<T>,
  isCacheable: (v: T) => boolean = () => true,
): Promise<T> {
  const hit = await sharedGet<T>(namespace, key);
  if (hit !== null && isCacheable(hit)) return hit;
  const fresh = await compute();
  if (isCacheable(fresh)) await sharedSet(namespace, key, fresh, ttlSec);
  return fresh;
}
