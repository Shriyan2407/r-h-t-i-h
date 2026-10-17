/**
 * Point-in-time evaluation of the quant agent's rule score (lib/agents/quant.ts ruleScore), the only committee
 * signal that can be tested historically: it uses prices alone. Fundamentals and news have no point-in-time history
 * here, so the full committee cannot be backtested this way.
 *
 * PRE-REGISTERED (written before the first run, not tuned afterwards):
 *   Signal     ruleScore(technicalSnapshot(bars[0..t])) — exactly the agent's code, causal by construction.
 *   Target     forward 20-trading-day return of the adjusted close, t -> t+20.
 *   Sampling   every 20th NIFTY trading day from 2019-01-01, so 20-day windows do not overlap.
 *   Metric     cross-sectional Spearman rank IC per date (average ranks for ties), averaged over dates;
 *              t = mean / (sd / sqrt(dates)).
 *   Universe   current members (ml/data/raw) for the decision; former members (raw_former) as a survivorship check.
 *   PASS       mean IC >= 0.02 AND t >= 2 on current members AND mean IC > 0 on former members.
 *   Secondary  5-day horizon sampled every 5 days; mean excess return (vs the same date's cross-sectional mean)
 *              by the view the score maps to.
 *
 * Usage: npx tsx ml/evaluate-quant-agent.ts   (needs ml/data/raw*, see docs/ML_PIPELINE.md)
 * Output: ml/artifacts/reports/quant_agent.json and the summary in lib/agents/quantEvaluation.json.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { technicalSnapshot } from "../lib/agents/analytics";
import { ruleScore, viewFromScore } from "../lib/agents/quant";
import { toAdjustedBars } from "../lib/ml/features";
import type { Bar } from "../lib/backtest/types";

const ROOT = join(__dirname);
const START = "2019-01-01";
const MIN_HISTORY = 260;
export const CRITERIA = { minMeanIc: 0.02, minT: 2 };

type Raw = Array<{ date: string; open: number; high: number; low: number; close: number; adjClose: number; volume: number }>;

function loadSet(dir: string): Map<string, Bar[]> {
  const out = new Map<string, Bar[]>();
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json") || f.startsWith("_")) continue;
    out.set(f.replace(/\.json$/, ""), toAdjustedBars(JSON.parse(readFileSync(join(dir, f), "utf8")) as Raw));
  }
  return out;
}

function ranks(xs: number[]): number[] {
  const idx = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array<number>(xs.length);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
    i = j + 1;
  }
  return r;
}

export function spearman(a: number[], b: number[]): number | null {
  if (a.length < 5) return null;
  const ra = ranks(a), rb = ranks(b);
  const ma = ra.reduce((x, y) => x + y, 0) / ra.length, mb = rb.reduce((x, y) => x + y, 0) / rb.length;
  let c = 0, va = 0, vb = 0;
  for (let i = 0; i < ra.length; i++) { c += (ra[i] - ma) * (rb[i] - mb); va += (ra[i] - ma) ** 2; vb += (rb[i] - mb) ** 2; }
  return va > 0 && vb > 0 ? c / Math.sqrt(va * vb) : null;
}

const meanOf = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;
const sdOf = (x: number[]) => { const m = meanOf(x); return Math.sqrt(x.reduce((a, b) => a + (b - m) ** 2, 0) / (x.length - 1)); };

interface HorizonResult {
  horizon: number;
  dates: number;
  observations: number;
  meanIc: number;
  icT: number;
  shareOfDatesIcPositive: number;
  byView: Record<string, { n: number; meanExcess: number }>;
  bullMinusBear: number | null;
}

function evaluate(set: Map<string, Bar[]>, calendar: string[], horizon: number, step: number): HorizonResult {
  const byDate = new Map<string, number>();
  const pos = [...set.entries()].map(([t, bars]) => ({ t, bars, at: new Map(bars.map((b, i) => [b.date, i])) }));
  const startIdx = calendar.findIndex((d) => d >= START);
  const ics: number[] = [];
  const views: Record<string, number[]> = {};
  let obs = 0;
  for (let k = startIdx; k + horizon < calendar.length; k += step) {
    const d = calendar[k];
    byDate.set(d, k);
    const scores: number[] = [], fwd: number[] = [], vs: string[] = [];
    for (const p of pos) {
      const i = p.at.get(d);
      if (i === undefined || i < MIN_HISTORY || i + horizon >= p.bars.length) continue;
      // The forward window must end on the calendar date `horizon` sessions later (no stale gaps).
      if (p.bars[i + horizon].date !== calendar[k + horizon]) continue;
      const snap = technicalSnapshot(p.bars.slice(0, i + 1));
      if (!snap) continue;
      const s = ruleScore(snap);
      scores.push(s);
      fwd.push(p.bars[i + horizon].close / p.bars[i].close - 1);
      vs.push(viewFromScore(s));
    }
    if (scores.length < 10) continue;
    const ic = spearman(scores, fwd);
    if (ic !== null) ics.push(ic);
    const m = meanOf(fwd);
    fwd.forEach((r, j) => { (views[vs[j]] ??= []).push(r - m); });
    obs += scores.length;
  }
  const byView = Object.fromEntries(Object.entries(views).map(([v, xs]) => [v, { n: xs.length, meanExcess: meanOf(xs) }]));
  const bull = [...(views.bullish ?? []), ...(views.lean_bullish ?? [])];
  const bear = [...(views.bearish ?? []), ...(views.lean_bearish ?? [])];
  return {
    horizon,
    dates: ics.length,
    observations: obs,
    meanIc: meanOf(ics),
    icT: meanOf(ics) / (sdOf(ics) / Math.sqrt(ics.length)),
    shareOfDatesIcPositive: ics.filter((x) => x > 0).length / ics.length,
    byView,
    bullMinusBear: bull.length && bear.length ? meanOf(bull) - meanOf(bear) : null,
  };
}

function main() {
  const rawDir = join(ROOT, "data", "raw"), formerDir = join(ROOT, "data", "raw_former");
  if (!existsSync(rawDir)) throw new Error("ml/data/raw is missing: run npm run ml:download first");
  const index = toAdjustedBars(JSON.parse(readFileSync(join(rawDir, "_INDEX.json"), "utf8")) as Raw);
  const calendar = index.map((b) => b.date);
  const current = loadSet(rawDir);
  const former = existsSync(formerDir) ? loadSet(formerDir) : new Map<string, Bar[]>();

  const cur20 = evaluate(current, calendar, 20, 20);
  const cur5 = evaluate(current, calendar, 5, 5);
  const for20 = former.size ? evaluate(former, calendar, 20, 20) : null;
  const pass = cur20.meanIc >= CRITERIA.minMeanIc && cur20.icT >= CRITERIA.minT && !!for20 && for20.meanIc > 0;
  const report = {
    schema: "quant-agent-eval/1",
    evaluatedAt: new Date().toISOString().slice(0, 10),
    signal: "lib/agents/quant.ts ruleScore (six published rules)",
    period: [START, calendar[calendar.length - 1]],
    criteria: { ...CRITERIA, formerMembersMeanIcPositive: true },
    current: { tickers: current.size, h20: cur20, h5: cur5 },
    former: for20 ? { tickers: former.size, h20: for20 } : null,
    verdict: pass ? "EDGE" : "NO_EDGE",
  };
  writeFileSync(join(ROOT, "artifacts", "reports", "quant_agent.json"), JSON.stringify(report, null, 2) + "\n");
  const summary = {
    schema: "quant-agent-eval-summary/1",
    evaluatedAt: report.evaluatedAt,
    period: report.period,
    tickers: current.size,
    formerTickers: former.size,
    horizonDays: 20,
    meanRankIc: Number(cur20.meanIc.toFixed(4)),
    tStat: Number(cur20.icT.toFixed(2)),
    formerMeanRankIc: for20 ? Number(for20.meanIc.toFixed(4)) : null,
    bullMinusBearExcess20d: cur20.bullMinusBear === null ? null : Number(cur20.bullMinusBear.toFixed(4)),
    verdict: report.verdict,
    criteria: "mean rank IC >= 0.02, t >= 2, positive on former members (pre-registered)",
  };
  writeFileSync(join(ROOT, "..", "lib", "agents", "quantEvaluation.json"), JSON.stringify(summary, null, 2) + "\n");
  console.log(JSON.stringify({ summary, h5: { meanIc: cur5.meanIc, t: cur5.icT }, byView20: cur20.byView }, null, 2));
}

if (typeof require !== "undefined" && require.main === module) main();
