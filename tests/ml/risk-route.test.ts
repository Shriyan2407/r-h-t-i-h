import { beforeEach, describe, expect, it, vi } from "vitest";
import { synthMarket } from "./synth";

const m = vi.hoisted(() => ({ auth: vi.fn(), fetchBars: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/ml/data", () => ({ INDEX_SYMBOL: "^NSEI", VIX_SYMBOL: "^INDIAVIX", fetchAdjustedBars: m.fetchBars }));

import { GET } from "@/app/api/ml/risk/[ticker]/route";
import { setRateLimitBackend, MemoryBackend } from "@/lib/ratelimit/limiter";

const market = synthMarket();
const call = (t: string, q = "") => GET(new Request(`https://x.test/api/ml/risk/${t}${q}`), { params: Promise.resolve({ ticker: t }) });

describe("GET /api/ml/risk/[ticker]", () => {
  beforeEach(() => {
    setRateLimitBackend(new MemoryBackend());
    m.auth.mockResolvedValue({ user: { id: "u1" } });
    m.fetchBars.mockImplementation(async (s: string) => (s === "^NSEI" ? market.index : s === "^INDIAVIX" ? market.vix : market.stock));
  });

  it("requires a session", async () => {
    m.auth.mockResolvedValue(null);
    expect((await call("TCS")).status).toBe(401);
  });

  it("rejects malformed tickers before fetching data", async () => {
    expect((await call("../etc")).status).toBe(400);
    expect(m.fetchBars).not.toHaveBeenCalled();
  });

  it("returns the contract with a request id, no direction and a grounded explanation", async () => {
    const res = await call("TCS");
    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBeTruthy();
    const body = await res.json();
    expect(body.schema).toBe("risk-forecast/1");
    expect(body.direction.available).toBe(false);
    expect(body.explanation.source).toBe("template");
  });

  it("reports missing market data honestly (503) instead of computing without it", async () => {
    m.fetchBars.mockImplementation(async (s: string) => (s === "^INDIAVIX" ? null : market.stock));
    const res = await call("TCS");
    expect(res.status).toBe(503);
    expect((await res.json()).reason).toBe("MARKET_DATA_UNAVAILABLE");
  });

  it("returns 422 with a reason for insufficient history", async () => {
    m.fetchBars.mockImplementation(async (s: string) => (s.startsWith("^") ? (s === "^NSEI" ? market.index : market.vix) : market.stock.slice(0, 50)));
    const res = await call("NEWIPO");
    expect(res.status).toBe(422);
    expect((await res.json()).reason).toBe("INSUFFICIENT_HISTORY");
  });

  it("falls back from NSE to BSE and 404s when neither has data", async () => {
    m.fetchBars.mockImplementation(async (s: string) => (s === "^NSEI" ? market.index : s === "^INDIAVIX" ? market.vix : null));
    expect((await call("NOPE")).status).toBe(404);
    expect(m.fetchBars).toHaveBeenCalledWith("NOPE.NS", 3);
    expect(m.fetchBars).toHaveBeenCalledWith("NOPE.BO", 3);
  });

  it("is rate limited per user", async () => {
    let last = 200;
    for (let i = 0; i < 61; i++) last = (await call("TCS")).status;
    expect(last).toBe(429);
  });
});
