/**
 * Real performance of TODAY's holdings over a recent window, vs NIFTY 50. Values come from actual daily closes.
 * This is "how the current portfolio would have moved", not the user's trading history (we do not know their past
 * trades). Only dates on which every included holding and the index traded are used.
 */
import type { Bar } from "@/lib/backtest/types";
import { alignSeries } from "./risk";

export interface PerformanceInput {
  ticker: string;
  quantity: number;
  bars: readonly Bar[];
}

export interface PerformanceSeries {
  dates: string[];
  /** Cumulative % change of the current holdings' value since the first date. */
  portfolio: number[];
  /** Cumulative % change of NIFTY 50 since the first date. */
  benchmark: number[];
  /** Holdings left out because their history does not cover the window. */
  excluded: string[];
  windowDays: number;
}

export function performanceSeries(holdings: readonly PerformanceInput[], index: readonly Bar[], days = 63): PerformanceSeries | null {
  const usable = holdings.filter((h) => h.quantity > 0 && h.bars.length > days);
  const excluded = holdings.filter((h) => !usable.includes(h)).map((h) => h.ticker);
  if (usable.length === 0) return null;
  const a = alignSeries(usable.map((h) => h.bars), index, days + 1);
  if (a.dates.length < 2) return null;
  const value = a.dates.map((_, t) => usable.reduce((s, h, k) => s + h.quantity * a.closes[k][t], 0));
  const pct = (xs: number[]) => xs.map((x) => (x / xs[0] - 1) * 100);
  return { dates: a.dates, portfolio: pct(value), benchmark: pct(a.index), excluded, windowDays: a.dates.length - 1 };
}
