import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { NextAuthConfig } from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

type AuthorizedFn = NonNullable<NonNullable<NextAuthConfig["callbacks"]>["authorized"]>;
const authorized = authConfig.callbacks!.authorized as AuthorizedFn;

const run = async (path: string, loggedIn: boolean) => {
  const url = new URL(`https://example.test${path}`);
  return authorized({
    auth: loggedIn ? ({ user: { id: "u1" } } as never) : null,
    request: { nextUrl: url } as never,
  });
};

describe("middleware route access", () => {
  const publicApis = ["/api/auth/session", "/api/auth/callback/google", "/api/telegram/webhook", "/api/cron/market-alerts", "/api/health"];
  it.each(publicApis)("%s is reachable without a session (it does its own authentication)", async (path) => {
    expect(await run(path, false)).toBe(true);
  });

  const protectedApis = [
    "/api/intelligence/TCS",
    "/api/intelligence/stream/TCS",
    "/api/ai-analysis/TCS",
    "/api/search",
    "/api/admin/alerts",
    "/api/user/portfolio",
    "/api/telegram/connect",
  ];
  it.each(protectedApis)("%s returns 401 JSON without a session", async (path) => {
    const res = (await run(path, false)) as Response;
    expect(res).toBeInstanceOf(Response);
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("UNAUTHENTICATED");
  });

  it.each(protectedApis)("%s is allowed through when signed in", async (path) => {
    expect(await run(path, true)).toBe(true);
  });

  it("only the expected pages are public", async () => {
    for (const page of ["/", "/auth/login", "/auth/signup", "/auth/forgot-password", "/auth/reset-password", "/auth/verify-email", "/auth/error"]) {
      expect(await run(page, false)).toBe(true);
    }
    for (const page of ["/dashboard", "/portfolio", "/admin/alerts", "/stock/TCS"]) {
      const res = (await run(page, false)) as Response;
      expect(res.status).toBe(302); // redirect to login
      expect(res.headers.get("location")).toContain("/auth/login");
    }
  });
});

/* ───────────── intelligence route: only cache misses cost work ───────────── */

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  cacheGet: vi.fn(),
  getIntelligenceReport: vi.fn(),
}));
vi.mock("@/lib/auth/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/services/cache", () => ({ cache: { get: m.cacheGet } }));
vi.mock("@/lib/services/intelligenceEngine", () => ({
  getIntelligenceReport: m.getIntelligenceReport,
  generateIntelligence: vi.fn(),
}));

import { GET as intelligence } from "@/app/api/intelligence/[ticker]/route";
import { MemoryBackend, setRateLimitBackend } from "@/lib/ratelimit/limiter";

const call = (user = "u1") => {
  m.auth.mockResolvedValue({ user: { id: user } });
  return intelligence(new NextRequest("https://example.test/api/intelligence/TCS"), {
    params: Promise.resolve({ ticker: "TCS" }),
  });
};

describe("GET /api/intelligence/[ticker]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRateLimitBackend(new MemoryBackend());
    m.getIntelligenceReport.mockResolvedValue({ ticker: "TCS" });
  });

  it("never busts the cache (bustCache is not requested)", async () => {
    m.cacheGet.mockReturnValue(null);
    await call();
    expect(m.getIntelligenceReport).toHaveBeenCalledWith("TCS");
  });

  it("serves cache hits without consuming the rate limit", async () => {
    m.cacheGet.mockReturnValue({ ticker: "TCS" });
    for (let i = 0; i < 40; i++) expect((await call()).status).toBe(200);
  });

  it("rate limits cache misses per user", async () => {
    m.cacheGet.mockReturnValue(null);
    const statuses: number[] = [];
    for (let i = 0; i < 22; i++) statuses.push((await call("heavy-user")).status);
    expect(statuses.slice(0, 20).every((s) => s === 200)).toBe(true);
    expect(statuses[20]).toBe(429);
    // another user is unaffected
    expect((await call("other-user")).status).toBe(200);
  });
});
