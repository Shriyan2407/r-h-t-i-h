"""Market regimes from two measurable inputs: NIFTY 50 vs its 200-day average (trend) and India VIX against
cut-offs learned on PRE-holdout history (volatility). Writes lib/ml/regimes.json (cut-offs + a descriptive table
of what historically followed each regime) and a parity fixture for the TypeScript classifier.

The table is DESCRIPTIVE. Volatility differs strongly by regime (that is the point); mean forward returns are
reported with their sample sizes and are NOT a trading signal.
"""
from __future__ import annotations

import json

import numpy as np
import pandas as pd

from .common import ROOT
from .walkforward import HOLDOUT_START

RAW = ROOT / "ml" / "data" / "raw"
NAMES = {
    ("UP", "LOW"): "Calm uptrend", ("UP", "NORMAL"): "Uptrend", ("UP", "HIGH"): "Volatile uptrend",
    ("DOWN", "LOW"): "Quiet downtrend", ("DOWN", "NORMAL"): "Downtrend", ("DOWN", "HIGH"): "Market stress",
}
LOW_Q, HIGH_Q = 0.33, 0.80


def load(name: str) -> pd.DataFrame:
    d = pd.DataFrame(json.loads((RAW / f"{name}.json").read_text(encoding="utf-8")))
    d["date"] = pd.to_datetime(d["date"])
    return d.drop_duplicates("date").sort_values("date").set_index("date")


def build() -> dict:
    idx, vix = load("_INDEX"), load("_VIX")
    close = idx["adjClose"]
    frame = pd.DataFrame({"close": close, "vix": vix["close"].reindex(close.index, method="ffill")})
    frame["sma200"] = frame["close"].rolling(200).mean()
    cut = frame[(frame.index < pd.Timestamp(HOLDOUT_START)) & frame["vix"].notna() & frame["sma200"].notna()]
    c_low, c_high = (float(x) for x in cut["vix"].quantile([LOW_Q, HIGH_Q]))

    def label(row):
        trend = "UP" if row["close"] > row["sma200"] else "DOWN"
        v = "LOW" if row["vix"] < c_low else ("HIGH" if row["vix"] >= c_high else "NORMAL")
        return pd.Series({"trend": trend, "vol": v})

    ok = frame.dropna()
    lab = ok.apply(label, axis=1)
    r = frame["close"].pct_change()
    fwd_ret = frame["close"].shift(-5) / frame["close"] - 1
    fwd_vol = pd.concat([r.shift(-k) ** 2 for k in range(1, 6)], axis=1).mean(axis=1) ** 0.5
    fwd_dd = pd.concat([frame["close"].shift(-k) / frame["close"] - 1 for k in range(1, 6)], axis=1).min(axis=1)
    st = lab.join(pd.DataFrame({"fwd_ret": fwd_ret, "fwd_vol": fwd_vol, "fwd_dd": fwd_dd})).dropna()
    table = []
    for (t, v), g in st.groupby(["trend", "vol"]):
        table.append({"regime": NAMES[(t, v)], "trend": t, "vol": v, "days": int(len(g)), "share": float(len(g) / len(st)),
                      "meanFwd5dVol": float(g["fwd_vol"].mean()), "meanFwd5dReturn": float(g["fwd_ret"].mean()),
                      "pFwd5dDrawdownOver3pct": float((g["fwd_dd"] < -0.03).mean())})
    table.sort(key=lambda x: x["meanFwd5dVol"])
    cfg = {"index": "^NSEI", "vix": "^INDIAVIX", "trendRule": "close > SMA(200)", "vixLowCutoff": c_low, "vixHighCutoff": c_high,
           "cutoffQuantiles": [LOW_Q, HIGH_Q], "cutoffsFitUntil": HOLDOUT_START, "sampleRange": [str(st.index.min().date()), str(st.index.max().date())],
           "names": {f"{t}|{v}": n for (t, v), n in NAMES.items()}, "historical": table,
           "note": "Descriptive statistics over 2011-2026 (index only). Volatility separation is the intended use; mean returns are not a signal."}
    (ROOT / "lib" / "ml" / "regimes.json").write_text(json.dumps(cfg, indent=2), encoding="utf-8")

    pick = st.iloc[np.linspace(0, len(st) - 1, 30).astype(int)].index
    cases = []
    for d in pick:
        cases.append({"date": str(d.date()), "close": float(ok.loc[d, "close"]), "sma200": float(ok.loc[d, "sma200"]),
                      "vix": float(ok.loc[d, "vix"]), "expected": NAMES[(lab.loc[d, "trend"], lab.loc[d, "vol"])]})
    (ROOT / "tests" / "ml" / "fixtures").mkdir(parents=True, exist_ok=True)
    (ROOT / "tests" / "ml" / "fixtures" / "regime-parity.json").write_text(json.dumps({"cases": cases}, indent=1), encoding="utf-8")
    return cfg


if __name__ == "__main__":
    c = build()
    print(f"VIX cutoffs: low<{c['vixLowCutoff']:.2f} high>={c['vixHighCutoff']:.2f}")
    for t in c["historical"]:
        print(f"{t['regime']:18s} days={t['days']:5d} share={t['share']:.1%} fwdVol={t['meanFwd5dVol']:.4f} fwdRet={t['meanFwd5dReturn']:+.4f} P(dd>3%)={t['pFwd5dDrawdownOver3pct']:.1%}")
