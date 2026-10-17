import { describe, expect, it } from "vitest";
import { concentrationNotes, sectorAllocation, sortViews, summarize, toHoldingViews } from "@/features/portfolio/compute";
import { performanceSeries } from "@/lib/portfolio/performance";
import type { PortfolioHolding } from "@/store/portfolioStore";
import type { Bar } from "@/lib/backtest/types";

const h = (ticker: string, quantity: number, avgPrice: number, sector = "IT"): PortfolioHolding =>
  ({ id: ticker, ticker, name: ticker, exchange: "NSE", sector, quantity, avgPrice, addedAt: "2026-01-01" }) as PortfolioHolding;

describe("portfolio page calculations", () => {
  const holdings = [h("AAA", 10, 100), h("BBB", 5, 200, "Banks"), h("CCC", 1, 50)];
  const views = toHoldingViews(holdings, { AAA: { price: 120, change: 2, changePct: 1.69 }, BBB: { price: 180, change: -1, changePct: -0.55 } });

  it("never assumes the purchase price for an unpriced holding", () => {
    const c = views.find((v) => v.ticker === "CCC")!;
    expect(c.price).toBeNull();
    expect(c.pnl).toBeNull();
    expect(c.allocationPct).toBeNull();
  });

  it("computes value, P&L and allocation over priced holdings only", () => {
    const s = summarize(views);
    expect(s.pricedValue).toBe(1200 + 900);
    expect(s.pricedInvested).toBe(1000 + 1000);
    expect(s.totalPnl).toBe(100);
    expect(s.totalPnlPct).toBeCloseTo(5, 12);
    expect(s.dayPnl).toBe(20 - 5);
    expect(s.dayPnlPct).toBeCloseTo((15 / (2100 - 15)) * 100, 12);
    expect(s.unpriced).toEqual(["CCC"]);
    expect(views.find((v) => v.ticker === "AAA")!.allocationPct).toBeCloseTo((1200 / 2100) * 100, 12);
    expect(s.effectiveHoldings).toBeCloseTo(1 / ((1200 / 2100) ** 2 + (900 / 2100) ** 2), 10);
  });

  it("aggregates sectors and sorts unpriced holdings last", () => {
    const sec = sectorAllocation(views);
    expect(sec.map((x) => x.sector)).toEqual(["IT", "Banks"]);
    expect(sec[0].weight + sec[1].weight).toBeCloseTo(100, 10);
    expect(sortViews(views, "pnl", "desc").map((v) => v.ticker)).toEqual(["AAA", "BBB", "CCC"]);
    expect(sortViews(views, "pnl", "asc").map((v) => v.ticker)).toEqual(["BBB", "AAA", "CCC"]);
  });

  it("states concentration facts without giving advice", () => {
    const notes = concentrationNotes(summarize(views), sectorAllocation(views));
    expect(notes.join(" ")).toMatch(/AAA is 57\.1% of priced value/);
    expect(notes.join(" ")).toMatch(/No current price for CCC/);
    expect(notes.join(" ")).not.toMatch(/\b(?:consider|should|buy|sell|reduce|hold)\b/i);
  });
});

describe("performanceSeries", () => {
  const bars = (closes: number[]): Bar[] => closes.map((c, i) => ({ date: `2026-01-${String(i + 1).padStart(2, "0")}`, open: c, high: c, low: c, close: c, volume: 1 }));
  it("tracks the current holdings' value and the index from real closes", () => {
    const s = performanceSeries(
      [{ ticker: "A", quantity: 1, bars: bars([100, 110, 121, 121]) }, { ticker: "B", quantity: 2, bars: bars([50, 50, 50, 60]) }],
      bars([1000, 1010, 1020, 1030]),
      3,
    )!;
    expect(s.portfolio[0]).toBe(0);
    expect(s.portfolio.at(-1)).toBeCloseTo(((121 + 120) / 200 - 1) * 100, 10);
    expect(s.benchmark.at(-1)).toBeCloseTo(3, 10);
    expect(s.excluded).toEqual([]);
  });
  it("excludes holdings without enough history and returns null when none remain", () => {
    const s = performanceSeries([{ ticker: "NEW", quantity: 1, bars: bars([1, 2]) }, { ticker: "A", quantity: 1, bars: bars([1, 2, 3, 4]) }], bars([1, 1, 1, 1]), 3)!;
    expect(s.excluded).toEqual(["NEW"]);
    expect(performanceSeries([{ ticker: "NEW", quantity: 1, bars: bars([1, 2]) }], bars([1, 1, 1, 1]), 3)).toBeNull();
  });
});
