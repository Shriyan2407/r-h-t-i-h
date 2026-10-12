import YFClass                          from "yahoo-finance2";
import { cache, TTL }                  from "@/lib/services/cache";
import type { TechnicalIndicators }    from "@/lib/types";

/* yahoo-finance2 v3: default export is the class — must instantiate */
const yf = new (YFClass as any)();

/* ═══════════════════════════════════════════════════════════════
   R.H.T.I.H — Technical Analysis Engine (Next.js-native)
   Pure TypeScript. No Python. No external service.
   All indicators computed from yahoo-finance2 OHLCV data.
═══════════════════════════════════════════════════════════════ */

/* ── Pure-TS indicator functions ────────────────────────── */

/** Wilder-smoothed RSI */
function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d; else losses += -d;
  }
  let ag = gains / period, al = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    ag = (ag * (period - 1) + Math.max(d, 0)) / period;
    al = (al * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (al === 0) return 100;
  return parseFloat((100 - 100 / (1 + ag / al)).toFixed(2));
}

/** EMA series — returns array aligned to last (closes.length - period + 1) entries */
function calcEMAArr(closes: number[], period: number): number[] {
  if (closes.length < period) return [closes[closes.length - 1] ?? 0];
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const out: number[] = [ema];
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    out.push(ema);
  }
  return out;
}

/** Latest EMA value */
function ema(closes: number[], period: number): number {
  const arr = calcEMAArr(closes, period);
  return parseFloat((arr[arr.length - 1] ?? closes[closes.length - 1] ?? 0).toFixed(4));
}

/** MACD (12, 26, 9) */
function calcMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
  const e12 = calcEMAArr(closes, 12);
  const e26 = calcEMAArr(closes, 26);
  if (e12.length < 1 || e26.length < 1) return { macd: 0, signal: 0, histogram: 0 };

  // Align arrays by taking the last e26.length values from e12
  const len = Math.min(e12.length, e26.length);
  const macdLine = e12.slice(e12.length - len).map((v, i) => v - e26[e26.length - len + i]);

  const signalArr = calcEMAArr(macdLine, 9);
  const macdVal   = macdLine[macdLine.length - 1] ?? 0;
  const sigVal    = signalArr[signalArr.length - 1] ?? 0;
  return {
    macd:      parseFloat(macdVal.toFixed(4)),
    signal:    parseFloat(sigVal.toFixed(4)),
    histogram: parseFloat((macdVal - sigVal).toFixed(4)),
  };
}

/** Bollinger Bands (20-day, 2σ) */
function calcBB(closes: number[], period = 20): { upper: number; middle: number; lower: number } {
  const n    = Math.min(period, closes.length);
  const sl   = closes.slice(closes.length - n);
  const mid  = sl.reduce((a, b) => a + b, 0) / n;
  const std  = Math.sqrt(sl.reduce((a, b) => a + (b - mid) ** 2, 0) / n);
  return {
    upper:  parseFloat((mid + 2 * std).toFixed(2)),
    middle: parseFloat(mid.toFixed(2)),
    lower:  parseFloat((mid - 2 * std).toFixed(2)),
  };
}

/** ATR — Wilder average of true range */
function calcATR(highs: number[], lows: number[], closes: number[], period = 14): number {
  if (highs.length < 2) return 0;
  const trs: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    trs.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i]  - closes[i - 1]),
    ));
  }
  const sl = trs.slice(Math.max(0, trs.length - period));
  return parseFloat((sl.reduce((a, b) => a + b, 0) / sl.length).toFixed(2));
}

/** VWAP proxy (20-bar volume-weighted) */
function calcVWAP(closes: number[], volumes: number[]): number {
  const n  = Math.min(20, closes.length, volumes.length);
  const sc = closes.slice(closes.length - n);
  const sv = volumes.slice(volumes.length - n);
  const tv = sv.reduce((a, b) => a + b, 0);
  if (tv === 0) return closes[closes.length - 1] ?? 0;
  return parseFloat((sc.reduce((a, v, i) => a + v * sv[i], 0) / tv).toFixed(2));
}

/** OBV — running total */
function calcOBV(closes: number[], volumes: number[]): number {
  let obv = 0;
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1])      obv += volumes[i];
    else if (closes[i] < closes[i - 1]) obv -= volumes[i];
  }
  return Math.round(obv);
}

/** Simplified ADX (14) */
function calcADX(highs: number[], lows: number[], closes: number[], period = 14): number {
  if (highs.length < period + 1) return 25;
  const dms: { p: number; m: number }[] = [];
  const trs: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    const um = highs[i] - highs[i - 1];
    const dm = lows[i - 1] - lows[i];
    dms.push({
      p: um > dm && um > 0 ? um : 0,
      m: dm > um && dm > 0 ? dm : 0,
    });
    trs.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i]  - closes[i - 1]),
    ));
  }
  const sl   = trs.slice(-period);
  const slDM = dms.slice(-period);
  const avgTR = sl.reduce((a, b) => a + b, 0) / period;
  if (avgTR === 0) return 25;
  const pDI = (slDM.reduce((a, b) => a + b.p, 0) / period / avgTR) * 100;
  const mDI = (slDM.reduce((a, b) => a + b.m, 0) / period / avgTR) * 100;
  if (pDI + mDI === 0) return 25;
  return parseFloat((Math.abs(pDI - mDI) / (pDI + mDI) * 100).toFixed(2));
}

/** Stochastic %K and %D (14, 3) */
function calcStoch(
  highs: number[], lows: number[], closes: number[],
  k = 14, d = 3,
): { k: number; d: number } {
  if (closes.length < k) return { k: 50, d: 50 };
  const kVals: number[] = [];
  for (let i = k - 1; i < closes.length; i++) {
    const hi = Math.max(...highs.slice(i - k + 1, i + 1));
    const lo = Math.min(...lows.slice(i - k + 1, i + 1));
    kVals.push(hi === lo ? 50 : ((closes[i] - lo) / (hi - lo)) * 100);
  }
  const kVal = kVals[kVals.length - 1] ?? 50;
  const dSl  = kVals.slice(-d);
  const dVal = dSl.reduce((a, b) => a + b, 0) / dSl.length;
  return { k: parseFloat(kVal.toFixed(2)), d: parseFloat(dVal.toFixed(2)) };
}

/** Pivot-point support/resistance */
function calcSR(
  highs: number[], lows: number[], closes: number[],
): { support: number[]; resistance: number[] } {
  const last = closes[closes.length - 1];
  const rH   = highs[highs.length - 1]  ?? last;
  const rL   = lows[lows.length - 1]    ?? last;

  const pivot = (rH + rL + last) / 3;
  const r1 = 2 * pivot - rL;
  const r2 = pivot + (rH - rL);
  const s1 = 2 * pivot - rH;
  const s2 = pivot - (rH - rL);

  // Also include recent local highs/lows
  const recentH = [...highs.slice(-30)].sort((a, b) => b - a);
  const recentL = [...lows.slice(-30)].sort((a, b) => a - b);

  const resistance = [r1, r2, recentH[1], recentH[2]]
    .filter(v => v !== undefined && v > last * 1.005)
    .map(v => parseFloat(v.toFixed(2)))
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => a - b)
    .slice(0, 3);

  const support = [s1, s2, recentL[1], recentL[2]]
    .filter(v => v !== undefined && v < last * 0.995)
    .map(v => parseFloat(v.toFixed(2)))
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => b - a)
    .slice(0, 3);

  return { support, resistance };
}

/** Trend classification from EMA alignment */
function classifyTrend(
  closes: number[], e20: number, e50: number, e200: number,
): { trend: TechnicalIndicators["trend"]; trend_strength: TechnicalIndicators["trend_strength"] } {
  const last = closes[closes.length - 1];

  const bullScore =
    (last > e20  ? 1 : 0) +
    (last > e50  ? 1 : 0) +
    (last > e200 ? 1 : 0) +
    (e20  > e50  ? 1 : 0) +
    (e50  > e200 ? 1 : 0);

  if (bullScore >= 4) {
    const pctAbove = (last - e20) / e20 * 100;
    return {
      trend:          "UPTREND",
      trend_strength: pctAbove > 4 ? "STRONG" : pctAbove > 1.5 ? "MODERATE" : "WEAK",
    };
  }
  if (bullScore <= 1) {
    const pctBelow = (e20 - last) / e20 * 100;
    return {
      trend:          "DOWNTREND",
      trend_strength: pctBelow > 4 ? "STRONG" : pctBelow > 1.5 ? "MODERATE" : "WEAK",
    };
  }
  return { trend: "SIDEWAYS", trend_strength: "WEAK" };
}

/* ── Main calculation orchestrator ──────────────────────── */

export async function computeTechnicals(ticker: string): Promise<TechnicalIndicators> {
  const T    = ticker.toUpperCase();
  const syms = T.includes(".")
    ? [T]
    : [`${T}.NS`, `${T}.BO`];

  // Use chart() — the supported API in yahoo-finance2 v3+
  const from = new Date(Date.now() - 310 * 24 * 60 * 60 * 1000)
    .toISOString().split("T")[0]; // 310 days back = enough for EMA-200

  let rows: any[] = [];
  for (const s of syms) {
    try {
      const result = await yf.chart(s, { period1: from, interval: "1d" });
      const quotes  = result?.quotes ?? [];
      if (quotes.length > 20) { rows = quotes; break; }
    } catch { /* try next symbol */ }
  }

  if (rows.length < 5) throw new Error(`No OHLCV data for ${ticker}`);

  // Sort ascending by date
  rows.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // chart() returns adjclose (lowercase); historical returned adjClose
  const closes  = rows.map((r: any) => r.adjclose ?? r.close ?? 0).filter(Boolean) as number[];
  const highs   = rows.map((r: any) => r.high   ?? 0).filter(Boolean) as number[];
  const lows    = rows.map((r: any) => r.low    ?? 0).filter(Boolean) as number[];
  const volumes = rows.map((r: any) => r.volume ?? 0)                 as number[];

  const e20  = ema(closes, 20);
  const e50  = ema(closes, 50);
  const e200 = ema(closes, 200);

  const { macd, signal, histogram } = calcMACD(closes);
  const { upper, middle, lower }    = calcBB(closes);
  const { k, d }                    = calcStoch(highs, lows, closes);
  const { support, resistance }     = calcSR(highs, lows, closes);
  const { trend, trend_strength }   = classifyTrend(closes, e20, e50, e200);

  return {
    rsi_14:           calcRSI(closes),
    macd,
    macd_signal:      signal,
    macd_histogram:   histogram,
    ema_20:           e20,
    ema_50:           e50,
    ema_200:          e200,
    bb_upper:         upper,
    bb_middle:        middle,
    bb_lower:         lower,
    atr_14:           calcATR(highs, lows, closes),
    obv:              calcOBV(closes, volumes),
    adx:              calcADX(highs, lows, closes),
    stoch_k:          k,
    stoch_d:          d,
    vwap:             calcVWAP(closes, volumes),
    support_levels:   support,
    resistance_levels: resistance,
    trend,
    trend_strength,
  };
}

/* ── Route handler ──────────────────────────────────────── */

/** Cached (5 min) technicals for a validated ticker. Shared by the HTTP route and in-process callers. */
export function getTechnicals(ticker: string): Promise<TechnicalIndicators> {
  return cache.wrap(`technicals:${ticker}`, TTL.MARKET * 5, () => computeTechnicals(ticker));
}
