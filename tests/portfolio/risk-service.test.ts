import { describe, expect, it, vi } from "vitest";
import { MAX_RISK_HOLDINGS, buildPortfolioRisk, stressVolMultiplier } from "@/lib/portfolio/riskService";
import { synthBars, synthMarket } from "../ml/synth";

const m = synthMarket(700);
const market = { index: m.index, vix: m.vix };
const bars: Record<string, ReturnType<typeof synthBars>> = {
  "AAA.NS": synthBars(700, 21),
  "BBB.BO": synthBars(700, 22),
  "CCC.NS": synthBars(700, 23),
  "SHORT.NS": synthBars(40, 24),
};
const fetcher = vi.fn(async (s: string) => bars[s] ?? null);

describe("buildPortfolioRisk", () => {
  it("analyses usable holdings and reports every exclusion with a reason", async () => {
    const res = await buildPortfolioRisk(
      [
        { ticker: "AAA", quantity: 10, sector: "IT", exchange: "NSE" },
        { ticker: "BBB", quantity: 5, sector: "Banks", exchange: "NSE" }, // only on BSE -> fallback
        { ticker: "CCC", quantity: 0, sector: "IT", exchange: "NSE" },
        { ticker: "SHORT", quantity: 3, sector: "Auto", exchange: "NSE" },
        { ticker: "GHOST", quantity: 3, sector: "Auto", exchange: "NSE" },
      ],
      fetcher,
      market,
    );
    if ("error" in res) throw new Error("expected report");
    expect(res.report.holdings.map((h) => h.ticker)).toEqual(["AAA", "BBB"]);
    expect(Object.fromEntries(res.excluded.map((e) => [e.ticker, e.reason]))).toEqual({
      CCC: "quantity is not positive",
      SHORT: "insufficient price history",
      GHOST: "insufficient price history",
    });
    expect(fetcher).toHaveBeenCalledWith("BBB.BO", 8);
  });

  it("includes market, sector, volatility and both historical replay scenarios", async () => {
    const res = await buildPortfolioRisk([{ ticker: "AAA", quantity: 10, sector: "IT", exchange: "NSE" }], fetcher, market);
    if ("error" in res) throw new Error("expected report");
    expect(res.stress.map((s) => s.id)).toEqual(["market_-10", "sector_IT", "high_volatility", "covid_2020", "rates_2022"]);
    // synthetic data starts in 2020-01-01, so the 2020 replay window start is covered only partly or not at all
    for (const s of res.stress) if (s.portfolioReturn === null) expect(s.coverage).toBe(0);
  });

  it("produces a model-implied forward volatility with full coverage when every holding has a forecast", async () => {
    const res = await buildPortfolioRisk(
      [{ ticker: "AAA", quantity: 10, sector: "IT", exchange: "NSE" }, { ticker: "CCC", quantity: 7, sector: "IT", exchange: "NSE" }],
      fetcher,
      market,
    );
    if ("error" in res) throw new Error("expected report");
    expect(res.forecast.coverage).toBeCloseTo(1, 10);
    expect(res.forecast.dailyVol).toBeGreaterThan(0);
    expect(res.forecast.model).toMatch(/^volatility-ridge@/);
  });

  it("caps the number of analysed holdings and says so", async () => {
    const many = Array.from({ length: MAX_RISK_HOLDINGS + 2 }, () => ({ ticker: "AAA", quantity: 1, sector: "IT", exchange: "NSE" }));
    const res = await buildPortfolioRisk(many, fetcher, market);
    if ("error" in res) throw new Error("expected report");
    expect(res.excluded.filter((e) => /first 40/.test(e.reason))).toHaveLength(2);
  });

  it("returns an explicit error when nothing is usable", async () => {
    const res = await buildPortfolioRisk([{ ticker: "GHOST", quantity: 1, sector: "x", exchange: "NSE" }], fetcher, market);
    expect(res).toMatchObject({ error: "NO_USABLE_HOLDINGS" });
  });

  it("derives the stress volatility multiplier from regime history (> 1)", () => {
    const k = stressVolMultiplier();
    expect(k).toBeGreaterThan(1.5);
    expect(k).toBeLessThan(3);
  });
});
