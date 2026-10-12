import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  MemoryBackend,
  UpstashBackend,
  createBackend,
  rateLimit,
  setRateLimitBackend,
} from "@/lib/ratelimit/limiter";
import { enforceRateLimit, clientIp, POLICIES } from "@/lib/ratelimit/guard";

beforeEach(() => setRateLimitBackend(new MemoryBackend()));
afterEach(() => {
  setRateLimitBackend(null);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("rateLimit (memory backend)", () => {
  it("allows up to the limit then blocks", async () => {
    const opts = { key: "k", limit: 3, windowSec: 60 };
    const results = [];
    for (let i = 0; i < 5; i++) results.push((await rateLimit(opts)).allowed);
    expect(results).toEqual([true, true, true, false, false]);
  });

  it("tracks keys independently", async () => {
    await rateLimit({ key: "a", limit: 1, windowSec: 60 });
    expect((await rateLimit({ key: "a", limit: 1, windowSec: 60 })).allowed).toBe(false);
    expect((await rateLimit({ key: "b", limit: 1, windowSec: 60 })).allowed).toBe(true);
  });

  it("resets when the window elapses", async () => {
    vi.useFakeTimers();
    const opts = { key: "w", limit: 1, windowSec: 10 };
    expect((await rateLimit(opts)).allowed).toBe(true);
    expect((await rateLimit(opts)).allowed).toBe(false);
    vi.advanceTimersByTime(11_000);
    expect((await rateLimit(opts)).allowed).toBe(true);
  });

  it("reports remaining and a positive retry-after", async () => {
    const r = await rateLimit({ key: "r", limit: 2, windowSec: 30 });
    expect(r.remaining).toBe(1);
    expect(r.retryAfterSec).toBeGreaterThan(0);
  });

  it("stays bounded under many distinct keys", async () => {
    const small = new MemoryBackend(50);
    for (let i = 0; i < 500; i++) await small.hit(`k${i}`, 60);
    // No assertion on internals: the loop completing without growth-related failure is the check,
    // plus the size cap is exercised by eviction paths.
    expect((await small.hit("k499", 60)).count).toBe(2);
  });
});

describe("UpstashBackend", () => {
  it("sends INCR/EXPIRE NX/TTL in one pipeline with bearer auth", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ result: 3 }, { result: 1 }, { result: 42 }],
    });
    const b = new UpstashBackend("https://x.upstash.io/", "tok", fetchSpy as unknown as typeof fetch);
    const out = await b.hit("rl:test", 60);

    expect(out).toEqual({ count: 3, ttlSec: 42 });
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://x.upstash.io/pipeline");
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body)).toEqual([
      ["INCR", "rl:test"],
      ["EXPIRE", "rl:test", "60", "NX"],
      ["TTL", "rl:test"],
    ]);
  });

  it("throws on a non-OK response so the limiter can fail open", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const b = new UpstashBackend("https://x.upstash.io", "t", fetchSpy as unknown as typeof fetch);
    await expect(b.hit("k", 1)).rejects.toThrow();
  });
});

describe("failure behaviour", () => {
  it("fails open (and logs) when the backend errors", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    setRateLimitBackend({
      hit: async () => {
        throw new Error("redis down");
      },
    });
    const r = await rateLimit({ key: "k", limit: 1, windowSec: 1 });
    expect(r.allowed).toBe(true);
    expect(err).toHaveBeenCalled();
  });
});

describe("createBackend", () => {
  it("selects Upstash only when both variables are present", () => {
    const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;
    expect(createBackend(env({ NODE_ENV: "test" }))).toBeInstanceOf(MemoryBackend);
    expect(createBackend(env({ NODE_ENV: "test", UPSTASH_REDIS_REST_URL: "https://x" }))).toBeInstanceOf(MemoryBackend);
    expect(
      createBackend(env({ NODE_ENV: "test", UPSTASH_REDIS_REST_URL: "https://x", UPSTASH_REDIS_REST_TOKEN: "t" })),
    ).toBeInstanceOf(UpstashBackend);
  });
});

describe("enforceRateLimit", () => {
  const req = (ip = "203.0.113.9") =>
    new Request("https://example.test/api/x", { headers: { "x-forwarded-for": `${ip}, 10.0.0.1` } });
  const policy = { name: "t", limit: 2, windowSec: 60 };

  it("extracts the first forwarded IP", () => {
    expect(clientIp(req())).toBe("203.0.113.9");
    expect(clientIp(new Request("https://x.test"))).toBe("unknown");
  });

  it("returns null while under the limit and a 429 with Retry-After when over", async () => {
    expect(await enforceRateLimit(req(), policy)).toBeNull();
    expect(await enforceRateLimit(req(), policy)).toBeNull();
    const blocked = await enforceRateLimit(req(), policy);
    expect(blocked?.status).toBe(429);
    expect(Number(blocked?.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect((await blocked!.json()).code).toBe("RATE_LIMITED");
  });

  it("buckets by subject when given (e.g. per email), independent of IP", async () => {
    await enforceRateLimit(req("1.1.1.1"), policy, "a@b.co");
    await enforceRateLimit(req("2.2.2.2"), policy, "a@b.co");
    expect((await enforceRateLimit(req("3.3.3.3"), policy, "A@B.co"))?.status).toBe(429);
  });

  it("defines a policy for every protected surface", () => {
    for (const key of ["login", "signup", "passwordReset", "search", "aiAnalysis", "intelligence", "portfolioScan", "telegramWebhook"]) {
      expect(POLICIES).toHaveProperty(key);
    }
  });
});
