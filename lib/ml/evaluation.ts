/**
 * Read-only view of the measured evidence behind every model: the registry plus the walk-forward reports
 * produced by ml/train/*. Nothing here is computed at request time, so the numbers shown to users are exactly
 * the ones recorded when the models were evaluated.
 */
import registry from "./registry.json";
import directionAbs from "../../ml/artifacts/reports/walkforward.json";
import directionRel from "../../ml/artifacts/reports/walkforward_rel.json";
import volatility from "../../ml/artifacts/reports/volatility.json";
import regimes from "./regimes.json";

type Num = number | null;

export interface DirectionRow {
  model: string;
  kind: "ml" | "baseline" | "rule";
  rocAuc: Num;
  brierSkill: Num;
  ece: Num;
  rankIC: Num;
  rankICTStat: Num;
  netSharpe: Num;
  netMaxDrawdown: Num;
  winRate: Num;
  benchmarkSharpe: Num;
  foldsAucAboveHalf: Num;
  folds: Num;
}

interface RawResult {
  model: string;
  kind: string;
  classification: { rocAuc?: Num; brierSkill?: Num; ece?: Num };
  rankIC: { ic: Num; icTStat: Num };
  strategy: { strategy: { sharpe: Num; maxDrawdown: Num; winRate: Num }; benchmark: { sharpe: Num } };
  foldAuc?: { foldsAboveHalf: number; folds: number };
}

function directionRows(rep: { results: RawResult[] }): DirectionRow[] {
  return rep.results.map((r) => ({
    model: r.model,
    kind: r.kind as DirectionRow["kind"],
    rocAuc: r.classification.rocAuc ?? null,
    brierSkill: r.classification.brierSkill ?? null,
    ece: r.classification.ece ?? null,
    rankIC: r.rankIC.ic,
    rankICTStat: r.rankIC.icTStat,
    netSharpe: r.strategy.strategy.sharpe,
    netMaxDrawdown: r.strategy.strategy.maxDrawdown,
    winRate: r.strategy.strategy.winRate,
    benchmarkSharpe: r.strategy.benchmark.sharpe,
    foldsAucAboveHalf: r.foldAuc?.foldsAboveHalf ?? null,
    folds: r.foldAuc?.folds ?? null,
  }));
}

export function evaluationSummary() {
  const da = directionAbs as unknown as { firstTest: string; selectionEnd: string; folds: number; costBpsPerSide: number; strategy: string; purge: string; results: RawResult[] };
  const dr = directionRel as unknown as typeof da;
  return {
    registry: registry.models,
    direction: {
      verdict: "REJECTED",
      summary: "No direction model passed the pre-registered gate (AUC >= 0.52, positive Brier skill, significant rank IC, net Sharpe above benchmark).",
      method: { firstTest: da.firstTest, selectionEnd: da.selectionEnd, folds: da.folds, purge: da.purge, costBpsPerSide: da.costBpsPerSide, strategy: da.strategy },
      targets: [
        { target: "next-5-day return > 0", rows: directionRows(da) },
        { target: "5-day return beats same-day universe median", rows: directionRows(dr) },
      ],
    },
    volatility: {
      verdict: "DEPLOYED",
      chosen: volatility.chosen,
      method: { firstTest: volatility.firstTest, selectionEnd: volatility.selectionEnd, folds: volatility.folds, rows: volatility.rows },
      rows: volatility.results.map((r) => ({
        model: r.model,
        r2VsNaive: r.r2VsNaive,
        mseVsPersist: "mseVsPersist" in r ? (r.mseVsPersist as number) : null,
        interval80Coverage: r.interval80Coverage,
        foldsBeatingPersist: r.foldsBeatingPersist,
        ownVolMonotoneRate: "ownVolMonotoneRate" in r ? (r.ownVolMonotoneRate as number) : null,
        eligible: "eligible" in r ? Boolean(r.eligible) : null,
      })),
    },
    regimes: { cutoffs: { low: regimes.vixLowCutoff, high: regimes.vixHighCutoff }, sampleRange: regimes.sampleRange, historical: regimes.historical, note: regimes.note },
  };
}

export type EvaluationSummary = ReturnType<typeof evaluationSummary>;
