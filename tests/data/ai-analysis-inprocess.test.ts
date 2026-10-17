import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest";
import { NextRequest } from "next/server";

/**
 * Regression: ai-analysis used to fetch /api/technicals, /api/fundamentals and /api/macro from
 * ITSELF over HTTP. Those calls carry no session (the auth proxy answers 401) and the base URL
 * defaulted to http://localhost:3000, so every stock got the placeholder "HOLD / insufficient
 * data" result. The services are now called in-process.
 */

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  getTechnicals: vi.fn(),
  getFundamentals: vi.fn(),
  getMacroIntelligence: vi.fn(),
  yfQuote: vi.fn(),
  getStockNews: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/services/technicals", () => ({ getTechnicals: m.getTechnicals }));
vi.mock("@/lib/services/fundamentals", () => ({ getFundamentals: m.getFundamentals }));
vi.mock("@/lib/services/macro", () => ({ getMacroIntelligence: m.getMacroIntelligence }));
vi.mock("@/lib/services/newsAggregator", () => ({ getStockNews: m.getStockNews }));
vi.mock("@/lib/ai/ollamaClient", () => ({
  getOllamaModel: async () => null, // no local LLM: exercise the deterministic path
  callOllama: async () => null,
}));
// Mirrors yahoo-finance2 v3.14: `quote` exists both as a static and on instances
// (verified against the real package), and different routes use either form.
vi.mock("yahoo-finance2", () => ({
  default: Object.assign(
    class {
      quote = m.yfQuote;
    },
    { quote: m.yfQuote },
  ),
}));

import { GET } from "@/app/api/ai-analysis/[ticker]/route";
import { cache } from "@/lib/services/cache";
import { MemoryBackend, setRateLimitBackend } from "@/lib/ratelimit/limiter";

const bullishTech = {
  rsi_14: 28, macd: 2, macd_signal: 1, macd_histogram: 1,
  ema_20: 110, ema_50: 105, ema_200: 100,
  bb_upper: 135, bb_middle: 115, bb_lower: 95, atr_14: 2, obv: 1000, adx: 30,
  stoch_k: 15, stoch_d: 12, vwap: 112, support_levels: [100], resistance_levels: [140],
  trend: "UPTREND", trend_strength: "STRONG",
};
const strongFund = {
  pe_ratio: 12, pb_ratio: 1.2, roe: 25, net_margin: 22, debt_to_equity: 0.2,
  revenue_growth_yoy: 18, free_cash_flow: 1_000_000, current_ratio: 2.5,
};

const call = (ticker: string) => {
  m.auth.mockResolvedValue({ user: { id: "u1" } });
  return GET(new NextRequest(`https://example.test/api/ai-analysis/${ticker}`), {
    params: Promise.resolve({ ticker }),
  });
};

let fetchSpy: MockInstance<typeof fetch>;

beforeEach(() => {
  vi.clearAllMocks();
  cache.flush();
  setRateLimitBackend(new MemoryBackend());
  delete process.env.ANTHROPIC_API_KEY; // no Claude: exercise the deterministic path
  m.yfQuote.mockResolvedValue({
    regularMarketPrice: 120, regularMarketChangePercent: 1.2,
    fiftyTwoWeekHigh: 130, fiftyTwoWeekLow: 80, marketCap: 3e12, longName: "Test Co",
  });
  m.getStockNews.mockResolvedValue([]);
  m.getMacroIntelligence.mockResolvedValue({ regime: { type: "NEUTRAL" } });
  fetchSpy = vi.spyOn(globalThis, "fetch");
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("GET /api/ai-analysis/[ticker] - in-process data", () => {
  it("scores real technicals and fundamentals instead of returning the placeholder HOLD", async () => {
    m.getTechnicals.mockResolvedValue(bullishTech);
    m.getFundamentals.mockResolvedValue(strongFund);

    const res = await call("AAA");
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(["BUY", "STRONG BUY"]).toContain(body.verdict.rating);
    expect(body.verdict.signal_strength).toBeGreaterThan(0);
    expect(body.verdict.probability).toBeNull();
    expect(m.getTechnicals).toHaveBeenCalledWith("AAA");
    expect(m.getFundamentals).toHaveBeenCalledWith("AAA");
  });

  it("makes NO HTTP request to its own API (the cause of the original defect)", async () => {
    m.getTechnicals.mockResolvedValue(bullishTech);
    m.getFundamentals.mockResolvedValue(strongFund);
    await call("BBB");
    const urls = fetchSpy.mock.calls.map((c) => String(c[0]));
    expect(urls.filter((u) => u.includes("/api/") || u.includes("localhost"))).toEqual([]);
  });

  it("falls back to an explicit zero-strength HOLD only when the data genuinely fails", async () => {
    m.getTechnicals.mockRejectedValue(new Error("yahoo down"));
    m.getFundamentals.mockRejectedValue(new Error("yahoo down"));

    const body = await (await call("CCC")).json();
    expect(body.verdict.rating).toBe("HOLD");
    expect(body.verdict.signal_strength).toBe(0);
    expect(body.verdict.probability).toBeNull();
  });

  it("still produces a verdict when fundamentals fail but technicals work", async () => {
    m.getTechnicals.mockResolvedValue(bullishTech);
    m.getFundamentals.mockRejectedValue(new Error("no fundamentals"));
    const body = await (await call("DDD")).json();
    expect(body.verdict.signal_strength).toBeGreaterThan(0);
  });
});
