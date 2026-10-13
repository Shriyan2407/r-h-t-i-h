"""Volatility forecasting: can we predict the next 5 days' realised volatility better than simple baselines?

Unlike direction, volatility clusters, so this is a target with a realistic chance of real skill.

PRE-REGISTERED RULES (declared before results were examined):
  * Target  y = log(max(fwd_rv5, 1e-4)); fwd_rv5 = RMS of the 5 daily returns t+1..t+5.
  * Every model must beat `naive_mean` (OOS R^2 > 0).
  * A model "adds value" over the simple `persist_ols` baseline only if its pooled MSE is >= 1% lower AND it wins in
    more than half of the folds.
  * Choose the SIMPLEST model among those within 0.005 R^2 of the best eligible one
    (order: persist_ols < har_ols < ridge_all < hgb_reg).
  * (added in v1.1 after a defect was found in v1.0, see own_vol_monotone_rate) the forecast must RISE when the
    stock's own recent volatility rises, in >= 99% of sampled rows.
  * 80% prediction interval (residual quantiles from the calibration slice) must cover 75-85% of test rows.
  * The final holdout (>= 2025-10-01) is scored exactly once, for the chosen model, by `holdout()`.
"""
from __future__ import annotations

import json
import sys

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.linear_model import LinearRegression, Ridge

from .common import FEATURES, META, ROOT, load_dataset, make_folds, split_calibration, split_fold, winsor_bounds
from .walkforward import FIRST_TEST, HOLDOUT_START

OUT = ROOT / "ml" / "artifacts" / "reports"
LOG_COLS = ["rv_20", "atr_pct", "bb_width", "idx_vol_20", "hl_range", "vix_level"]
HAR_COLS = ["log_rv_20", "log_atr_pct", "log_idx_vol_20", "log_vix_level"]
ORDER = ["persist_ols", "har_ols", "ridge_all", "hgb_reg"]
EPS = 1e-5


def design(df: pd.DataFrame) -> pd.DataFrame:
    """v1.1 specification: each volatility-type measure enters ONLY in log form. v1.0 also included the raw
    values, which are collinear with their logs; the ridge then gave `rv_20` a negative coefficient, so a stock
    with higher recent volatility could receive a LOWER forecast (18/25 sampled cases)."""
    X = df[[f for f in FEATURES if f not in LOG_COLS]].copy()
    for c in LOG_COLS:
        X[f"log_{c}"] = np.log(np.maximum(df[c].to_numpy(), EPS))
    return X


OWN_VOL = ["rv_20", "atr_pct", "bb_width", "hl_range"]


def own_vol_monotone_rate(model, df: pd.DataFrame, factor: float = 1.5, n: int = 3000) -> float:
    """Share of rows whose forecast RISES when all own-volatility measures are scaled up. Must be >= 0.99."""
    d = df.sample(min(n, len(df)), random_state=0)
    up = d.copy()
    for c in OWN_VOL:
        up[c] = up[c] * factor
    return float(np.mean(model.predict(design(up)) > model.predict(design(d))))


def target(df: pd.DataFrame) -> np.ndarray:
    return np.log(np.maximum(df["fwd_rv5"].to_numpy(), 1e-4))


class Naive:
    name = "naive_mean"
    def fit(self, X, y): self.m = float(np.mean(y)); return self
    def predict(self, X): return np.full(len(X), self.m)


class Cols:
    """OLS on a named subset of columns."""
    def __init__(self, name, cols): self.name, self.cols = name, cols
    def fit(self, X, y): self.m = LinearRegression().fit(X[self.cols], y); return self
    def predict(self, X): return self.m.predict(X[self.cols])


class RidgeAll:
    name = "ridge_all"
    def fit(self, X, y):
        A = X.to_numpy()
        self.lo, self.hi = winsor_bounds(A)
        Z = np.clip(A, self.lo, self.hi)
        self.mu, self.sd = Z.mean(0), Z.std(0); self.sd[self.sd == 0] = 1.0
        self.cols = list(X.columns)
        self.m = Ridge(alpha=100.0).fit((Z - self.mu) / self.sd, y)
        return self
    def predict(self, X):
        return self.m.predict((np.clip(X.to_numpy(), self.lo, self.hi) - self.mu) / self.sd)


class Hgb:
    name = "hgb_reg"
    def fit(self, X, y):
        self.m = HistGradientBoostingRegressor(max_depth=3, learning_rate=0.05, max_iter=200, min_samples_leaf=500,
                                               l2_regularization=10.0, early_stopping=False, random_state=7).fit(X, y)
        return self
    def predict(self, X): return self.m.predict(X)


def models():
    return [Naive(), Cols("persist_ols", ["log_rv_20"]), Cols("har_ols", HAR_COLS), RidgeAll(), Hgb()]


def run(verbose: bool = True) -> dict:
    df = load_dataset()
    folds = make_folds(FIRST_TEST, HOLDOUT_START, 6)
    pooled: dict[str, list[np.ndarray]] = {}
    per_fold = []
    ys, cover_lo, cover_hi, last_models = [], {}, {}, {}
    for f in folds:
        train, test = split_fold(df, f)
        fit, calib = split_calibration(train)
        Xf, yf, Xc, yc, Xt, yt = design(fit), target(fit), design(calib), target(calib), design(test), target(test)
        ys.append(yt)
        naive_pred = None
        for m in models():
            m.fit(Xf, yf)
            pt = m.predict(Xt)
            if m.name == "naive_mean":
                naive_pred = pt
            res = yc - m.predict(Xc)
            q10, q90 = np.quantile(res, [0.10, 0.90])
            last_models[m.name] = (m, test)
            pooled.setdefault(m.name, []).append(pt)
            cover_lo.setdefault(m.name, []).append(pt + q10)
            cover_hi.setdefault(m.name, []).append(pt + q90)
            per_fold.append({"fold": f.index, "model": m.name, "mse": float(np.mean((yt - pt) ** 2)),
                             "mseNaive": float(np.mean((yt - naive_pred) ** 2))})
        if verbose:
            print(f"fold {f.index:2d}/{len(folds)} {f.test_start.date()} test={len(test)}", flush=True)

    y = np.concatenate(ys)
    sse_naive = float(np.sum((y - np.concatenate(pooled["naive_mean"])) ** 2))
    pf = pd.DataFrame(per_fold)
    results = []
    for name, parts in pooled.items():
        p = np.concatenate(parts)
        lo, hi = np.concatenate(cover_lo[name]), np.concatenate(cover_hi[name])
        sse = float(np.sum((y - p) ** 2))
        wins = None
        if name != "persist_ols":
            a = pf[pf.model == name].set_index("fold")["mse"]
            b = pf[pf.model == "persist_ols"].set_index("fold")["mse"]
            wins = int((a < b).sum())
        results.append({"model": name, "r2VsNaive": 1 - sse / sse_naive, "mse": sse / len(y), "mae": float(np.mean(np.abs(y - p))),
                        "interval80Coverage": float(np.mean((y >= lo) & (y <= hi))), "foldsBeatingPersist": wins, "folds": len(folds)})
    base_mse = next(r["mse"] for r in results if r["model"] == "persist_ols")
    for r in results:
        if r["model"] in ORDER:
            r["mseVsPersist"] = r["mse"] / base_mse - 1
            adds = r["model"] == "persist_ols" or (r["mseVsPersist"] <= -0.01 and r["foldsBeatingPersist"] > len(folds) / 2)
            r["addsValueOverPersist"] = bool(adds)
            r["coverageOk"] = 0.75 <= r["interval80Coverage"] <= 0.85
            mdl, tst = last_models[r["model"]]
            r["ownVolMonotoneRate"] = own_vol_monotone_rate(mdl, tst)
            r["monotoneOk"] = r["ownVolMonotoneRate"] >= 0.99
            r["eligible"] = bool(r["r2VsNaive"] > 0 and adds and r["coverageOk"] and r["monotoneOk"])
    eligible = [r for r in results if r.get("eligible")]
    chosen = None
    if eligible:
        best = max(r["r2VsNaive"] for r in eligible)
        chosen = min((r for r in eligible if best - r["r2VsNaive"] <= 0.005), key=lambda r: ORDER.index(r["model"]))["model"]
    rep = {"datasetSha256": META["csvSha256"], "target": "log_rv5", "folds": len(folds), "rows": int(len(y)),
           "firstTest": FIRST_TEST, "selectionEnd": HOLDOUT_START, "chosen": chosen, "results": results}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "volatility.json").write_text(json.dumps(rep, indent=2), encoding="utf-8")
    return rep


if __name__ == "__main__":
    r = run()
    print(f"\n{'model':14s} {'R2':>7s} {'MSE':>7s} {'vsPersist':>10s} {'cov80':>6s} {'wins':>6s} {'mono':>6s} eligible")
    for x in r["results"]:
        print(f"{x['model']:14s} {x['r2VsNaive']:7.3f} {x['mse']:7.4f} {x.get('mseVsPersist', float('nan')):10.3%} {x['interval80Coverage']:6.3f} {str(x['foldsBeatingPersist']):>6s} {x.get('ownVolMonotoneRate', float('nan')):6.3f} {x.get('eligible')}")
    print("\nCHOSEN:", r["chosen"])
