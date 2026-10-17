import type { EquityPoint, Metrics, Trade } from "./types";

const TRADING_DAYS = 252;

function mean(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Worst peak-to-trough decline as a non-positive fraction. */
export function maxDrawdown(equity: readonly number[]): number {
  let peak = -Infinity;
  let worst = 0;
  for (const e of equity) {
    if (e > peak) peak = e;
    const dd = peak > 0 ? e / peak - 1 : 0;
    if (dd < worst) worst = dd;
  }
  return worst;
}

export function computeMetrics(
  equity: readonly EquityPoint[],
  trades: readonly Trade[],
  barsInMarket: number,
): Metrics {
  const values = equity.map((p) => p.equity);
  const n = values.length;
  const totalReturn = n > 1 ? values[n - 1] / values[0] - 1 : 0;

  const rets: number[] = [];
  for (let i = 1; i < n; i++) rets.push(values[i] / values[i - 1] - 1);

  let cagr: number | null = null;
  if (rets.length > 0) {
    const years = rets.length / TRADING_DAYS;
    cagr = values[n - 1] > 0 ? Math.pow(values[n - 1] / values[0], 1 / years) - 1 : null;
  }

  let sharpe: number | null = null;
  let sortino: number | null = null;
  if (rets.length >= 2) {
    const m = mean(rets);
    const variance = (mean(rets.map((r) => (r - m) ** 2)) * rets.length) / (rets.length - 1);
    const sd = Math.sqrt(variance);
    sharpe = sd > 1e-12 ? (m / sd) * Math.sqrt(TRADING_DAYS) : null; // risk-free rate = 0
    const downside = Math.sqrt(mean(rets.map((r) => Math.min(r, 0) ** 2)));
    sortino = downside > 1e-12 ? (m / downside) * Math.sqrt(TRADING_DAYS) : null;
  }

  const wins = trades.filter((t) => t.returnPct > 0);
  const grossWin = wins.reduce((a, t) => a + t.returnPct, 0);
  const grossLoss = trades.filter((t) => t.returnPct < 0).reduce((a, t) => a - t.returnPct, 0);

  return {
    totalReturn,
    cagr,
    sharpe,
    sortino,
    maxDrawdown: maxDrawdown(values),
    winRate: trades.length ? wins.length / trades.length : null,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : null,
    tradeCount: trades.length,
    exposure: rets.length ? barsInMarket / rets.length : 0,
  };
}
