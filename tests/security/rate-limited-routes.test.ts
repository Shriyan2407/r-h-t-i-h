import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  cacheGet: vi.fn(),
  cacheWrap: vi.fn(),
  yfSearch: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/services/cache", () => ({
  cache: { get: m.cacheGet, wrap: m.cacheWrap },
  TTL: { INTELLIGENCE: 1200, NEWS: 600, SENTIMENT: 300, MARKET: 60, STATIC: 86400 },
}));
vi.mock("yahoo-finance2", () => ({
  default: class {
    search = m.yfSearch;
  },
}));
vi.mock("sharp", () => ({ default: vi.fn() }));

import { MemoryBackend, setRateLimitBackend } from "@/lib/ratelimit/limiter";
import { GET as search } from "@/app/api/search/route";
import { GET as aiAnalysis } from "@/app/api/ai-analysis/[ticker]/route";
import { POST as scan } from "@/app/api/portfolio/scan/route";
import { POST as resetPassword } from "@/app/api/auth/reset-password/route";

beforeEach(() => {
  vi.clearAllMocks();
  setRateLimitBackend(new MemoryBackend());
  m.auth.mockResolvedValue({ user: { id: "u1" } });
  m.yfSearch.mockResolvedValue({ quotes: [] });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/search", () => {
  const call = (q: string, ip = "198.51.100.1") =>
    search(new NextRequest(`https://example.test/api/search?q=${encodeURIComponent(q)}`, { headers: { "x-forwarded-for": ip } }));

  it("never sends empty or over-long queries upstream", async () => {
    expect(await (await call("")).json()).toEqual([]);
    expect(await (await call("x".repeat(61))).json()).toEqual([]);
    expect(m.yfSearch).not.toHaveBeenCalled();
  });

  it("allows 60 requests per minute per client, then 429s", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 62; i++) statuses.push((await call("tcs", "203.0.113.7")).status);
    expect(statuses.slice(0, 60).every((s) => s === 200)).toBe(true);
    expect(statuses[60]).toBe(429);
    expect((await call("tcs", "203.0.113.99")).status).toBe(200); // other clients unaffected
  });
});

describe("GET /api/ai-analysis/[ticker]", () => {
  const call = (userId = "u1") => {
    m.auth.mockResolvedValue({ user: { id: userId } });
    return aiAnalysis(new NextRequest("https://example.test/api/ai-analysis/TCS"), {
      params: Promise.resolve({ ticker: "TCS" }),
    });
  };

  it("serves cache hits without consuming the limit", async () => {
    m.cacheGet.mockReturnValue({ ticker: "TCS" });
    m.cacheWrap.mockImplementation(async (_k: string, _t: number, fn: () => unknown) => ({ ticker: "TCS", _meta: {} , fn: typeof fn }));
    for (let i = 0; i < 30; i++) expect((await call()).status).toBe(200);
  });

  it("limits cache misses per user (15/hour)", async () => {
    m.cacheGet.mockReturnValue(null);
    m.cacheWrap.mockResolvedValue({ ticker: "TCS", _meta: {} });
    const statuses: number[] = [];
    for (let i = 0; i < 17; i++) statuses.push((await call("heavy")).status);
    expect(statuses.slice(0, 15).every((s) => s === 200)).toBe(true);
    expect(statuses[15]).toBe(429);
    expect((await call("light")).status).toBe(200);
  });

  it("returns a generic error body, never the internal message", async () => {
    m.cacheGet.mockReturnValue({ ticker: "TCS" });
    m.cacheWrap.mockRejectedValue(new Error("connect ECONNREFUSED 10.1.2.3:5432 password=hunter2"));
    const res = await call();
    expect(res.status).toBe(500);
    const body = JSON.stringify(await res.json());
    expect(body).not.toContain("ECONNREFUSED");
    expect(body).not.toContain("hunter2");
  });
});

describe("POST /api/portfolio/scan", () => {
  const upload = (file: File | null, userId = "u1") => {
    m.auth.mockResolvedValue({ user: { id: userId } });
    const fd = new FormData();
    if (file) fd.append("file", file);
    return scan(new NextRequest("https://example.test/api/portfolio/scan", { method: "POST", body: fd }));
  };

  it("requires a session", async () => {
    m.auth.mockResolvedValue(null);
    const res = await scan(new NextRequest("https://example.test/api/portfolio/scan", { method: "POST", body: new FormData() }));
    expect(res.status).toBe(401);
  });

  it("rejects missing, empty and non-image uploads before any image processing", async () => {
    expect((await upload(null)).status).toBe(400);
    expect((await upload(new File([], "a.png", { type: "image/png" }))).status).toBe(400);
    expect((await upload(new File(["<svg/>"], "a.svg", { type: "image/svg+xml" }))).status).toBe(415);
    expect((await upload(new File(["MZ"], "a.exe", { type: "application/octet-stream" }))).status).toBe(415);
  });

  it("limits uploads to 10 per hour per user", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) statuses.push((await upload(new File(["x"], "a.svg", { type: "image/svg+xml" }), "scanner")).status);
    expect(statuses.slice(0, 10).every((s) => s === 415)).toBe(true); // reached validation
    expect(statuses[10]).toBe(429);
  });
});

describe("POST /api/auth/reset-password", () => {
  const call = (body: unknown) =>
    resetPassword(
      new NextRequest("https://example.test/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "192.0.2.77" },
        body: JSON.stringify(body),
      }),
    );

  it("rejects tokens that are not 64 hex characters without a database lookup", async () => {
    const res = await call({ token: "short", password: "longenough1" });
    expect(res.status).toBe(400);
  });

  it("is rate limited per IP", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) statuses.push((await call({ token: "bad", password: "longenough1" })).status);
    expect(statuses[statuses.length - 1]).toBe(429);
  });
});
