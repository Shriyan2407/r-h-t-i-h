/**
 * Portfolio risk analytics. Pure functions over aligned daily data; no network, no LLM.
 *
 * Conventions (stated in every response so users can interpret the numbers):
 *  - Weights are CURRENT market-value weights held constant over the look-back ("constant-weight" history).
 *    This measures the risk of today's portfolio, not the user's historical P&L.
 *  - Daily simple returns; annualisation uses 252 trading days; risk-free rate 0.
 *  - Historical statistics describe the past. Stress tests are scenarios, not forecasts.
 */
import type { Bar } from "@/lib/backtest/types";

export const TRADING_DAYS = 252;

export interface HoldingInput {
  ticker: string;
  quantity: number;
  sector: string;
}

export interface AlignedSeries {
  dates: string[];
  /** closes[k][t] for holding k on dates[t] */
  closes: number[][];
  index: number[];
}

/** Intersect dates across all holdings and the index (no forward-fill: only days every series traded). */
export function alignSeries(holdingBars: readonly (readonly Bar[])[], index: readonly Bar[], lookback = TRADING_DAYS + 1): AlignedSeries {
  const maps = holdingBars.map((bs) => new Map(bs.map((b) => [b.date, b.close])));
  const idx = new Map(index.map((b) => [b.date, b.close]));
  const common = [...idx.keys()].filter((d) => maps.every((m) => m.has(d))).sort().slice(-lookback);
  return {
    dates: common,
    closes: maps.map((m) => common.map((d) => m.get(d) as number)),
    index: common.map((d) => idx.get(d) as number),
  };
}

export function returns(prices: readonly number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < prices.length; i++) r.push(prices[i] / prices[i - 1] - 1);
  return r;
}

const mean = (x: readonly number[]) => x.reduce((a, b) => a + b, 0) / x.length;

export function covariance(a: readonly number[], b: readonly number[]): number {
  const ma = mean(a), mb = mean(b);
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - ma) * (b[i] - mb);
  return s / (a.length - 1);
}

export function covMatrix(series: readonly (readonly number[])[]): number[][] {
  return series.map((a) => series.map((b) => covariance(a, b)));
}

export function corrMatrix(cov: readonly (readonly number[])[]): number[][] {
  return cov.map((row, i) => row.map((c, j) => (cov[i][i] > 0 && cov[j][j] > 0 ? c / Math.sqrt(cov[i][i] * cov[j][j]) : NaN)));
}

export function maxDrawdown(rets: readonly number[]): number {
  let eq = 1, peak = 1, worst = 0;
  for (const r of rets) {
    eq *= 1 + r;
    peak = Math.max(peak, eq);
    worst = Math.min(worst, eq / peak - 1);
  }
  return worst;
}

/** Empirical 1-day Value-at-Risk at `level` (e.g. 0.95), returned as a positive loss fraction. */
export function historicalVaR(rets: readonly number[], level = 0.95): number {
  const s = [...rets].sort((a, b) => a - b);
  const k = Math.max(0, Math.floor((1 - level) * s.length) - 1);
  return -s[k];
}

/** Herfindahl index of weights and the "effective number of holdings" 1/HHI. */
export function concentration(weights: readonly number[]) {
  const hhi = weights.reduce((a, w) => a + w * w, 0);
  const sorted = [...weights].sort((a, b) => b - a);
  return { hhi, effectiveHoldings: hhi > 0 ? 1 / hhi : 0, topWeight: sorted[0] ?? 0, top5Weight: sorted.slice(0, 5).reduce((a, b) => a + b, 0) };
}

/** Euler risk contributions: share of portfolio variance from each holding. Sums to 1. */
export function riskContributions(weights: readonly number[], cov: readonly (readonly number[])[]): number[] {
  const sw = cov.map((row) => row.reduce((a, c, j) => a + c * weights[j], 0));
  const variance = weights.reduce((a, w, i) => a + w * sw[i], 0);
  return weights.map((w, i) => (variance > 0 ? (w * sw[i]) / variance : 0));
}

export interface StressResult {
  id: string;
  label: string;
  method: string;
  /** Estimated portfolio return in the scenario (fraction), or null when not computable. */
  portfolioReturn: number | null;
  coverage: number;
  notes?: string;
}

export interface PortfolioRiskReport {
  asOf: string;
  observations: number;
  totalValue: number;
  holdings: Array<{
    ticker: string; sector: string; value: number; weight: number; annualVol: number; beta: number;
    riskContribution: number; avgDailyValue: number | null; daysToLiquidate: number | null;
  }>;
  concentration: ReturnType<typeof concentration>;
  sectors: Array<{ sector: string; weight: number }>;
  historical: {
    annualVol: number; beta: number; correlationToIndex: number; maxDrawdown: number;
    sharpe: number | null; sortino: number | null; var95: number; diversificationRatio: number; avgPairwiseCorrelation: number | null;
  };
  correlation: { tickers: string[]; matrix: number[][] };
  conventions: string[];
}

export function analyzePortfolio(
  holdings: readonly HoldingInput[],
  holdingBars: readonly (readonly Bar[])[],
  index: readonly Bar[],
  opts: { participation?: number } = {},
): PortfolioRiskReport {
  if (holdings.length === 0) throw new Error("no holdings");
  const a = alignSeries(holdingBars, index);
  if (a.dates.length < 61) throw new Error(`only ${a.dates.length} common trading days; need at least 61`);

  const last = a.dates.length - 1;
  const values = holdings.map((h, k) => h.quantity * a.closes[k][last]);
  const total = values.reduce((x, y) => x + y, 0);
  const w = values.map((v) => v / total);

  const rets = a.closes.map(returns);
  const idxRet = returns(a.index);
  const cov = covMatrix(rets);
  const corr = corrMatrix(cov);
  const port = idxRet.map((_, t) => rets.reduce((s, r, k) => s + w[k] * r[t], 0));

  const varIdx = covariance(idxRet, idxRet);
  const pSd = Math.sqrt(covariance(port, port));
  const downside = Math.sqrt(mean(port.map((r) => Math.min(r, 0) ** 2)));
  const m = mean(port);
  const rc = riskContributions(w, cov);
  const indivSd = cov.map((row, i) => Math.sqrt(row[i]));

  let pairSum = 0, pairs = 0;
  for (let i = 0; i < corr.length; i++) for (let j = i + 1; j < corr.length; j++) if (Number.isFinite(corr[i][j])) { pairSum += corr[i][j]; pairs++; }

  const participation = opts.participation ?? 0.1;
  const rows = holdings.map((h, k) => {
    const bars = holdingBars[k].slice(-20);
    const adv = bars.length ? mean(bars.map((b) => b.close * b.volume)) : 0;
    return {
      ticker: h.ticker,
      sector: h.sector,
      value: values[k],
      weight: w[k],
      annualVol: indivSd[k] * Math.sqrt(TRADING_DAYS),
      beta: varIdx > 0 ? covariance(rets[k], idxRet) / varIdx : NaN,
      riskContribution: rc[k],
      avgDailyValue: adv > 0 ? adv : null,
      daysToLiquidate: adv > 0 ? values[k] / (participation * adv) : null,
    };
  });

  const sectorMap = new Map<string, number>();
  rows.forEach((r) => sectorMap.set(r.sector, (sectorMap.get(r.sector) ?? 0) + r.weight));

  return {
    asOf: a.dates[last],
    observations: port.length,
    totalValue: total,
    holdings: rows,
    concentration: concentration(w),
    sectors: [...sectorMap.entries()].map(([sector, weight]) => ({ sector, weight })).sort((x, y) => y.weight - x.weight),
    historical: {
      annualVol: pSd * Math.sqrt(TRADING_DAYS),
      beta: varIdx > 0 ? covariance(port, idxRet) / varIdx : NaN,
      correlationToIndex: pSd > 0 && varIdx > 0 ? covariance(port, idxRet) / (pSd * Math.sqrt(varIdx)) : NaN,
      maxDrawdown: maxDrawdown(port),
      sharpe: pSd > 0 ? (m / pSd) * Math.sqrt(TRADING_DAYS) : null,
      sortino: downside > 0 ? (m / downside) * Math.sqrt(TRADING_DAYS) : null,
      var95: historicalVaR(port, 0.95),
      diversificationRatio: pSd > 0 ? w.reduce((s, x, i) => s + x * indivSd[i], 0) / pSd : NaN,
      avgPairwiseCorrelation: pairs ? pairSum / pairs : null,
    },
    correlation: { tickers: holdings.map((h) => h.ticker), matrix: corr },
    conventions: [
      `Current weights held constant over the last ${port.length} common trading days (risk of today's portfolio, not your past P&L).`,
      "Daily returns; annualised with 252 days; risk-free rate 0. Historical figures describe the past, not the future.",
      `Days to liquidate assume selling ${Math.round(participation * 100)}% of the 20-day average traded value per day.`,
    ],
  };
}

/** Beta-based market shock: linear approximation sum(w_i * beta_i) * shock. */
export function marketShock(report: PortfolioRiskReport, shock: number): StressResult {
  const b = report.holdings.reduce((s, h) => s + h.weight * (Number.isFinite(h.beta) ? h.beta : 1), 0);
  return {
    id: `market_${Math.round(shock * 100)}`,
    label: `NIFTY 50 ${shock < 0 ? "falls" : "rises"} ${Math.abs(shock * 100)}%`,
    method: "Each holding moves by its 1-year beta times the index move (linear approximation; ignores stock-specific news).",
    portfolioReturn: b * shock,
    coverage: 1,
  };
}

/** Shock one sector by `shock`; other holdings unchanged. */
export function sectorShock(report: PortfolioRiskReport, sector: string, shock: number): StressResult {
  const wSector = report.holdings.filter((h) => h.sector === sector).reduce((s, h) => s + h.weight, 0);
  return {
    id: `sector_${sector}`,
    label: `${sector} falls ${Math.abs(shock * 100)}%`,
    method: "Holdings in the sector fall by the shock; all other holdings unchanged (no contagion assumed).",
    portfolioReturn: wSector === 0 ? 0 : wSector * shock, // avoid -0 (renders as "-0.0%")
    coverage: 1,
  };
}

/** Volatility shock: scale historical 1-day VaR by a stress multiplier derived from regime history. */
export function volatilityShock(report: PortfolioRiskReport, multiplier: number): StressResult {
  return {
    id: "high_volatility",
    label: "High-volatility regime",
    method: `Historical 1-day 95% VaR scaled by ${multiplier.toFixed(2)}, the ratio of NIFTY volatility in 'Market stress' to its average across all regimes (2011-2026).`,
    portfolioReturn: -report.historical.var95 * multiplier,
    coverage: 1,
    notes: "A one-day loss that would be exceeded about 1 day in 20 under stressed conditions.",
  };
}

/** Replay an actual historical window using each holding's own return over it. Holdings without data are excluded. */
export function historicalReplay(
  id: string,
  label: string,
  from: string,
  to: string,
  holdings: readonly HoldingInput[],
  weights: readonly number[],
  longBars: readonly (readonly Bar[])[],
): StressResult {
  let covered = 0, ret = 0;
  holdings.forEach((_, k) => {
    const bs = longBars[k];
    const start = [...bs].reverse().find((b) => b.date <= from);
    const end = [...bs].reverse().find((b) => b.date <= to);
    if (start && end && end.date > start.date && bs[0].date <= from) {
      covered += weights[k];
      ret += weights[k] * (end.close / start.close - 1);
    }
  });
  return {
    id,
    label,
    method: `Each holding's actual price change from ${from} to ${to}, applied to today's weights.`,
    portfolioReturn: covered > 0 ? ret / covered : null,
    coverage: covered,
    notes: covered < 0.999 ? `Only ${(covered * 100).toFixed(0)}% of the portfolio has price history covering this period; the result is rescaled to that part.` : undefined,
  };
}
