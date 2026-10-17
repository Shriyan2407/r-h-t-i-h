import { describe, expect, it } from "vitest";
import { buildMoveAnswer, classifyMove } from "@/lib/research/move";
import { checkExplanation } from "@/lib/ai/numericGuard";
import type { Bar } from "@/lib/backtest/types";
import type { NewsItem } from "@/lib/services/newsAggregator";

const bars = (closes: number[], volumes?: number[]): Bar[] =>
  closes.map((c, i) => ({ date: `2026-09-${String(i + 1).padStart(2, "0")}`, open: c, high: c, low: c, close: c, volume: volumes?.[i] ?? 1000 }));
const flat = (n: number, last: number, base = 100) => [...Array.from({ length: n - 1 }, () => base), last];
const news = (title: string, ageHours = 5, sentiment: NewsItem["sentiment"] = "positive"): NewsItem =>
  ({ title, summary: "", url: "https://news.example/a", source: "Example News / RSS", publishedAt: "", ageHours, relevance: 1, sentiment });

const base = { ticker: "RELIANCE", symbol: "RELIANCE.NS", beta: 1.2, forecastDailyVol: 0.015, regime: "Calm uptrend", now: new Date("2026-09-25T12:00:00Z") };

describe("classifyMove", () => {
  it("separates market-driven, stock-specific, mixed and quiet moves", () => {
    expect(classifyMove(0.02, 0.018, 0.015)).toBe("MARKET_DRIVEN");
    expect(classifyMove(0.03, 0.004, 0.015)).toBe("STOCK_SPECIFIC");
    expect(classifyMove(0.03, -0.01, 0.015)).toBe("STOCK_SPECIFIC"); // against the market
    expect(classifyMove(0.03, 0.015, 0.015)).toBe("MIXED");
    expect(classifyMove(0.002, 0.001, 0.015)).toBe("QUIET");
  });
});

describe("buildMoveAnswer", () => {
  const vol = [...Array.from({ length: 24 }, () => 1000), 3000];
  const r = buildMoveAnswer({ ...base, stock: bars(flat(25, 103), vol), index: bars(flat(25, 101)), news: [news("Reliance wins 5 GW solar order worth Rs 12,000 crore"), news("Old story", 200)] });

  it("decomposes the move with beta and measures volume", () => {
    expect(r.summary.stockMove).toBeCloseTo(0.03, 12);
    expect(r.summary.indexMove).toBeCloseTo(0.01, 12);
    expect(r.summary.marketPart).toBeCloseTo(0.012, 12);
    expect(r.summary.specificPart).toBeCloseTo(0.018, 12);
    expect(r.summary.volumeRatio).toBeCloseTo(3, 12);
    expect(r.summary.moveVsForecast).toBeCloseTo(2, 12);
    expect(r.classification).toBe("MIXED");
  });

  it("keeps only recent headlines and never claims causation", () => {
    expect(r.headlines.map((h) => h.title)).toEqual(["Reliance wins 5 GW solar order worth Rs 12,000 crore"]);
    expect(r.answer.news).toMatch(/do not prove that any of them caused the move/);
  });

  it("the deterministic answer passes the numeric guard (every number comes from evidence)", () => {
    const text = Object.values(r.answer).join(" ");
    expect(checkExplanation(text, r.evidence).problems).toEqual([]);
  });

  it("prefers the live intraday change when available", () => {
    const live = buildMoveAnswer({ ...base, stock: bars(flat(25, 103)), index: bars(flat(25, 101)), news: [], liveChangePct: -1.5 });
    expect(live.summary.stockMove).toBeCloseTo(-0.015, 12);
    expect(live.evidence.find((e) => e.id === "M1")!.source).toMatch(/live quote/);
    expect(checkExplanation(Object.values(live.answer).join(" "), live.evidence).problems).toEqual([]);
  });

  it("degrades honestly without index data or headlines", () => {
    const none = buildMoveAnswer({ ...base, beta: null, stock: bars(flat(25, 99)), index: [], news: [] });
    expect(none.summary.marketPart).toBeNull();
    expect(none.answer.market).toMatch(/cannot be separated/);
    expect(none.answer.news).toMatch(/No headlines/);
    expect(checkExplanation(Object.values(none.answer).join(" "), none.evidence).problems).toEqual([]);
  });

  it("labels every evidence item with a source", () => {
    for (const e of r.evidence) expect(e.source.length).toBeGreaterThan(0);
  });
});
