"""Walk-forward model comparison.

    python -m ml.train.walkforward                 # selection folds only (2019-01 .. 2025-09)

For each fold: fit on the purged training window, calibrate on its last year, predict the unseen
test block. Pooled out-of-sample predictions are scored. The final holdout (>= HOLDOUT_START) is NOT
touched here; see ml/train/final.py.
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd

from .common import FEATURES, META, ROOT, load_dataset, make_folds, split_calibration, split_fold
from .metrics import classification_metrics, daily_rank_ic, reliability_table
from .models import RULES, PlattCalibrator, ml_models
from .strategy import evaluate_strategy

FIRST_TEST = "2019-01-01"
HOLDOUT_START = "2025-10-01"
OUT = ROOT / "ml" / "artifacts" / "reports"


def apply_target(df: pd.DataFrame, target: str) -> pd.DataFrame:
    """'abs': 1 if the 5-day return is positive. 'rel': 1 if it beats that date's cross-sectional median
    (removes the market-wide move, which the features cannot predict). Labels only; features untouched."""
    if target == "abs":
        return df
    if target == "rel":
        med = df.groupby("date")["fwd_ret"].transform("median")
        n = df.groupby("date")["fwd_ret"].transform("size")
        df = df[n >= 10].copy()
        df["label"] = (df["fwd_ret"] > med[df.index]).astype(int)
        return df
    raise ValueError(target)


def run(first_test: str = FIRST_TEST, end: str = HOLDOUT_START, months: int = 6, verbose: bool = True, target: str = "abs") -> dict:
    df = apply_target(load_dataset(), target)
    folds = make_folds(first_test, end, months)
    oos: dict[str, list[pd.DataFrame]] = {}
    fold_rows: list[dict] = []
    t0 = time.time()

    for f in folds:
        train, test = split_fold(df, f)
        fit, calib = split_calibration(train)
        Xf, yf = fit[FEATURES].to_numpy(), fit["label"].to_numpy()
        Xc, yc = calib[FEATURES].to_numpy(), calib["label"].to_numpy()
        Xt = test[FEATURES].to_numpy()
        base = test[["ticker", "date", "fwd_ret", "label"]].copy()

        for m in ml_models():
            m.fit(Xf, yf)
            if m.name == "naive_prior":
                p = m.predict_proba1(Xt)
            else:
                cal = PlattCalibrator().fit(m.predict_proba1(Xc), yc)
                p = cal.predict(m.predict_proba1(Xt))
            part = base.copy()
            part["p"] = p
            part["model"] = m.name
            oos.setdefault(m.name, []).append(part)
            fm = classification_metrics(test["label"].to_numpy(), p)
            fold_rows.append({"fold": f.index, "testStart": str(f.test_start.date()), "testEnd": str(f.test_end.date()),
                              "model": m.name, "trainRows": int(len(fit)), "calibRows": int(len(calib)), "testRows": int(len(test)),
                              "rocAuc": fm["rocAuc"], "brierSkill": fm["brierSkill"], "accuracy": fm["accuracy"], "baseRate": fm["baseRate"]})
        for r in RULES:
            part = base.copy()
            part["p"] = r.score(Xt)
            part["model"] = r.name
            oos.setdefault(r.name, []).append(part)
        if verbose:
            print(f"fold {f.index:2d}/{len(folds)} {f.test_start.date()}..{f.test_end.date()} train={len(fit):6d} test={len(test):5d} [{time.time()-t0:5.0f}s]", flush=True)

    results = []
    for name, parts in oos.items():
        d = pd.concat(parts, ignore_index=True)
        is_prob = name in {m.name for m in ml_models()}
        row: dict = {"model": name, "kind": "rule" if name.startswith("rule_") else ("baseline" if name == "naive_prior" else "ml")}
        if is_prob:
            row["classification"] = classification_metrics(d["label"].to_numpy(), d["p"].to_numpy())
            row["reliability"] = reliability_table(d["label"].to_numpy(), d["p"].to_numpy())
        else:
            from sklearn.metrics import roc_auc_score
            row["classification"] = {"n": int(len(d)), "rocAuc": float(roc_auc_score(d["label"], d["p"])), "note": "uncalibrated score; no probability metrics"}
        row["rankIC"] = daily_rank_ic(d.rename(columns={"p": "score"}), "score")
        row["strategy"] = evaluate_strategy(d.rename(columns={"p": "score"}), "score", top_frac=0.2, cost_bps=15.0)
        # fold-level AUC dispersion -> how much of the edge is noise
        aucs = [r["rocAuc"] for r in fold_rows if r["model"] == name and r["rocAuc"] is not None]
        if aucs:
            row["foldAuc"] = {"mean": float(np.mean(aucs)), "std": float(np.std(aucs, ddof=1)) if len(aucs) > 1 else None,
                              "min": float(np.min(aucs)), "max": float(np.max(aucs)), "foldsAboveHalf": int(sum(a > 0.5 for a in aucs)), "folds": len(aucs)}
        results.append(row)

    report = {
        "datasetSha256": META["csvSha256"], "featureVersion": META["featureVersion"], "target": META["target"] if target == "abs" else "beats_median_5d", "targetKind": target,
        "firstTest": first_test, "selectionEnd": end, "foldMonths": months, "folds": len(folds),
        "purge": "train rows kept only if label exit_date < test start; calibration = last 365d of train, purged",
        "costBpsPerSide": 15.0, "strategy": "long top 20% by score, non-overlapping 5-day cohorts, equal weight",
        "results": results, "perFold": fold_rows,
    }
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / ("walkforward.json" if target == "abs" else f"walkforward_{target}.json")
    path.write_text(json.dumps(report, indent=2), encoding="utf-8", newline="\n")
    if verbose:
        print(f"\nwrote {path}")
    return report


if __name__ == "__main__":
    rep = run(target=sys.argv[1] if len(sys.argv) > 1 else "abs")
    print(f"\n{'model':26s} {'AUC':>6s} {'BrierSk':>8s} {'ECE':>6s} {'IC':>7s} {'Sharpe':>7s} {'MaxDD':>7s} | bench Sharpe")
    for r in rep["results"]:
        c, s = r["classification"], r["strategy"]
        f = lambda v, w, d=3: f"{v:{w}.{d}f}" if v is not None else " " * (w - 3) + "n/a"
        print(f"{r['model']:26s} {f(c.get('rocAuc'),6)} {f(c.get('brierSkill'),8,4)} {f(c.get('ece'),6)} {f(r['rankIC']['ic'],7,4)} "
              f"{f(s['strategy']['sharpe'],7,2)} {f(s['strategy']['maxDrawdown'],7,2)} | {f(s['benchmark']['sharpe'],5,2)}")
