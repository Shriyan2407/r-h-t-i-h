import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CRITERIA, spearman } from "../../ml/evaluate-quant-agent";
import summary from "@/lib/agents/quantEvaluation.json";

describe("quant agent evaluation", () => {
  it("Spearman uses average ranks for ties", () => {
    expect(spearman([1, 2, 3, 4, 5], [10, 20, 30, 40, 50])).toBeCloseTo(1, 12);
    expect(spearman([1, 2, 3, 4, 5], [5, 4, 3, 2, 1])).toBeCloseTo(-1, 12);
    expect(spearman([1, 1, 1, 2, 2], [1, 2, 3, 4, 5])).toBeCloseTo(0.866025, 5);
    expect(spearman([1, 2, 3], [1, 2, 3])).toBeNull(); // too few points
  });

  it("the shipped summary matches the full report and the pre-registered rule", () => {
    const report = JSON.parse(readFileSync("ml/artifacts/reports/quant_agent.json", "utf8"));
    expect(summary.meanRankIc).toBeCloseTo(report.current.h20.meanIc, 4);
    expect(summary.tStat).toBeCloseTo(report.current.h20.icT, 2);
    const pass = report.current.h20.meanIc >= CRITERIA.minMeanIc && report.current.h20.icT >= CRITERIA.minT && report.former.h20.meanIc > 0;
    expect(summary.verdict).toBe(pass ? "EDGE" : "NO_EDGE");
  });
});
