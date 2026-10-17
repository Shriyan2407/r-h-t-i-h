import type { Bar } from "@/lib/backtest/types";

/** Deterministic synthetic OHLCV (LCG) for reproducible tests. */
export function synthBars(n: number, seed: number, start = "2020-01-01", volScale = 0.04): Bar[] {
  let s = seed;
  let p = 100;
  const t0 = Date.parse(start);
  const bars: Bar[] = [];
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const r = (s / 4294967296 - 0.5) * volScale;
    s = (s * 1664525 + 1013904223) % 4294967296;
    const gap = (s / 4294967296 - 0.5) * volScale * 0.25;
    const open = p * (1 + gap);
    p = open * (1 + r);
    bars.push({
      date: new Date(t0 + i * 86400000).toISOString().slice(0, 10),
      open, close: p, high: Math.max(open, p) * 1.003, low: Math.min(open, p) * 0.997,
      volume: 1000 + ((s >> 8) % 500),
    });
  }
  return bars;
}

export function synthMarket(n = 600) {
  const stock = synthBars(n, 11);
  const index = synthBars(n, 12, "2020-01-01", 0.02);
  const vix = synthBars(n, 13).map((b) => ({ ...b, close: 12 + (b.close % 10) }));
  return { stock, index, vix };
}
