import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { redact, log, setLogSink } from "@/lib/observability/logger";
import { cacheHitRate, incr, percentile, recordTiming, resetMetrics, snapshot, timed } from "@/lib/observability/metrics";
import {
  MemoryCacheBackend,
  UpstashCache,
  createCacheBackend,
  setSharedCacheBackend,
  sharedWrap,
  type SharedCacheBackend,
} from "@/lib/cache/shared";

describe("logger", () => {
  it("redacts sensitive keys at any depth and serialises errors", () => {
    const out = redact({
      email: "a@b.c",
      password: "hunter2",
      nested: { Authorization: "Bearer x", ok: 1, list: [{ apiKey: "k" }] },
      err: new Error("boom"),
    }) as {
      email: string; password: string; err: { message: string };
      nested: { Authorization: string; ok: number; list: { apiKey: string }[] };
    };
    expect(out.email).toBe("a@b.c");
    expect(out.password).toBe("[redacted]");
    expect(out.nested.Authorization).toBe("[redacted]");
    expect(out.nested.list[0].apiKey).toBe("[redacted]");
    expect(out.nested.ok).toBe(1);
    expect(out.err.message).toBe("boom");
  });

  it("does not hang on cyclic objects", () => {
    const a: Record<string, unknown> = { n: 1 };
    a.self = a;
    expect(() => JSON.stringify(redact(a))).not.toThrow();
  });

  it("emits one JSON line with ts, level and event, and honours LOG_LEVEL", () => {
    const lines: string[] = [];
    setLogSink((_l, line) => lines.push(line));
    vi.stubEnv("LOG_LEVEL", "warn");
    log.info("skipped");
    log.error("kept", { token: "abc", ticker: "TCS" });
    vi.unstubAllEnvs();
    setLogSink(null);
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]);
    expect(parsed).toMatchObject({ level: "error", event: "kept", ticker: "TCS", token: "[redacted]" });
    expect(typeof parsed.ts).toBe("string");
  });
});

describe("metrics", () => {
  beforeEach(resetMetrics);

  it("computes percentiles", () => {
    const s = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(s, 50)).toBe(5);
    expect(percentile(s, 95)).toBe(10);
    expect(percentile([], 50)).toBeNull();
  });

  it("records latency and failures via timed()", async () => {
    await timed("op", async () => 1);
    await expect(timed("op", async () => { throw new Error("x"); })).rejects.toThrow("x");
    const t = snapshot().timings.op;
    expect(t.count).toBe(2);
    expect(t.errors).toBe(1);
  });

  it("reports hit rate as null before any traffic, never 0 or NaN", () => {
    expect(cacheHitRate("ns")).toBeNull();
    incr("cache.ns.hit");
    incr("cache.ns.hit");
    incr("cache.ns.miss");
    expect(cacheHitRate("ns")).toBeCloseTo(2 / 3, 10);
  });

  it("labels its scope honestly", () => {
    recordTiming("a", 5);
    expect(snapshot().scope).toBe("single-instance");
  });
});

describe("shared cache", () => {
  beforeEach(() => {
    resetMetrics();
    setSharedCacheBackend(new MemoryCacheBackend());
  });
  afterEach(() => setSharedCacheBackend(null));

  it("computes once, then serves from cache and counts hit/miss", async () => {
    const compute = vi.fn(async () => ({ v: 1 }));
    expect(await sharedWrap("t", "k1", 60, compute)).toEqual({ v: 1 });
    expect(await sharedWrap("t", "k1", 60, compute)).toEqual({ v: 1 });
    expect(compute).toHaveBeenCalledTimes(1);
    expect(cacheHitRate("t")).toBeCloseTo(0.5, 10);
  });

  it("does not cache results the caller rejects", async () => {
    const compute = vi.fn(async () => ({ error: "upstream" }));
    const ok = (v: { error?: string }) => !v.error;
    await sharedWrap("t", "k2", 60, compute, ok);
    await sharedWrap("t", "k2", 60, compute, ok);
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it("falls back to computing when the backend throws", async () => {
    const broken: SharedCacheBackend = {
      get: async () => { throw new Error("redis down"); },
      set: async () => { throw new Error("redis down"); },
      del: async () => { throw new Error("redis down"); },
    };
    setSharedCacheBackend(broken);
    expect(await sharedWrap("t", "k3", 60, async () => 42)).toBe(42);
    expect(snapshot().counters["cache.t.error"]).toBeGreaterThan(0);
  });
});

describe("Upstash cache backend", () => {
  it("is selected only when both env vars are set", () => {
    expect(createCacheBackend({} as NodeJS.ProcessEnv)).toBeInstanceOf(MemoryCacheBackend);
    expect(createCacheBackend({ UPSTASH_REDIS_REST_URL: "https://x" } as unknown as NodeJS.ProcessEnv)).toBeInstanceOf(MemoryCacheBackend);
    expect(
      createCacheBackend({ UPSTASH_REDIS_REST_URL: "https://x", UPSTASH_REDIS_REST_TOKEN: "t" } as unknown as NodeJS.ProcessEnv),
    ).toBeInstanceOf(UpstashCache);
  });

  it("sends authenticated SET ... EX commands and parses GET", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fake = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      const cmd = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ result: cmd[0] === "GET" ? '{"a":1}' : "OK" }), { status: 200 });
    }) as unknown as typeof fetch;
    const c = new UpstashCache("https://redis.example/", "tok", fake);
    await c.set("k", "v", 90);
    expect(JSON.parse(String(calls[0].init.body))).toEqual(["SET", "k", "v", "EX", 90]);
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    expect(calls[0].url).toBe("https://redis.example");
    expect(await c.get("k")).toBe('{"a":1}');
  });

  it("throws on HTTP errors so callers can fail open", async () => {
    const fake = (async () => new Response("no", { status: 500 })) as unknown as typeof fetch;
    await expect(new UpstashCache("https://r", "t", fake).get("k")).rejects.toThrow(/500/);
  });
});

describe("isUsable (what may be cached)", async () => {
  const { isUsable } = await import("@/lib/cache/shared");
  it("rejects null, empty arrays and error-shaped objects", () => {
    expect(isUsable(null)).toBe(false);
    expect(isUsable(undefined)).toBe(false);
    expect(isUsable([])).toBe(false);
    expect(isUsable({ error: "upstream down" })).toBe(false);
  });
  it("accepts real data, including falsy primitives that are valid values", () => {
    expect(isUsable([{ title: "x" }])).toBe(true);
    expect(isUsable({ rsi: 42 })).toBe(true);
    expect(isUsable(0)).toBe(true);
  });
});
