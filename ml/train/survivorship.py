"""Survivorship / generalisation check for the deployed volatility model.

    ML_SET=former npx tsx ml/download.ts && ML_SET=former npx tsx ml/build-dataset.ts
    python -m ml.train.survivorship

The production artifact (volatility-ridge, unchanged) is applied to 25 former Nifty 50 constituents that were never
in the training universe. Baselines (naive mean, persistence OLS) are fit on the TRAINING universe only. Two slices:
  * all dates:            stocks are out of sample, dates overlap the training period
  * dates >= holdout start: stocks AND dates are out of sample for the model's coefficients
Also reports how much the survivor-only universe flatters raw returns (the bias the main study cannot remove).
"""
from __future__ import annotations

import json

import numpy as np
import pandas as pd

from .common import ROOT, load_dataset, split_calibration
from .vol import Cols, Naive, design, target
from .walkforward import HOLDOUT_START

ART = ROOT / "lib" / "ml" / "artifacts" / "volatility-ridge-1.1.0.json"
OUT = ROOT / "ml" / "artifacts" / "reports" / "survivorship.json"


def predict(art: dict, df: pd.DataFrame) -> np.ndarray:
    X = design(df)[art["columns"]].to_numpy()
    Z = (np.clip(X, art["winsorLo"], art["winsorHi"]) - np.array(art["mean"])) / np.array(art["scale"])
    return Z @ np.array(art["coef"]) + art["intercept"]


def score(df: pd.DataFrame, art: dict, naive: Naive, persist: Cols) -> dict:
    y, p = target(df), predict(art, df)
    sse = lambda q: float(np.sum((y - q) ** 2))
    lo, hi = p + art["residualQ10"], p + art["residualQ90"]
    return {
        "rows": int(len(df)),
        "tickers": int(df["ticker"].nunique()),
        "r2VsNaive": 1 - sse(p) / sse(naive.predict(design(df))),
        "mseVsPersist": sse(p) / sse(persist.predict(design(df))) - 1,
        "interval80Coverage": float(np.mean((y >= lo) & (y <= hi))),
    }


def run() -> dict:
    art = json.loads(ART.read_text(encoding="utf-8"))
    main = load_dataset()
    former = load_dataset(ROOT / "ml" / "data" / "dataset_former.csv")
    overlap = set(main["ticker"]) & set(former["ticker"])
    assert not overlap, f"robustness set overlaps training universe: {overlap}"

    train = main[main["exit_date"] < pd.Timestamp(HOLDOUT_START)]
    fit, _ = split_calibration(train)
    naive = Naive().fit(design(fit), target(fit))
    persist = Cols("persist_ols", ["log_rv_20"]).fit(design(fit), target(fit))

    late = former[former["date"] >= pd.Timestamp(HOLDOUT_START)]
    per_ticker = {}
    for t, g in former.groupby("ticker"):
        s = score(g, art, naive, persist)
        per_ticker[t] = {"rows": s["rows"], "mseVsPersist": s["mseVsPersist"], "coverage": s["interval80Coverage"]}

    rep = {
        "model": f"{art['id']}@{art['version']}",
        "robustnessSet": "ml/universe_former.json (25 former Nifty 50 constituents, never used in training)",
        "allDates": score(former, art, naive, persist),
        "outOfSampleDates": score(late, art, naive, persist),
        "tickersBeatingPersistence": int(sum(v["mseVsPersist"] < 0 for v in per_ticker.values())),
        "perTicker": per_ticker,
        "survivorshipBias": {
            "trainingUniversePositiveRate": float(main["label"].mean()),
            "formerConstituentsPositiveRate": float(former["label"].mean()),
            "trainingUniverseMeanFwd5d": float(main["fwd_ret"].mean()),
            "formerConstituentsMeanFwd5d": float(former["fwd_ret"].mean()),
        },
    }
    OUT.write_text(json.dumps(rep, indent=2), encoding="utf-8", newline="\n")
    return rep


if __name__ == "__main__":
    r = run()
    for k in ("allDates", "outOfSampleDates"):
        s = r[k]
        print(f"{k:17s} rows={s['rows']:6d} R2={s['r2VsNaive']:.3f} MSEvsPersist={s['mseVsPersist']:+.1%} cov80={s['interval80Coverage']:.1%}")
    print("tickers beating persistence:", r["tickersBeatingPersistence"], "/", len(r["perTicker"]))
    b = r["survivorshipBias"]
    print(f"positive rate: survivors {b['trainingUniversePositiveRate']:.1%} vs former {b['formerConstituentsPositiveRate']:.1%}; "
          f"mean 5d return: {b['trainingUniverseMeanFwd5d']:.3%} vs {b['formerConstituentsMeanFwd5d']:.3%}")
