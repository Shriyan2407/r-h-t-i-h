/** Display helpers. Undefined metrics render as "n/a", never as a misleading 0. */
export const NA = "n/a";

export function fmtPct(v: number | null | undefined, digits = 1): string {
  return v == null || !Number.isFinite(v) ? NA : `${(v * 100).toFixed(digits)}%`;
}

export function fmtRatio(v: number | null | undefined, digits = 2): string {
  return v == null || !Number.isFinite(v) ? NA : v.toFixed(digits);
}

export function fmtInr(v: number | null | undefined): string {
  return v == null || !Number.isFinite(v)
    ? NA
    : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
}

/** Thin an equity series for charting while always keeping the first and last points. */
export function downsample<T>(points: readonly T[], max = 400): T[] {
  if (points.length <= max) return [...points];
  const step = (points.length - 1) / (max - 1);
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(points[Math.round(i * step)]);
  return out;
}
