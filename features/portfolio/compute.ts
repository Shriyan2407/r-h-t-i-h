/**
 * Portfolio page calculations. Pure and tested. Only real inputs: saved holdings and quotes.
 * A holding without a quote has `price: null` and is EXCLUDED from value/P&L totals (reported as unpriced),
 * instead of silently assuming the purchase price.
 */
import type { PortfolioHolding } from "@/store/portfolioStore";

export interface Quote {
  price: number;
  change: number;
  changePct: number;
}

export interface HoldingView extends PortfolioHolding {
  price: number | null;
  changePct: number | null;
  investedValue: number;
  currentValue: number | null;
  pnl: number | null;
  pnlPct: number | null;
  dayPnl: number | null;
  /** Share of PRICED portfolio value (null when unpriced). */
  allocationPct: number | null;
}

export interface Summary {
  pricedValue: number;
  pricedInvested: number;
  totalPnl: number;
  totalPnlPct: number | null;
  dayPnl: number;
  dayPnlPct: number | null;
  holdings: number;
  unpriced: string[];
  gainers: number;
  losers: number;
  sectors: number;
  largestTicker: string | null;
  largestWeight: number | null;
  effectiveHoldings: number | null;
}

export function toHoldingViews(holdings: readonly PortfolioHolding[], quotes: Record<string, Quote | undefined>): HoldingView[] {
  const priced = holdings.map((h) => {
    const q = quotes[h.ticker];
    const price = q && Number.isFinite(q.price) && q.price > 0 ? q.price : null;
    const investedValue = h.quantity * h.avgPrice;
    const currentValue = price === null ? null : h.quantity * price;
    const pnl = currentValue === null ? null : currentValue - investedValue;
    return {
      ...h,
      price,
      changePct: price === null ? null : q!.changePct,
      investedValue,
      currentValue,
      pnl,
      pnlPct: pnl === null || investedValue <= 0 ? null : (pnl / investedValue) * 100,
      dayPnl: price === null ? null : h.quantity * q!.change,
      allocationPct: null as number | null,
    };
  });
  const total = priced.reduce((s, h) => s + (h.currentValue ?? 0), 0);
  return priced.map((h) => ({ ...h, allocationPct: h.currentValue === null || total <= 0 ? null : (h.currentValue / total) * 100 }));
}

export function summarize(views: readonly HoldingView[]): Summary {
  const priced = views.filter((v) => v.currentValue !== null);
  const pricedValue = priced.reduce((s, v) => s + v.currentValue!, 0);
  const pricedInvested = priced.reduce((s, v) => s + v.investedValue, 0);
  const totalPnl = pricedValue - pricedInvested;
  const dayPnl = priced.reduce((s, v) => s + (v.dayPnl ?? 0), 0);
  const prevValue = pricedValue - dayPnl;
  const weights = priced.map((v) => (v.allocationPct ?? 0) / 100);
  const hhi = weights.reduce((s, w) => s + w * w, 0);
  const largest = [...priced].sort((a, b) => (b.allocationPct ?? 0) - (a.allocationPct ?? 0))[0];
  return {
    pricedValue,
    pricedInvested,
    totalPnl,
    totalPnlPct: pricedInvested > 0 ? (totalPnl / pricedInvested) * 100 : null,
    dayPnl,
    dayPnlPct: prevValue > 0 ? (dayPnl / prevValue) * 100 : null,
    holdings: views.length,
    unpriced: views.filter((v) => v.currentValue === null).map((v) => v.ticker),
    gainers: priced.filter((v) => (v.pnl ?? 0) > 0).length,
    losers: priced.filter((v) => (v.pnl ?? 0) < 0).length,
    sectors: new Set(views.map((v) => v.sector || "Other")).size,
    largestTicker: largest?.ticker ?? null,
    largestWeight: largest?.allocationPct ?? null,
    effectiveHoldings: hhi > 0 ? 1 / hhi : null,
  };
}

export interface SectorSlice {
  sector: string;
  weight: number;
  value: number;
  pnlPct: number | null;
  holdings: number;
}

export function sectorAllocation(views: readonly HoldingView[]): SectorSlice[] {
  const m = new Map<string, { value: number; invested: number; n: number }>();
  for (const v of views) {
    if (v.currentValue === null) continue;
    const k = v.sector || "Other";
    const a = m.get(k) ?? { value: 0, invested: 0, n: 0 };
    a.value += v.currentValue;
    a.invested += v.investedValue;
    a.n += 1;
    m.set(k, a);
  }
  const total = [...m.values()].reduce((s, a) => s + a.value, 0);
  return [...m.entries()]
    .map(([sector, a]) => ({ sector, value: a.value, weight: total > 0 ? (a.value / total) * 100 : 0, pnlPct: a.invested > 0 ? ((a.value - a.invested) / a.invested) * 100 : null, holdings: a.n }))
    .sort((x, y) => y.weight - x.weight);
}

export type SortKey = "value" | "pnl" | "alloc" | "change";

/** Sort with unpriced holdings always last (their metrics are unknown, not zero). */
export function sortViews(views: readonly HoldingView[], key: SortKey, dir: "asc" | "desc"): HoldingView[] {
  const pick = (v: HoldingView) => (key === "value" ? v.currentValue : key === "pnl" ? v.pnlPct : key === "alloc" ? v.allocationPct : v.changePct);
  const d = dir === "desc" ? -1 : 1;
  return [...views].sort((a, b) => {
    const x = pick(a), y = pick(b);
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return (x - y) * d;
  });
}

/** Factual observations about concentration (no advice). */
export function concentrationNotes(s: Summary, slices: readonly SectorSlice[]): string[] {
  const notes: string[] = [];
  if (s.largestTicker && s.largestWeight !== null && s.largestWeight >= 30) notes.push(`${s.largestTicker} is ${s.largestWeight.toFixed(1)}% of priced value.`);
  if (slices[0] && slices[0].weight >= 50) notes.push(`${slices[0].sector} is ${slices[0].weight.toFixed(0)}% of priced value.`);
  if (s.effectiveHoldings !== null && s.holdings >= 2) notes.push(`Equivalent to about ${s.effectiveHoldings.toFixed(1)} equally weighted holdings.`);
  if (s.unpriced.length) notes.push(`No current price for ${s.unpriced.join(", ")}; excluded from totals.`);
  return notes;
}
