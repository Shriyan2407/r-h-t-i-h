/**
 * In-process metrics. IMPORTANT: on serverless hosts every instance has its own registry and it
 * resets on cold start, so these numbers describe one instance's recent life, not the fleet.
 * Use them for the health endpoint and logs; use a real metrics backend for fleet-wide SLOs.
 */
interface Timing {
  count: number;
  totalMs: number;
  maxMs: number;
  errors: number;
  /** Ring buffer of recent samples for percentile estimates. */
  recent: number[];
}

const RECENT = 200;
const counters = new Map<string, number>();
const timings = new Map<string, Timing>();

export function incr(name: string, by = 1) {
  counters.set(name, (counters.get(name) ?? 0) + by);
}

export function recordTiming(name: string, ms: number, failed = false) {
  let t = timings.get(name);
  if (!t) {
    t = { count: 0, totalMs: 0, maxMs: 0, errors: 0, recent: [] };
    timings.set(name, t);
  }
  t.count++;
  t.totalMs += ms;
  t.maxMs = Math.max(t.maxMs, ms);
  if (failed) t.errors++;
  t.recent.push(ms);
  if (t.recent.length > RECENT) t.recent.shift();
}

/** Run `fn`, recording its latency and whether it threw. */
export async function timed<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    const out = await fn();
    recordTiming(name, performance.now() - start);
    return out;
  } catch (err) {
    recordTiming(name, performance.now() - start, true);
    throw err;
  }
}

export function percentile(sorted: readonly number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

export function cacheHitRate(namespace: string): number | null {
  const hits = counters.get(`cache.${namespace}.hit`) ?? 0;
  const misses = counters.get(`cache.${namespace}.miss`) ?? 0;
  return hits + misses === 0 ? null : hits / (hits + misses);
}

export function snapshot() {
  const t: Record<string, { count: number; errors: number; avgMs: number; p50Ms: number | null; p95Ms: number | null; maxMs: number }> = {};
  for (const [name, v] of timings) {
    const sorted = [...v.recent].sort((a, b) => a - b);
    t[name] = {
      count: v.count,
      errors: v.errors,
      avgMs: Math.round(v.totalMs / v.count),
      p50Ms: percentile(sorted, 50),
      p95Ms: percentile(sorted, 95),
      maxMs: Math.round(v.maxMs),
    };
  }
  return { scope: "single-instance", counters: Object.fromEntries(counters), timings: t };
}

export function resetMetrics() {
  counters.clear();
  timings.clear();
}
