import type { Bar } from "@/lib/backtest/types";
import { buildRiskForecast } from "@/lib/ml/riskForecast";
import regimes from "@/lib/ml/regimes.json";
import factorReference from "./factorReference.json";
import { FACTOR_LABELS, characteristics, factorExposures, type FactorExposure, type FactorReference, type FundamentalsSnapshot } from "./factors";
import {
  analyzePortfolio, historicalReplay, marketShock, sectorShock, volatilityShock,
  type HoldingInput, type PortfolioRiskReport, type StressResult,
} from "./risk";

export interface PortfolioHoldingRow extends HoldingInput {
  exchange: string;
}

export type BarFetcher = (symbol: string, years: number) => Promise<Bar[] | null>;
export type FundamentalsFetcher = (tickers: readonly string[]) => Promise<Record<string, FundamentalsSnapshot | null>>;

export const MAX_RISK_HOLDINGS = 40;
const HISTORY_YEARS = 8; // covers the 2020 and 2022 replay windows

/** Real windows replayed against today's weights. Dates are NIFTY 50 peak-to-trough points. */
export const HISTORICAL_SCENARIOS = [
  { id: "covid_2020", label: "COVID crash (Feb-Mar 2020)", from: "2020-01-17", to: "2020-03-23" },
  { id: "rates_2022", label: "2022 rate-hike sell-off", from: "2022-01-17", to: "2022-06-17" },
] as const;

/** Ratio of NIFTY volatility in 'Market stress' to its day-weighted average across all regimes. */
export function stressVolMultiplier(): number {
  const h = regimes.historical;
  const avg = h.reduce((s, r) => s + r.share * r.meanFwd5dVol, 0) / h.reduce((s, r) => s + r.share, 0);
  const stress = h.find((r) => r.regime === "Market stress");
  return stress ? stress.meanFwd5dVol / avg : 1;
}

async function inChunks<T, R>(items: readonly T[], size: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  return out;
}

export interface PortfolioRiskResponse {
  report: PortfolioRiskReport;
  excluded: Array<{ ticker: string; reason: string }>;
  stress: StressResult[];
  factors: {
    exposures: Array<FactorExposure & { name: string; high: string; low: string; definition: string }>;
    reference: { asOf: string; universe: string; count: number };
    method: string;
  };
  forecast: {
    /** Model-implied daily portfolio volatility for the next 5 trading days (forecast vols + historical correlations). */
    dailyVol: number | null;
    historicalDailyVol: number;
    coverage: number;
    model: string | null;
    method: string;
  };
}

export async function buildPortfolioRisk(
  rows: readonly PortfolioHoldingRow[],
  fetchBars: BarFetcher,
  market: { index: Bar[]; vix: Bar[] },
  fetchFundamentals: FundamentalsFetcher = async () => ({}),
): Promise<PortfolioRiskResponse | { error: "NO_USABLE_HOLDINGS"; excluded: Array<{ ticker: string; reason: string }> }> {
  const excluded: Array<{ ticker: string; reason: string }> = [];
  const capped = rows.slice(0, MAX_RISK_HOLDINGS);
  rows.slice(MAX_RISK_HOLDINGS).forEach((r) => excluded.push({ ticker: r.ticker, reason: `only the first ${MAX_RISK_HOLDINGS} holdings are analysed` }));

  const fetched = await inChunks(capped, 6, async (h) => {
    const primary = h.exchange === "BSE" ? `${h.ticker}.BO` : `${h.ticker}.NS`;
    const alt = h.exchange === "BSE" ? `${h.ticker}.NS` : `${h.ticker}.BO`;
    return { h, bars: (await fetchBars(primary, HISTORY_YEARS)) ?? (await fetchBars(alt, HISTORY_YEARS)) };
  });

  const usable: Array<{ h: PortfolioHoldingRow; bars: Bar[] }> = [];
  for (const f of fetched) {
    if (!(f.h.quantity > 0)) excluded.push({ ticker: f.h.ticker, reason: "quantity is not positive" });
    else if (!f.bars || f.bars.length < 61) excluded.push({ ticker: f.h.ticker, reason: "insufficient price history" });
    else usable.push({ h: f.h, bars: f.bars });
  }
  if (usable.length === 0) return { error: "NO_USABLE_HOLDINGS", excluded };

  const holdings = usable.map((u) => u.h);
  const bars = usable.map((u) => u.bars);
  const report = analyzePortfolio(holdings, bars, market.index);
  const weights = report.holdings.map((h) => h.weight);

  const topSector = report.sectors[0]?.sector;
  const stress: StressResult[] = [
    marketShock(report, -0.1),
    ...(topSector ? [sectorShock(report, topSector, -0.2)] : []),
    volatilityShock(report, stressVolMultiplier()),
    ...HISTORICAL_SCENARIOS.map((s) => historicalReplay(s.id, s.label, s.from, s.to, holdings, weights, bars)),
  ];

  // Style exposures vs the Nifty 50 cross-section (characteristics, not a returns-based model).
  const funds = await fetchFundamentals(holdings.map((h) => h.ticker)).catch(() => ({} as Record<string, FundamentalsSnapshot | null>));
  const ref = factorReference as FactorReference;
  const exposures = factorExposures(weights, usable.map((u) => characteristics(u.bars, funds[u.h.ticker] ?? null)), ref)
    .map((e) => ({ ...e, ...FACTOR_LABELS[e.factor] }));

  // Forward-looking: combine each holding's model forecast with the historical correlation matrix.
  const sigmas = usable.map((u) => {
    const r = buildRiskForecast({ ticker: u.h.ticker, symbol: u.h.ticker, stock: u.bars, index: market.index, vix: market.vix });
    return r.available ? { vol: r.contract.volatility.dailyVol, model: `${r.contract.model.id}@${r.contract.model.version}` } : null;
  });
  const coverage = sigmas.reduce((s, x, i) => s + (x ? weights[i] : 0), 0);
  let dailyVol: number | null = null;
  if (coverage > 0) {
    const C = report.correlation.matrix;
    let v = 0;
    for (let i = 0; i < sigmas.length; i++) for (let j = 0; j < sigmas.length; j++) {
      const si = sigmas[i], sj = sigmas[j];
      if (si && sj && Number.isFinite(C[i][j])) v += (weights[i] / coverage) * (weights[j] / coverage) * si.vol * sj.vol * C[i][j];
    }
    dailyVol = Math.sqrt(Math.max(v, 0));
  }

  return {
    report,
    excluded,
    stress,
    factors: {
      exposures,
      reference: { asOf: ref.asOf, universe: ref.universe, count: ref.count },
      method: "Each holding's characteristic is standardised against the Nifty 50 cross-section (z-score, capped at ±3) and value-weighted. 0 = like a typical index member. Describes holdings; not a forecast or a factor-return model.",
    },
    forecast: {
      dailyVol,
      historicalDailyVol: report.historical.annualVol / Math.sqrt(252),
      coverage,
      model: sigmas.find(Boolean)?.model ?? null,
      method: "Per-holding 5-day volatility forecasts combined with 1-year historical correlations (holdings without a forecast are excluded and the rest re-weighted).",
    },
  };
}
