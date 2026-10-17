/**
 * Supervised dataset construction.
 *
 * Target: `label = 1` when the NET-OF-NOTHING gross return of a 5-trading-day hold is positive,
 * where the hold is entered at the OPEN of bar t+1 (the first tradable price after the close-of-t
 * decision) and exited at the CLOSE of bar t+5. This matches the backtester's execution rule, so
 * a model that predicts this label is predicting something a user could actually have traded.
 *
 * Because consecutive labels share 4 of 5 days, adjacent rows are NOT independent. Any train/test
 * split must purge at least HORIZON rows around the boundary (see ml/train.py and the tests).
 */
import type { Bar } from "@/lib/backtest/types";
import { FEATURE_NAMES, FEATURE_VERSION, computeFeatureMatrix, isCompleteRow } from "./features";

export const HORIZON = 5;
export const TARGET_NAME = "pos_ret_5d";

export interface DatasetRow {
  ticker: string;
  /** Decision date: features use data up to this bar's close. */
  date: string;
  /** Date the label's exit price is observed. Always > date. */
  exitDate: string;
  features: number[];
  /** Realised gross return of the 5-day hold (entry open t+1, exit close t+5). Not a feature. */
  fwdRet: number;
  /**
   * Realised volatility over the label window: sqrt(mean(r^2)) of the 5 daily close-to-close
   * returns t+1..t+5. Target of the volatility model. Not a feature.
   */
  fwdRv5: number;
  label: 0 | 1;
}

export function buildDatasetRows(ticker: string, stock: readonly Bar[], index: readonly Bar[], vix: readonly Bar[]): DatasetRow[] {
  const { dates, rows } = computeFeatureMatrix(stock, index, vix);
  const out: DatasetRow[] = [];
  for (let t = 0; t + HORIZON < stock.length; t++) {
    if (!isCompleteRow(rows[t])) continue;
    const entry = stock[t + 1].open;
    const exit = stock[t + HORIZON].close;
    if (!(entry > 0) || !(exit > 0)) continue;
    const fwdRet = exit / entry - 1;
    let sq = 0;
    for (let k = 1; k <= HORIZON; k++) sq += (stock[t + k].close / stock[t + k - 1].close - 1) ** 2;
    const fwdRv5 = Math.sqrt(sq / HORIZON);
    out.push({
      ticker,
      date: dates[t],
      exitDate: dates[t + HORIZON],
      features: Array.from(rows[t]),
      fwdRet,
      fwdRv5,
      label: fwdRet > 0 ? 1 : 0,
    });
  }
  return out;
}

export const CSV_HEADER = ["ticker", "date", "exit_date", ...FEATURE_NAMES, "fwd_ret", "fwd_rv5", "label"];

export function rowsToCsv(rows: readonly DatasetRow[]): string {
  const lines = [CSV_HEADER.join(",")];
  for (const r of rows) {
    lines.push([r.ticker, r.date, r.exitDate, ...r.features.map((v) => v.toPrecision(10)), r.fwdRet.toPrecision(10), r.fwdRv5.toPrecision(10), r.label].join(","));
  }
  return lines.join("\n") + "\n";
}

export interface DatasetMeta {
  featureVersion: string;
  target: string;
  horizonBars: number;
  features: readonly string[];
  rows: number;
  tickers: number;
  firstDate: string;
  lastDate: string;
  positiveRate: number;
}

export function describeDataset(rows: readonly DatasetRow[]): DatasetMeta {
  const dates = rows.map((r) => r.date).sort();
  return {
    featureVersion: FEATURE_VERSION,
    target: TARGET_NAME,
    horizonBars: HORIZON,
    features: FEATURE_NAMES,
    rows: rows.length,
    tickers: new Set(rows.map((r) => r.ticker)).size,
    firstDate: dates[0] ?? "",
    lastDate: dates[dates.length - 1] ?? "",
    positiveRate: rows.length ? rows.reduce((a, r) => a + r.label, 0) / rows.length : 0,
  };
}

/**
 * Integrity checks used by tests and by the dataset build script. Returns human-readable
 * violations; an empty array means the dataset passed.
 */
export function validateDataset(rows: readonly DatasetRow[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const key = `${r.ticker}|${r.date}`;
    if (seen.has(key)) problems.push(`duplicate observation ${key}`);
    seen.add(key);
    if (!(r.exitDate > r.date)) problems.push(`exitDate not after date for ${key}`);
    if (r.features.length !== FEATURE_NAMES.length) problems.push(`wrong feature count for ${key}`);
    if (r.features.some((v) => !Number.isFinite(v))) problems.push(`non-finite feature for ${key}`);
    if (!(r.fwdRv5 >= 0) || !Number.isFinite(r.fwdRv5)) problems.push(`invalid fwdRv5 for ${key}`);
    if (r.label !== (r.fwdRet > 0 ? 1 : 0)) problems.push(`label inconsistent with fwdRet for ${key}`);
  }
  return problems;
}
