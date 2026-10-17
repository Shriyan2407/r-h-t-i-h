import type { Bar } from "@/lib/backtest/types";
import type { DataLoaders, MacroSnapshot } from "@/lib/agents/context";
import type { FundamentalData } from "@/lib/types";
import type { NewsItem } from "@/lib/services/newsAggregator";

/** Deterministic daily bars: a drift plus a fixed oscillation, business days ending on `end`. */
export function trendBars(n: number, { start = 100, drift = 0.0005, wobble = 0.01, end = "2026-10-16", volume = 1_000_000 } = {}): Bar[] {
  const dates: string[] = [];
  const d = new Date(`${end}T00:00:00Z`);
  while (dates.length < n) {
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) dates.unshift(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() - 1);
  }
  let p = start;
  return dates.map((date, i) => {
    const r = drift + wobble * Math.sin(i * 0.7) * (i % 3 === 0 ? 1 : -0.6);
    const open = p;
    p = p * (1 + r);
    return { date, open, high: Math.max(open, p) * 1.004, low: Math.min(open, p) * 0.996, close: p, volume: volume * (1 + 0.2 * Math.cos(i)) };
  });
}

export const fundamentals = (over: Partial<FundamentalData> = {}): FundamentalData => ({
  pe_ratio: 24, forward_pe: 21, pb_ratio: 5, ps_ratio: 4, ev_ebitda: 15, sector_pe: null,
  roe: 22, roce: null, roa: 9, net_margin: 18, operating_margin: 24, gross_margin: 40,
  revenue_growth_yoy: 12, profit_growth_yoy: 15, eps_growth_3yr: null,
  debt_to_equity: 30, current_ratio: 1.8, quick_ratio: 1.4, interest_coverage: null, free_cash_flow: 9000,
  promoter_holding: 50, fii_holding: 20, dii_holding: null, pledged_shares: null,
  asset_turnover: null, inventory_turnover: null, receivables_turnover: null,
  ...over,
});

export const news = (over: Partial<NewsItem>[] = []): NewsItem[] =>
  over.map((o, i) => ({
    title: `Headline ${i + 1}`, summary: "", url: `https://example.com/${i + 1}`, source: "Economic Times Markets",
    publishedAt: "2026-10-16T08:00:00.000Z", ageHours: 10, relevance: 0.8, sentiment: "neutral", ...o,
  }));

export const macro = (over: Partial<MacroSnapshot> = {}): MacroSnapshot => ({
  fetched_at: "2026-10-17T06:00:00.000Z",
  regime: { type: "NEUTRAL", label: "Neutral", description: "", signalStrength: 20, inputs: 5 },
  pressure_score: 45,
  rbi_stance: "NEUTRAL",
  indices: { nifty50: { price: 25000, change_pct: 0.4, change_1w: 1.1, change_1m: 2.5 }, nifty_bank: null, india_vix: { price: 13.5, change_pct: -1 } },
  currency: { usd_inr: { price: 84.2, change_pct: 0.1 } },
  commodities: { crude_brent: { price: 78, change_pct: 0.5 }, gold: null },
  global: { sp500: { price: 6000, change_pct: 0.2, change_1m: 1.5 }, us_10y: { price: 4.2, change_pct: 0 } },
  sector_rotation: [{ sector: "IT", performance_1w: 2.1, signal: "ACCUMULATE" }, { sector: "Banking", performance_1w: -1.8, signal: "AVOID" }],
  macro_signals: [],
  risk_factors: ["No extreme macro stress signals at this time"],
  ...over,
} as unknown as MacroSnapshot);

export function loaders(over: Partial<DataLoaders> = {}): DataLoaders {
  return {
    stockBars: async (t) => ({ symbol: `${t}.NS`, bars: trendBars(800) }),
    marketBars: async (w) => (w === "index" ? trendBars(800, { start: 20000, drift: 0.0003, wobble: 0.006 }) : trendBars(800, { start: 14, drift: 0, wobble: 0.03 })),
    fundamentals: async () => fundamentals(),
    news: async () => news([{ title: "Company reports record quarterly profit", sentiment: "positive" }, { title: "Brokerage cuts target", sentiment: "negative", source: "Google News — NSE India" }]),
    macro: async () => macro(),
    holdings: async () => null,
    ...over,
  };
}
