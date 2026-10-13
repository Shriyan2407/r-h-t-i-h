"""Turn out-of-sample scores into a tradable, cost-aware portfolio series.

Rule (parameter-free on the test set): every HORIZON-th trading date, go long the top `top_frac`
of names by score for HORIZON days (entry next open, exit close t+5 = exactly the label's return).
Cohorts do not overlap, so the cohort return series is a valid periodic return series.
Costs: `cost_bps` per side applied to every selected name each cohort (full turnover - conservative).
Benchmark: the equal-weight average of ALL names over the same cohorts, with the same cost
only if it were traded (it is shown gross, as a market reference).
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .common import HORIZON

PERIODS_PER_YEAR = 252 / HORIZON


def cohort_returns(df: pd.DataFrame, score_col: str, top_frac: float = 0.2, cost_bps: float = 15.0,
                   min_names: int = 10) -> pd.DataFrame:
    dates = sorted(df["date"].unique())
    pick_dates = dates[::HORIZON]
    rows = []
    for d in pick_dates:
        g = df[df["date"] == d]
        if len(g) < min_names:
            continue
        k = max(1, int(round(len(g) * top_frac)))
        sel = g.nlargest(k, score_col)
        gross = float(sel["fwd_ret"].mean())
        net = gross - 2 * cost_bps / 1e4
        rows.append({"date": d, "gross": gross, "net": net, "bench": float(g["fwd_ret"].mean()), "n": k})
    return pd.DataFrame(rows)


def perf(returns: np.ndarray) -> dict:
    r = np.asarray(returns, dtype=float)
    if len(r) < 3:
        return {"cohorts": int(len(r)), "totalReturn": None, "cagr": None, "sharpe": None, "sortino": None,
                "maxDrawdown": None, "winRate": None, "profitFactor": None}
    eq = np.cumprod(1 + r)
    peak = np.maximum.accumulate(np.concatenate([[1.0], eq]))[1:]
    mdd = float((eq / peak - 1).min())
    sd = r.std(ddof=1)
    downside = np.sqrt(np.mean(np.minimum(r, 0) ** 2))
    years = len(r) / PERIODS_PER_YEAR
    wins, losses = r[r > 0].sum(), -r[r < 0].sum()
    return {
        "cohorts": int(len(r)),
        "totalReturn": float(eq[-1] - 1),
        "cagr": float(eq[-1] ** (1 / years) - 1) if eq[-1] > 0 and years > 0 else None,
        "sharpe": float(r.mean() / sd * np.sqrt(PERIODS_PER_YEAR)) if sd > 1e-12 else None,
        "sortino": float(r.mean() / downside * np.sqrt(PERIODS_PER_YEAR)) if downside > 1e-12 else None,
        "maxDrawdown": mdd,
        "winRate": float((r > 0).mean()),
        "profitFactor": float(wins / losses) if losses > 0 else None,
    }


def evaluate_strategy(df: pd.DataFrame, score_col: str, top_frac: float = 0.2, cost_bps: float = 15.0) -> dict:
    c = cohort_returns(df, score_col, top_frac, cost_bps)
    if c.empty:
        return {"strategy": perf(np.array([])), "strategyGross": perf(np.array([])), "benchmark": perf(np.array([]))}
    return {"strategy": perf(c["net"].to_numpy()), "strategyGross": perf(c["gross"].to_numpy()),
            "benchmark": perf(c["bench"].to_numpy())}
