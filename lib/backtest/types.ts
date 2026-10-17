export interface Bar {
  /** ISO date (YYYY-MM-DD) */
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Desired position after seeing bar `i` (decided from bars[0..i] only). 1 = long, 0 = flat. */
export type Position = 0 | 1;

export interface Strategy {
  id: string;
  label: string;
  /** Minimum bars needed before the strategy may emit a position. */
  warmup: number;
  /**
   * Returns the target position for each bar, using ONLY information available at that bar's
   * close. Output index i must depend on bars[0..i] and nothing later.
   */
  positions(bars: readonly Bar[]): Position[];
}

export interface CostModel {
  /** Commission + taxes per side, in basis points of traded value. */
  feeBps: number;
  /** Adverse price impact per side, in basis points. */
  slippageBps: number;
}

export interface Trade {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  /** Net return of the round trip after costs, as a fraction. */
  returnPct: number;
  bars: number;
}

export interface EquityPoint {
  date: string;
  equity: number;
}

export interface Metrics {
  totalReturn: number;
  cagr: number | null;
  sharpe: number | null;
  sortino: number | null;
  maxDrawdown: number;
  winRate: number | null;
  profitFactor: number | null;
  tradeCount: number;
  exposure: number;
}

export interface BacktestResult {
  kind: "BACKTEST_RESULT";
  strategyId: string;
  initialCapital: number;
  finalEquity: number;
  equity: EquityPoint[];
  benchmark: EquityPoint[];
  trades: Trade[];
  metrics: Metrics;
  benchmarkMetrics: Metrics;
  assumptions: string[];
}
