"""Score the chosen volatility model ONCE on the untouched holdout, then export the production artifact.

    python -m ml.train.final_vol holdout     # fits on data before HOLDOUT_START, scores >= HOLDOUT_START
    python -m ml.train.final_vol export      # refits on all labelled data with the same procedure/hyper-parameters

The holdout is one-shot: `holdout` refuses to run twice unless ML_ALLOW_HOLDOUT_RERUN=1, because repeated
looks turn a holdout into a validation set.
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
from datetime import date

import numpy as np
import pandas as pd

from .common import FEATURES, META, ROOT, assert_no_leakage, load_dataset, split_calibration
from .vol import Cols, Naive, RidgeAll, design, target
from .walkforward import HOLDOUT_START

REPORTS = ROOT / "ml" / "artifacts" / "reports"
ARTIFACTS = ROOT / "lib" / "ml" / "artifacts"
MODEL_ID = "volatility-ridge"
VERSION = "1.1.0"


def fit_with_calibration(df: pd.DataFrame):
    fit, calib = split_calibration(df)
    m = RidgeAll().fit(design(fit), target(fit))
    res = target(calib) - m.predict(design(calib))
    q10, q90 = (float(x) for x in np.quantile(res, [0.10, 0.90]))
    return m, q10, q90, fit, calib


def holdout() -> dict:
    out = REPORTS / "volatility_holdout.json"
    if out.exists() and os.environ.get("ML_ALLOW_HOLDOUT_RERUN") != "1":
        raise SystemExit(f"{out.name} already exists: the holdout has been spent. Refusing to look again.")
    df = load_dataset()
    cut = pd.Timestamp(HOLDOUT_START)
    train = df[df["exit_date"] < cut]
    test = df[df["date"] >= cut]
    assert_no_leakage(train, test)
    m, q10, q90, fit, calib = fit_with_calibration(train)
    persist = Cols("persist_ols", ["log_rv_20"]).fit(design(fit), target(fit))
    naive = Naive().fit(design(fit), target(fit))
    y, p = target(test), m.predict(design(test))
    sse = lambda q: float(np.sum((y - q) ** 2))
    rep = {
        "model": MODEL_ID, "version": VERSION, "datasetSha256": META["csvSha256"],
        "holdoutStart": HOLDOUT_START, "holdoutEnd": str(test["date"].max().date()), "rows": int(len(test)),
        "trainRows": int(len(fit)), "calibRows": int(len(calib)),
        "r2VsNaive": 1 - sse(p) / sse(naive.predict(design(test))),
        "mse": sse(p) / len(y), "msePersist": sse(persist.predict(design(test))) / len(y),
        "mseVsPersist": sse(p) / sse(persist.predict(design(test))) - 1,
        "interval80Coverage": float(np.mean((y >= p + q10) & (y <= p + q90))),
        "mae": float(np.mean(np.abs(y - p))),
        # v1.0.0 was scored on this same holdout before the v1.1 specification fix, so this is a SECOND look.
        "holdoutPristine": False,
    }
    out.write_text(json.dumps(rep, indent=2), encoding="utf-8", newline="\n")
    return rep


def export() -> dict:
    df = load_dataset()
    m, q10, q90, fit, calib = fit_with_calibration(df)
    cols = m.cols
    art = {
        "id": MODEL_ID, "version": VERSION, "task": "volatility_forecast", "algorithm": "ridge",
        "featureVersion": META["featureVersion"], "horizonBars": META["horizonBars"],
        "target": "log(max(RMS of the 5 daily returns after the decision bar, 1e-4))",
        "trainedAt": date.today().isoformat(), "datasetSha256": META["csvSha256"],
        "fitRange": [str(fit["date"].min().date()), str(fit["date"].max().date())],
        "calibRange": [str(calib["date"].min().date()), str(calib["date"].max().date())],
        "hyperparameters": {"ridgeAlpha": 100.0, "winsor": [0.01, 0.99], "calibrationDays": 365},
        "columns": cols, "winsorLo": m.lo.tolist(), "winsorHi": m.hi.tolist(), "mean": m.mu.tolist(), "scale": m.sd.tolist(),
        "coef": m.m.coef_.tolist(), "intercept": float(m.m.intercept_),
        "residualQ10": q10, "residualQ90": q90, "interval": "80% (10th-90th percentile of calibration residuals, log scale)",
        "logFloor": 1e-5,
    }
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    path = ARTIFACTS / f"{MODEL_ID}-{VERSION}.json"
    body = json.dumps(art, indent=2)
    path.write_text(body, encoding="utf-8", newline="\n")
    art["_sha256"] = hashlib.sha256(body.encode("utf-8")).hexdigest()
    return art


def parity(n: int = 25) -> dict:
    """Reference predictions from the *exported* model for real dataset rows. A TypeScript test must reproduce
    them, which proves the inference code and feature vectors agree with the training code."""
    art = json.loads((ARTIFACTS / f"{MODEL_ID}-{VERSION}.json").read_text(encoding="utf-8"))
    df = load_dataset()
    pick = df.iloc[np.linspace(0, len(df) - 1, n).astype(int)]
    X = design(pick)[art["columns"]].to_numpy()
    Z = (np.clip(X, art["winsorLo"], art["winsorHi"]) - np.array(art["mean"])) / np.array(art["scale"])
    pred = Z @ np.array(art["coef"]) + art["intercept"]
    out = {"model": MODEL_ID, "version": VERSION, "cases": [
        {"ticker": r.ticker, "date": str(r.date.date()), "features": [float(r[f]) for f in FEATURES], "expectedLogRv5": float(p)}
        for (_, r), p in zip(pick.iterrows(), pred)]}
    (ROOT / "tests" / "ml" / "fixtures").mkdir(parents=True, exist_ok=True)
    (ROOT / "tests" / "ml" / "fixtures" / "volatility-parity.json").write_text(json.dumps(out, indent=1), encoding="utf-8", newline="\n")
    return out


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "holdout":
        print(json.dumps(holdout(), indent=2))
    elif cmd == "export":
        a = export()
        print("exported", a["id"], a["version"], "sha256", a["_sha256"], "fit", a["fitRange"], "calib", a["calibRange"])
    elif cmd == "parity":
        print("wrote", len(parity()["cases"]), "parity cases")
    else:
        raise SystemExit(__doc__)
