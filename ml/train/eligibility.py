"""Pre-registered deployment gate for a *direction* model. Written BEFORE the results were examined.

A model may be shown to users as a probability only if, in out-of-sample selection folds, ALL hold:
  1. pooled ROC-AUC >= 0.52
  2. more than half of the folds have AUC > 0.5
  3. Brier skill vs always-predict-base-rate > 0   (probabilities are better than the base rate)
  4. rank IC > 0 with |t| > 2
  5. long-top-quintile net Sharpe exceeds the equal-weight benchmark's Sharpe
Failing any one means: do not ship a probability; say so in the product.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from .common import ROOT

REPORTS = ROOT / "ml" / "artifacts" / "reports"
MIN_AUC = 0.52


def gate(result: dict) -> dict:
    c, ic, strat = result["classification"], result["rankIC"], result["strategy"]
    fa = result.get("foldAuc")
    checks = {
        "pooledAuc>=0.52": c.get("rocAuc") is not None and c["rocAuc"] >= MIN_AUC,
        "majorityFoldsAuc>0.5": bool(fa) and fa["foldsAboveHalf"] > fa["folds"] / 2,
        "brierSkill>0": c.get("brierSkill") is not None and c["brierSkill"] > 0,
        "rankIC>0&|t|>2": ic.get("ic") is not None and ic["ic"] > 0 and ic.get("icTStat") is not None and abs(ic["icTStat"]) > 2,
        "netSharpe>benchmark": (strat["strategy"]["sharpe"] is not None and strat["benchmark"]["sharpe"] is not None
                                and strat["strategy"]["sharpe"] > strat["benchmark"]["sharpe"]),
    }
    return {"model": result["model"], "kind": result["kind"], "checks": checks, "eligible": all(checks.values())}


def evaluate(path: Path) -> list[dict]:
    rep = json.loads(path.read_text(encoding="utf-8"))
    return [gate(r) for r in rep["results"] if r["kind"] == "ml"]


if __name__ == "__main__":
    out = {}
    for name in ("walkforward.json", "walkforward_rel.json"):
        p = REPORTS / name
        if p.exists():
            out[name] = evaluate(p)
    (REPORTS / "eligibility.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    for name, decisions in out.items():
        print(name)
        for d in decisions:
            failed = [k for k, v in d["checks"].items() if not v]
            print(f"  {d['model']:24s} eligible={d['eligible']}  failed={failed}")
