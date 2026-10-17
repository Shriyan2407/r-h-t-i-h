/**
 * Feature engineering for the direction model. SINGLE SOURCE OF TRUTH: the training dataset and
 * live inference both call `computeFeatureMatrix`, so there is no train/serve skew.
 *
 * Point-in-time rule: the feature row for bar t may use only information available at the CLOSE
 * of bar t (bars 0..t of the stock, and index/VIX values dated <= t). Tests enforce this by
 * truncating the future and requiring identical rows.
 *
 * Scope: price, volume, index and India VIX only. Fundamentals, news sentiment and macro series
 * are NOT used because no point-in-time history exists in the data source; using today's values
 * for past dates would leak the future.
 */
import { rsi } from "@/lib/backtest/indicators";
import type { Bar } from "@/lib/backtest/types";
import { adx, atr, ema, pctChange, rollingMax, rollingMean, rollingMin, rollingStd } from "./indicators";

export const FEATURE_VERSION = "f1";

export const FEATURE_NAMES = [
  // price action
  "ret_1", "ret_5", "ret_10", "ret_20", "ret_60", "gap", "hl_range", "eff_ratio_20",
  "dd_252", "range_pos_252",
  // trend / momentum
  "rsi_14", "macd_hist", "close_ema20", "close_ema50", "sma50_sma200", "adx_14",
  // volatility
  "atr_pct", "bb_width", "rv_20", "rv_ratio_20_60",
  // volume
  "vol_ratio_5_20",
  // market
  "idx_ret_5", "idx_ret_20", "idx_vol_20", "idx_dd_252", "rel_str_20", "beta_60", "corr_60",
  // volatility regime (India VIX)
  "vix_level", "vix_chg_5",
] as const;

export type FeatureName = (typeof FEATURE_NAMES)[number];
export const MIN_BARS = 260; // 252-bar windows + indicator warm-up

/** Bars with prices rescaled by adjclose/close so splits and dividends do not create fake gaps. */
export interface AdjBar extends Bar {
  adjClose: number;
}

/** Apply the adjustment factor to O/H/L/C. Rows with a non-positive factor are dropped. */
export function toAdjustedBars(
  raw: ReadonlyArray<{ date: string; open: number; high: number; low: number; close: number; adjClose: number; volume: number }>,
): Bar[] {
  const out: Bar[] = [];
  for (const r of raw) {
    const f = r.adjClose / r.close;
    if (!(f > 0) || ![r.open, r.high, r.low, r.close, r.adjClose].every((x) => Number.isFinite(x) && x > 0)) continue;
    out.push({ date: r.date, open: r.open * f, high: r.high * f, low: r.low * f, close: r.adjClose, volume: r.volume || 0 });
  }
  return out;
}

/** Last known `ref` close dated <= each target date (forward-fill; NaN before the first print). Causal. */
export function alignClose(dates: readonly string[], ref: readonly Bar[]): number[] {
  const out = new Array<number>(dates.length).fill(NaN);
  let j = -1;
  for (let i = 0; i < dates.length; i++) {
    while (j + 1 < ref.length && ref[j + 1].date <= dates[i]) j++;
    if (j >= 0) out[i] = ref[j].close;
  }
  return out;
}

function logRatio(a: number, b: number) {
  return a > 0 && b > 0 ? Math.log(a / b) : NaN;
}

export interface FeatureMatrix {
  dates: string[];
  /** rows[i][k] is FEATURE_NAMES[k] at bar i; NaN when not computable. */
  rows: Float64Array[];
}

export function computeFeatureMatrix(stock: readonly Bar[], index: readonly Bar[], vix: readonly Bar[]): FeatureMatrix {
  const n = stock.length;
  const dates = stock.map((b) => b.date);
  const open = stock.map((b) => b.open);
  const high = stock.map((b) => b.high);
  const low = stock.map((b) => b.low);
  const close = stock.map((b) => b.close);
  const volume = stock.map((b) => b.volume);

  const f: Record<FeatureName, number[]> = {} as Record<FeatureName, number[]>;
  const set = (name: FeatureName, arr: number[]) => { f[name] = arr; };

  const ret1 = pctChange(close, 1);
  set("ret_1", ret1);
  set("ret_5", pctChange(close, 5));
  set("ret_10", pctChange(close, 10));
  set("ret_20", pctChange(close, 20));
  set("ret_60", pctChange(close, 60));
  set("gap", close.map((_, i) => (i > 0 ? open[i] / close[i - 1] - 1 : NaN)));
  set("hl_range", close.map((c, i) => (high[i] - low[i]) / c));

  // Kaufman efficiency ratio: net move / path length over 20 bars (trend cleanliness, 0..1).
  set("eff_ratio_20", close.map((c, i) => {
    if (i < 20) return NaN;
    let path = 0;
    for (let j = i - 19; j <= i; j++) path += Math.abs(close[j] - close[j - 1]);
    return path > 0 ? Math.abs(c - close[i - 20]) / path : 0;
  }));

  const max252 = rollingMax(close, 252);
  const min252 = rollingMin(close, 252);
  set("dd_252", close.map((c, i) => c / max252[i] - 1));
  set("range_pos_252", close.map((c, i) => (max252[i] > min252[i] ? (c - min252[i]) / (max252[i] - min252[i]) : NaN)));

  set("rsi_14", rsi(close, 14));
  const ema12 = ema(close, 12);
  const ema26 = ema(close, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signal = ema(macdLine, 9);
  set("macd_hist", close.map((c, i) => (macdLine[i] - signal[i]) / c));
  const ema20 = ema(close, 20);
  const ema50 = ema(close, 50);
  set("close_ema20", close.map((c, i) => c / ema20[i] - 1));
  set("close_ema50", close.map((c, i) => c / ema50[i] - 1));
  const sma50 = rollingMean(close, 50);
  const sma200 = rollingMean(close, 200);
  set("sma50_sma200", close.map((_, i) => sma50[i] / sma200[i] - 1));
  set("adx_14", adx(high, low, close, 14));

  const atr14 = atr(high, low, close, 14);
  set("atr_pct", close.map((c, i) => atr14[i] / c));
  const sd20 = rollingStd(close, 20);
  const m20 = rollingMean(close, 20);
  set("bb_width", close.map((_, i) => (4 * sd20[i]) / m20[i]));
  const rv20 = rollingStd(ret1, 20);
  const rv60 = rollingStd(ret1, 60);
  set("rv_20", rv20);
  set("rv_ratio_20_60", rv20.map((v, i) => v / rv60[i]));

  const v5 = rollingMean(volume, 5);
  const v20 = rollingMean(volume, 20);
  set("vol_ratio_5_20", v5.map((v, i) => logRatio(v, v20[i])));

  // Market features on an index series aligned (forward-filled) to the stock's dates.
  const idx = alignClose(dates, index);
  const idxRet1 = pctChange(idx, 1);
  const idxMax = rollingMax(idx, 252);
  const ret20 = f.ret_20;
  set("idx_ret_5", pctChange(idx, 5));
  set("idx_ret_20", pctChange(idx, 20));
  set("idx_vol_20", rollingStd(idxRet1, 20));
  set("idx_dd_252", idx.map((v, i) => v / idxMax[i] - 1));
  set("rel_str_20", ret20.map((v, i) => v - f.idx_ret_20[i]));
  const beta = new Array<number>(n).fill(NaN);
  const corr = new Array<number>(n).fill(NaN);
  for (let i = 60; i < n; i++) {
    let sx = 0, sy = 0, ok = true;
    for (let j = i - 59; j <= i; j++) {
      if (Number.isNaN(idxRet1[j]) || Number.isNaN(ret1[j])) { ok = false; break; }
      sx += idxRet1[j]; sy += ret1[j];
    }
    if (!ok) continue;
    const mx = sx / 60, my = sy / 60;
    let cov = 0, vx = 0, vy = 0;
    for (let j = i - 59; j <= i; j++) {
      const dx = idxRet1[j] - mx, dy = ret1[j] - my;
      cov += dx * dy; vx += dx * dx; vy += dy * dy;
    }
    if (vx > 0) beta[i] = cov / vx;
    if (vx > 0 && vy > 0) corr[i] = cov / Math.sqrt(vx * vy);
  }
  set("beta_60", beta);
  set("corr_60", corr);

  const vx = alignClose(dates, vix);
  set("vix_level", vx);
  set("vix_chg_5", pctChange(vx, 5));

  const rows: Float64Array[] = [];
  for (let i = 0; i < n; i++) {
    const row = new Float64Array(FEATURE_NAMES.length);
    for (let k = 0; k < FEATURE_NAMES.length; k++) {
      const v = f[FEATURE_NAMES[k]][i];
      row[k] = Number.isFinite(v) ? v : NaN;
    }
    rows.push(row);
  }
  return { dates, rows };
}

export function isCompleteRow(row: Float64Array): boolean {
  for (let k = 0; k < row.length; k++) if (Number.isNaN(row[k])) return false;
  return true;
}

/** Features for the most recent bar, or null when history/index/VIX is insufficient. */
export function latestFeatures(stock: readonly Bar[], index: readonly Bar[], vix: readonly Bar[]): { date: string; features: Float64Array } | null {
  if (stock.length < MIN_BARS) return null;
  const { dates, rows } = computeFeatureMatrix(stock, index, vix);
  const last = rows[rows.length - 1];
  return isCompleteRow(last) ? { date: dates[dates.length - 1], features: last } : null;
}
