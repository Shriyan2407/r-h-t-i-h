"""Model zoo. Fixed, conservative hyper-parameters: NO tuning on test folds.

Every model exposes fit(X, y) and predict_proba1(X). Rule baselines expose only a score.
"""
from __future__ import annotations

import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression

from .common import FEATURES, winsor_bounds

IDX = {n: i for i, n in enumerate(FEATURES)}


class Prior:
    """Naive baseline: always predicts the training positive rate."""
    name = "naive_prior"
    kind = "baseline"

    def fit(self, X, y):
        self.p = float(np.mean(y))
        return self

    def predict_proba1(self, X):
        return np.full(len(X), self.p)


class Logistic:
    name = "logistic_l2"
    kind = "ml"

    def __init__(self, C: float = 0.05):
        self.C = C

    def fit(self, X, y):
        self.lo, self.hi = winsor_bounds(X)
        Z = np.clip(X, self.lo, self.hi)
        self.mu, self.sd = Z.mean(0), Z.std(0)
        self.sd[self.sd == 0] = 1.0
        self.m = LogisticRegression(C=self.C, max_iter=500, solver="lbfgs").fit((Z - self.mu) / self.sd, y)
        return self

    def transform(self, X):
        return (np.clip(X, self.lo, self.hi) - self.mu) / self.sd

    def predict_proba1(self, X):
        return self.m.predict_proba(self.transform(X))[:, 1]

    def decision(self, X):
        return self.m.decision_function(self.transform(X))


class Forest:
    name = "random_forest"
    kind = "ml"

    def fit(self, X, y):
        self.m = RandomForestClassifier(
            n_estimators=200, max_depth=6, min_samples_leaf=500, max_features="sqrt",
            n_jobs=-1, random_state=7,
        ).fit(X, y)
        return self

    def predict_proba1(self, X):
        return self.m.predict_proba(X)[:, 1]


class Boosting:
    """Histogram gradient boosting (same algorithm family as LightGBM). Shallow + regularised."""
    name = "hist_gradient_boosting"
    kind = "ml"

    def fit(self, X, y):
        self.m = HistGradientBoostingClassifier(
            max_depth=3, learning_rate=0.05, max_iter=200, min_samples_leaf=500,
            l2_regularization=10.0, early_stopping=False, random_state=7,
        ).fit(X, y)
        return self

    def predict_proba1(self, X):
        return self.m.predict_proba(X)[:, 1]


class Rule:
    """Hand-written signal from the existing product logic, evaluated as a ranking score only."""
    kind = "rule"

    def __init__(self, name: str, fn):
        self.name, self.fn = name, fn

    def fit(self, X, y):
        return self

    def score(self, X):
        return self.fn(X)


RULES = [
    # Existing scoring engine: RSI<30 is "oversold = buy" (mean reversion).
    Rule("rule_rsi_meanreversion", lambda X: -X[:, IDX["rsi_14"]]),
    # Trend-following reading of the same indicator family (above EMA50 = bullish).
    Rule("rule_trend_ema50", lambda X: X[:, IDX["close_ema50"]]),
    Rule("rule_momentum_ret20", lambda X: X[:, IDX["ret_20"]]),
    Rule("rule_macd_hist", lambda X: X[:, IDX["macd_hist"]]),
]


def ml_models():
    return [Prior(), Logistic(), Forest(), Boosting()]


class PlattCalibrator:
    """Sigmoid calibration on a held-out slice: p' = sigmoid(a * logit(p) + b). Two parameters, so it
    cannot overfit a weak signal the way isotonic regression does."""

    def fit(self, p, y):
        p = np.clip(p, 1e-6, 1 - 1e-6)
        z = np.log(p / (1 - p)).reshape(-1, 1)
        self.m = LogisticRegression(C=1e6, max_iter=200).fit(z, y)
        return self

    def predict(self, p):
        p = np.clip(p, 1e-6, 1 - 1e-6)
        return self.m.predict_proba(np.log(p / (1 - p)).reshape(-1, 1))[:, 1]
