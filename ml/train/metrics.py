"""Classification, calibration and cross-sectional ranking metrics. Pure numpy/sklearn."""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.metrics import (
    accuracy_score, average_precision_score, brier_score_loss, f1_score,
    precision_score, recall_score, roc_auc_score,
)


def expected_calibration_error(y: np.ndarray, p: np.ndarray, bins: int = 10) -> float:
    """Weighted mean |observed frequency - mean predicted probability| over equal-width bins."""
    edges = np.linspace(0, 1, bins + 1)
    idx = np.clip(np.digitize(p, edges[1:-1]), 0, bins - 1)
    ece = 0.0
    for b in range(bins):
        m = idx == b
        if m.any():
            ece += m.mean() * abs(y[m].mean() - p[m].mean())
    return float(ece)


def reliability_table(y: np.ndarray, p: np.ndarray, bins: int = 10) -> list[dict]:
    edges = np.linspace(0, 1, bins + 1)
    idx = np.clip(np.digitize(p, edges[1:-1]), 0, bins - 1)
    out = []
    for b in range(bins):
        m = idx == b
        if m.any():
            out.append({"bin": f"{edges[b]:.1f}-{edges[b + 1]:.1f}", "n": int(m.sum()),
                        "meanPredicted": float(p[m].mean()), "observed": float(y[m].mean())})
    return out


def classification_metrics(y: np.ndarray, p: np.ndarray, threshold: float = 0.5) -> dict:
    """All metrics are computed from the data given; degenerate cases yield None, never a made-up 0."""
    y = np.asarray(y).astype(int)
    p = np.asarray(p, dtype=float)
    pred = (p >= threshold).astype(int)
    base = float(y.mean())
    out: dict = {"n": int(len(y)), "baseRate": base, "threshold": threshold}
    out["accuracy"] = float(accuracy_score(y, pred))
    out["majorityAccuracy"] = max(base, 1 - base)
    out["precision"] = float(precision_score(y, pred, zero_division=0)) if pred.sum() else None
    out["recall"] = float(recall_score(y, pred, zero_division=0))
    out["f1"] = float(f1_score(y, pred, zero_division=0)) if pred.sum() else None
    two = len(np.unique(y)) == 2
    out["rocAuc"] = float(roc_auc_score(y, p)) if two and np.ptp(p) > 0 else None
    out["prAuc"] = float(average_precision_score(y, p)) if two and np.ptp(p) > 0 else None
    brier = float(brier_score_loss(y, p))
    ref = float(brier_score_loss(y, np.full_like(p, base)))  # Brier of always predicting the base rate
    out["brier"] = brier
    out["brierBaseRate"] = ref
    out["brierSkill"] = float(1 - brier / ref) if ref > 0 else None
    out["ece"] = expected_calibration_error(y, p)
    return out


def daily_rank_ic(df: pd.DataFrame, score_col: str, ret_col: str = "fwd_ret") -> dict:
    """Mean cross-sectional Spearman correlation between the score and realised forward return,
    computed per date (the standard 'information coefficient'). Dates with <10 names are skipped.
    t-stat uses the per-date ICs and is overstated because 5-day labels overlap; treat as indicative."""
    ics = []
    for _, g in df.groupby("date", sort=True):
        if len(g) >= 10 and g[score_col].nunique() > 1:
            ics.append(stats.spearmanr(g[score_col], g[ret_col])[0])
    ics = np.array([x for x in ics if np.isfinite(x)])
    if len(ics) < 20:
        return {"ic": None, "icStd": None, "icTStat": None, "days": int(len(ics))}
    # Newey-West style shrink: effective n ~ days / HORIZON because of overlapping labels.
    eff_n = max(len(ics) / 5.0, 1.0)
    t = float(ics.mean() / (ics.std(ddof=1) / np.sqrt(eff_n)))
    return {"ic": float(ics.mean()), "icStd": float(ics.std(ddof=1)), "icTStat": t, "days": int(len(ics))}
