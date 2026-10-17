"""Dataset loading and leakage-safe time splitting.

All splitting is by DATE across the whole panel (every ticker shares the same boundaries), and
training rows are purged when their label window overlaps the evaluation period. Random k-fold
is never used: neighbouring days share 4 of 5 label days and cross-sectional rows on one date
share the same market move, so random splits leak the future into training.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "ml" / "data"
META = json.loads((DATA / "dataset.meta.json").read_text(encoding="utf-8"))
FEATURES: list[str] = list(META["features"])
HORIZON = int(META["horizonBars"])


def load_dataset(path: Path | None = None) -> pd.DataFrame:
    df = pd.read_csv(path or (DATA / "dataset.csv"), dtype={"ticker": "string"})
    df["date"] = pd.to_datetime(df["date"])
    df["exit_date"] = pd.to_datetime(df["exit_date"])
    df = df.sort_values(["date", "ticker"], kind="stable").reset_index(drop=True)
    return df


def assert_no_leakage(train: pd.DataFrame, test: pd.DataFrame, gap_days: int = 0) -> None:
    """Raise if any training label window reaches the test period, or any key appears in both."""
    if len(train) == 0 or len(test) == 0:
        return
    test_start = test["date"].min()
    if train["exit_date"].max() >= test_start - pd.Timedelta(days=gap_days):
        raise AssertionError(
            f"train labels end {train['exit_date'].max().date()} which reaches test start {test_start.date()}"
        )
    if train["date"].max() >= test_start:
        raise AssertionError("train decision dates overlap the test period")
    k_tr = set(zip(train["ticker"], train["date"]))
    k_te = set(zip(test["ticker"], test["date"]))
    if k_tr & k_te:
        raise AssertionError("duplicate (ticker, date) observations across train and test")


@dataclass(frozen=True)
class Fold:
    index: int
    train_end: pd.Timestamp   # exclusive upper bound on training *exit_date*
    test_start: pd.Timestamp  # inclusive
    test_end: pd.Timestamp    # exclusive


def make_folds(first_test: str, last_end: str, months: int = 6) -> list[Fold]:
    """Contiguous test blocks of `months` months starting at `first_test`, ending before `last_end`."""
    folds: list[Fold] = []
    start = pd.Timestamp(first_test)
    stop = pd.Timestamp(last_end)
    i = 1
    while start < stop:
        end = min(start + pd.DateOffset(months=months), stop)
        folds.append(Fold(i, start, start, end))
        start = end
        i += 1
    return folds


def split_fold(df: pd.DataFrame, fold: Fold) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Expanding window. Train rows must have their label fully observed before the test starts."""
    train = df[df["exit_date"] < fold.test_start]
    test = df[(df["date"] >= fold.test_start) & (df["date"] < fold.test_end)]
    assert_no_leakage(train, test)
    return train, test


def split_calibration(train: pd.DataFrame, calib_days: int = 365) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Last `calib_days` of the training window -> calibration set; model fit on the rest, with the
    fit set purged so its labels end before the calibration period begins."""
    cut = train["date"].max() - pd.Timedelta(days=calib_days)
    fit = train[train["exit_date"] < cut]
    calib = train[train["date"] >= cut]
    assert_no_leakage(fit, calib)
    return fit, calib


def winsor_bounds(x: np.ndarray, lo: float = 0.01, hi: float = 0.99) -> tuple[np.ndarray, np.ndarray]:
    return np.quantile(x, lo, axis=0), np.quantile(x, hi, axis=0)
