import unittest

import numpy as np
import pandas as pd

from ml.train.common import Fold, assert_no_leakage, make_folds, split_calibration, split_fold
from ml.train.metrics import classification_metrics, expected_calibration_error
from ml.train.strategy import cohort_returns, perf


def panel(n_days=600, tickers=("A", "B"), horizon=5):
    days = pd.bdate_range("2018-01-01", periods=n_days)
    rows = []
    for t in tickers:
        for i in range(n_days - horizon):
            rows.append({"ticker": t, "date": days[i], "exit_date": days[i + horizon], "fwd_ret": 0.001 * (i % 7 - 3), "label": int(i % 2)})
    return pd.DataFrame(rows).sort_values(["date", "ticker"]).reset_index(drop=True)


class SplitTests(unittest.TestCase):
    def setUp(self):
        self.df = panel()

    def test_train_labels_never_reach_test_period(self):
        for f in make_folds("2019-06-01", "2020-04-01", months=3):
            tr, te = split_fold(self.df, f)
            self.assertLess(tr["exit_date"].max(), f.test_start)
            self.assertGreaterEqual(te["date"].min(), f.test_start)
            self.assertLess(te["date"].max(), f.test_end)

    def test_purge_actually_removes_boundary_rows(self):
        f = Fold(1, pd.Timestamp("2019-06-03"), pd.Timestamp("2019-06-03"), pd.Timestamp("2019-09-03"))
        tr, _ = split_fold(self.df, f)
        # Rows decided in the 5 days before test start have labels that straddle it: must be excluded.
        straddling = self.df[(self.df.date < f.test_start) & (self.df.exit_date >= f.test_start)]
        self.assertGreater(len(straddling), 0)
        self.assertEqual(len(tr.merge(straddling, on=["ticker", "date"])), 0)

    def test_naive_split_would_leak_and_detector_catches_it(self):
        f = Fold(1, pd.Timestamp("2019-06-03"), pd.Timestamp("2019-06-03"), pd.Timestamp("2019-09-03"))
        naive_train = self.df[self.df.date < f.test_start]  # no purge
        test = self.df[(self.df.date >= f.test_start) & (self.df.date < f.test_end)]
        with self.assertRaises(AssertionError):
            assert_no_leakage(naive_train, test)

    def test_detects_duplicate_observations_across_sets(self):
        tr = self.df.iloc[:10]
        with self.assertRaises(AssertionError):
            assert_no_leakage(tr.assign(exit_date=tr.date), tr.assign(date=tr.date + pd.Timedelta(days=0)).iloc[:1])

    def test_folds_are_contiguous_and_non_overlapping(self):
        fs = make_folds("2019-01-01", "2021-01-01", months=6)
        self.assertEqual(len(fs), 4)
        for a, b in zip(fs, fs[1:]):
            self.assertEqual(a.test_end, b.test_start)

    def test_calibration_split_is_purged(self):
        tr, _ = split_fold(self.df, Fold(1, pd.Timestamp("2019-12-02"), pd.Timestamp("2019-12-02"), pd.Timestamp("2020-03-02")))
        fit, cal = split_calibration(tr, 180)
        self.assertLess(fit["exit_date"].max(), cal["date"].min())


class MetricTests(unittest.TestCase):
    def test_perfect_and_constant_predictions(self):
        y = np.array([0, 1] * 50)
        m = classification_metrics(y, y.astype(float))
        self.assertEqual(m["rocAuc"], 1.0)
        self.assertAlmostEqual(m["brier"], 0.0)
        const = classification_metrics(y, np.full(100, 0.5))
        self.assertIsNone(const["rocAuc"])  # undefined, not 0.5 or 0
        self.assertAlmostEqual(const["brierSkill"], 0.0)

    def test_ece_zero_when_calibrated_and_large_when_not(self):
        rng = np.random.default_rng(0)
        p = rng.uniform(0, 1, 20000)
        y = (rng.uniform(0, 1, 20000) < p).astype(int)
        self.assertLess(expected_calibration_error(y, p), 0.02)
        self.assertGreater(expected_calibration_error(y, np.clip(p + 0.3, 0, 1)), 0.15)

    def test_degenerate_precision_is_none_not_zero(self):
        m = classification_metrics(np.array([0, 1, 0, 1]), np.array([0.1, 0.2, 0.1, 0.2]))
        self.assertIsNone(m["precision"])


class StrategyTests(unittest.TestCase):
    def test_cost_reduces_return_and_oracle_beats_benchmark(self):
        df = panel(400, tickers=tuple("ABCDEFGHIJKLMNOP"))
        rng = np.random.default_rng(1)
        df["fwd_ret"] = rng.normal(0, 0.03, len(df))
        df["oracle"] = df["fwd_ret"]
        free = cohort_returns(df, "oracle", cost_bps=0)
        paid = cohort_returns(df, "oracle", cost_bps=15)
        self.assertLess(paid["net"].mean(), free["net"].mean())
        self.assertGreater(free["gross"].mean(), free["bench"].mean())

    def test_cohorts_do_not_overlap(self):
        df = panel(400, tickers=tuple("ABCDEFGHIJKLMNOP"))
        df["s"] = 1.0
        c = cohort_returns(df, "s")
        gaps = np.diff(pd.to_datetime(c["date"]).values).astype("timedelta64[D]").astype(int)
        self.assertTrue((gaps >= 5).all())

    def test_perf_handles_too_few_cohorts(self):
        self.assertIsNone(perf(np.array([0.01]))["sharpe"])


if __name__ == "__main__":
    unittest.main()
