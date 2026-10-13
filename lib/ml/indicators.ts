/**
 * Causal indicator primitives for the ML feature pipeline.
 * Every function returns an array aligned to its input; output[i] depends only on input[0..i].
 * Positions without enough history are NaN (never 0), so missing data cannot masquerade as signal.
 */

export function ema(values: readonly number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  const k = 2 / (period + 1);
  let prev = NaN;
  let seen = 0;
  let seed = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (Number.isNaN(v)) continue;
    seen++;
    if (seen <= period) {
      seed += v;
      if (seen === period) {
        prev = seed / period;
        out[i] = prev;
      }
    } else {
      prev = v * k + prev * (1 - k);
      out[i] = prev;
    }
  }
  return out;
}

export function rollingMean(values: readonly number[], window: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  for (let i = window - 1; i < values.length; i++) {
    let s = 0;
    let ok = true;
    for (let j = i - window + 1; j <= i; j++) {
      const v = values[j];
      if (Number.isNaN(v)) { ok = false; break; }
      s += v;
    }
    if (ok) out[i] = s / window;
  }
  return out;
}

/** Sample standard deviation (n-1). */
export function rollingStd(values: readonly number[], window: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  for (let i = window - 1; i < values.length; i++) {
    let s = 0;
    let ok = true;
    for (let j = i - window + 1; j <= i; j++) {
      if (Number.isNaN(values[j])) { ok = false; break; }
      s += values[j];
    }
    if (!ok) continue;
    const m = s / window;
    let ss = 0;
    for (let j = i - window + 1; j <= i; j++) ss += (values[j] - m) ** 2;
    out[i] = Math.sqrt(ss / (window - 1));
  }
  return out;
}

export function rollingMax(values: readonly number[], window: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  for (let i = window - 1; i < values.length; i++) {
    let m = -Infinity;
    for (let j = i - window + 1; j <= i; j++) m = Math.max(m, values[j]);
    out[i] = m;
  }
  return out;
}

export function rollingMin(values: readonly number[], window: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  for (let i = window - 1; i < values.length; i++) {
    let m = Infinity;
    for (let j = i - window + 1; j <= i; j++) m = Math.min(m, values[j]);
    out[i] = m;
  }
  return out;
}

/** Simple (arithmetic) return over `lag` bars; NaN until `lag` bars exist. */
export function pctChange(values: readonly number[], lag: number): number[] {
  return values.map((v, i) => (i >= lag && values[i - lag] > 0 ? v / values[i - lag] - 1 : NaN));
}

/** Wilder smoothing seeded with the simple mean of the first `period` values. */
function wilder(values: readonly number[], period: number, startIdx: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  if (values.length < startIdx + period) return out;
  let s = 0;
  for (let i = startIdx; i < startIdx + period; i++) s += values[i];
  let prev = s / period;
  out[startIdx + period - 1] = prev;
  for (let i = startIdx + period; i < values.length; i++) {
    prev = (prev * (period - 1) + values[i]) / period;
    out[i] = prev;
  }
  return out;
}

export function trueRange(high: readonly number[], low: readonly number[], close: readonly number[]): number[] {
  return high.map((h, i) => (i === 0 ? h - low[i] : Math.max(h - low[i], Math.abs(h - close[i - 1]), Math.abs(low[i] - close[i - 1]))));
}

/** Average True Range (Wilder). First value at index `period`. */
export function atr(high: readonly number[], low: readonly number[], close: readonly number[], period = 14): number[] {
  return wilder(trueRange(high, low, close), period, 1);
}

/** ADX (Wilder). First value at index `2 * period`. */
export function adx(high: readonly number[], low: readonly number[], close: readonly number[], period = 14): number[] {
  const n = close.length;
  const plusDm = new Array<number>(n).fill(0);
  const minusDm = new Array<number>(n).fill(0);
  for (let i = 1; i < n; i++) {
    const up = high[i] - high[i - 1];
    const down = low[i - 1] - low[i];
    plusDm[i] = up > down && up > 0 ? up : 0;
    minusDm[i] = down > up && down > 0 ? down : 0;
  }
  const tr = trueRange(high, low, close);
  // Wilder sums (not means) so the DI ratios are scale-free.
  const sum = (arr: number[]) => {
    const out = new Array<number>(n).fill(NaN);
    if (n <= period) return out;
    let s = 0;
    for (let i = 1; i <= period; i++) s += arr[i];
    out[period] = s;
    for (let i = period + 1; i < n; i++) {
      s = s - s / period + arr[i];
      out[i] = s;
    }
    return out;
  };
  const sTr = sum(tr), sP = sum(plusDm), sM = sum(minusDm);
  const dx = new Array<number>(n).fill(NaN);
  for (let i = period; i < n; i++) {
    if (!(sTr[i] > 0)) continue;
    const pdi = (100 * sP[i]) / sTr[i];
    const mdi = (100 * sM[i]) / sTr[i];
    dx[i] = pdi + mdi === 0 ? 0 : (100 * Math.abs(pdi - mdi)) / (pdi + mdi);
  }
  return wilder(dx.map((v) => (Number.isNaN(v) ? 0 : v)), period, period).map((v, i) => (i < 2 * period ? NaN : v));
}
