import { describe, it, expect } from "vitest";
import { rankMovers } from "@/lib/services/marketSnapshot";
import { fmtDailyBriefing } from "@/lib/services/telegramService";

describe("rankMovers", () => {
  it("ranks gainers and losers from real quotes and strips the exchange suffix", () => {
    const { gainers, losers } = rankMovers([
      { symbol: "AAA.NS", regularMarketChangePercent: 2.5 },
      { symbol: "BBB.NS", regularMarketChangePercent: -3.1 },
      { symbol: "CCC.NS", regularMarketChangePercent: 0.4 },
      { symbol: "DDD.NS", regularMarketChangePercent: -0.2 },
    ]);
    expect(gainers.map((g) => g.ticker)).toEqual(["AAA", "CCC"]);
    expect(losers.map((l) => l.ticker)).toEqual(["BBB", "DDD"]);
  });
  it("ignores quotes without a symbol or a numeric change", () => {
    const { gainers, losers } = rankMovers([
      { symbol: "AAA.NS" },
      { regularMarketChangePercent: 5 },
      { symbol: "ZZZ.NS", regularMarketChangePercent: Number.NaN },
    ]);
    // NaN is neither > 0 nor < 0, so it never ranks as a mover.
    expect(gainers).toEqual([]);
    expect(losers).toEqual([]);
  });
  it("returns empty lists when there is no data", () => {
    expect(rankMovers([])).toEqual({ gainers: [], losers: [] });
  });
});

describe("fmtDailyBriefing", () => {
  it("renders only the sections it has real data for", () => {
    const msg = fmtDailyBriefing({
      date: "Mon, 1 Jan 2026",
      nifty: { price: 25000, change: 0.5 },
      topGainers: [],
      topLosers: [],
    });
    expect(msg).toContain("NIFTY 50");
    expect(msg).not.toContain("BANKNIFTY");
    expect(msg).not.toContain("USD/INR");
    expect(msg).not.toContain("MOVERS");
  });
  it("contains none of the previously fabricated content", () => {
    const msg = fmtDailyBriefing({
      date: "d",
      nifty: { price: 25000, change: 0.5 },
      topGainers: [],
      topLosers: [],
    });
    for (const fake of ["AI PICKS", "RISK LEVEL", "FII:", "DII:", "83.50", "Await breakout"]) {
      expect(msg).not.toContain(fake);
    }
  });
});
