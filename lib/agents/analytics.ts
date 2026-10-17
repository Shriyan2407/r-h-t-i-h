/**
 * Pure quantitative primitives used by the agents. Every value is computed from adjusted daily bars with causal
 * formulas; anything that needs more history than is available is null, never a default.
 */
import type { Bar } from "@/lib/backtest/types";
import { rsi, sma } from "@/lib/backtest/indicators";
import { adx, atr, ema } from "@/lib/ml/indicators";

export interface TechnicalSnapshot {
  asOf: string;
  close: number;
  sma50: number | null;
  sma200: number | null;
  /** close / SMA200 - 1 */
  priceVsSma200: number | null;
  trend: "uptrend" | "downtrend" | "mixed" | "unknown";
  adx14: number | null;
  rsi14: number | null;
  macdHist: number | null;
  ret1m: number | null;
  ret3m: number | null;
  ret6m: number | null;
  /** 12-month return excluding the most recent month (the standard momentum definition). */
  ret12m1m: number | null;
  vol20Annual: number | null;
  atrPct: number | null;
  /** Average volume of the last 5 sessions / average of the prior 60. */
  volumeRatio: number | null;
  high52: number | null;
  low52: number | null;
  fromHigh52: number | null;
}

const last = (xs: readonly number[]) => {
  const v = xs[xs.length - 1];
  return Number.isFinite(v) ? v : null;
};
const ret = (c: readonly number[], lag: number) => (c.length > lag ? c[c.length - 1] / c[c.length - 1 - lag] - 1 : null);
const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function stdev(xs: readonly number[]): number {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

export function technicalSnapshot(bars: readonly Bar[]): TechnicalSnapshot | null {
  if (bars.length < 30) return null;
  const c = bars.map((b) => b.close);
  const h = bars.map((b) => b.high);
  const l = bars.map((b) => b.low);
  const v = bars.map((b) => b.volume);
  const close = c[c.length - 1];
  const sma50 = last(sma(c, 50));
  const sma200 = last(sma(c, 200));
  const trend: TechnicalSnapshot["trend"] =
    sma50 === null || sma200 === null ? "unknown"
      : close > sma200 && sma50 > sma200 ? "uptrend"
        : close < sma200 && sma50 < sma200 ? "downtrend"
          : "mixed";
  const ema12 = ema(c, 12), ema26 = ema(c, 26);
  const macd = c.map((_, i) => ema12[i] - ema26[i]);
  const signal = ema(macd, 9);
  const macdHist = last(macd.map((m, i) => m - signal[i]));
  const daily = c.slice(-21).map((x, i, a) => (i ? x / a[i - 1] - 1 : NaN)).slice(1);
  const year = bars.slice(-252);
  const atr14 = last(atr(h, l, c, 14));
  const recentVol = v.slice(-5), priorVol = v.slice(-65, -5);
  return {
    asOf: bars[bars.length - 1].date,
    close,
    sma50,
    sma200,
    priceVsSma200: sma200 ? close / sma200 - 1 : null,
    trend,
    adx14: last(adx(h, l, c, 14)),
    rsi14: last(rsi(c, 14)),
    macdHist,
    ret1m: ret(c, 21),
    ret3m: ret(c, 63),
    ret6m: ret(c, 126),
    ret12m1m: c.length > 252 ? c[c.length - 22] / c[c.length - 253] - 1 : null,
    vol20Annual: daily.length >= 20 ? stdev(daily) * Math.sqrt(252) : null,
    atrPct: atr14 !== null ? atr14 / close : null,
    volumeRatio: priorVol.length >= 40 && mean(priorVol) > 0 ? mean(recentVol) / mean(priorVol) : null,
    high52: year.length >= 200 ? Math.max(...year.map((b) => b.high)) : null,
    low52: year.length >= 200 ? Math.min(...year.map((b) => b.low)) : null,
    fromHigh52: year.length >= 200 ? close / Math.max(...year.map((b) => b.high)) - 1 : null,
  };
}

/** Daily returns of `stock` and `index` on dates both traded, over the last `lookback` common days. */
export function alignedReturns(stock: readonly Bar[], index: readonly Bar[], lookback = 252): { s: number[]; m: number[] } {
  const idx = new Map(index.map((b) => [b.date, b.close]));
  const pairs = stock.filter((b) => idx.has(b.date)).map((b) => [b.close, idx.get(b.date)!] as const).slice(-(lookback + 1));
  const s: number[] = [], m: number[] = [];
  for (let i = 1; i < pairs.length; i++) {
    s.push(pairs[i][0] / pairs[i - 1][0] - 1);
    m.push(pairs[i][1] / pairs[i - 1][1] - 1);
  }
  return { s, m };
}

export function betaAndCorrelation(stock: readonly Bar[], index: readonly Bar[], lookback = 252): { beta: number; correlation: number; n: number } | null {
  const { s, m } = alignedReturns(stock, index, lookback);
  if (s.length < 60) return null;
  const ms = mean(s), mm = mean(m);
  let cov = 0, vs = 0, vm = 0;
  for (let i = 0; i < s.length; i++) {
    cov += (s[i] - ms) * (m[i] - mm);
    vs += (s[i] - ms) ** 2;
    vm += (m[i] - mm) ** 2;
  }
  if (vm === 0 || vs === 0) return null;
  return { beta: cov / vm, correlation: cov / Math.sqrt(vs * vm), n: s.length };
}

/**
 * Descriptive study of the 200-day trend rule on this stock's own history: how often the next `horizon`-day
 * return was positive when price was above vs below its 200-day average, against the unconditional rate.
 * In-sample and with overlapping windows, so it describes the past; it is not a validated predictive accuracy.
 */
export function trendRuleStudy(bars: readonly Bar[], horizon = 20): { observations: number; upRateAbove: number | null; upRateBelow: number | null; baseRate: number } | null {
  const c = bars.map((b) => b.close);
  const s200 = sma(c, 200);
  let nA = 0, upA = 0, nB = 0, upB = 0;
  for (let i = 199; i + horizon < c.length; i++) {
    const up = c[i + horizon] > c[i];
    if (c[i] > s200[i]) { nA++; if (up) upA++; } else { nB++; if (up) upB++; }
  }
  const n = nA + nB;
  if (n < 120) return null;
  return { observations: n, upRateAbove: nA >= 30 ? upA / nA : null, upRateBelow: nB >= 30 ? upB / nB : null, baseRate: (upA + upB) / n };
}
