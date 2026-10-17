# ML pipeline

How the dataset is built, how models are trained and validated, and how leakage is prevented. Results:
[MODEL_EVALUATION.md](MODEL_EVALUATION.md). Registry: [MODEL_REGISTRY.md](MODEL_REGISTRY.md).

## Reproduce

```bash
npm run ml:download                      # ml/data/raw/*.json (gitignored) + ml/data/manifest.json
npm run ml:dataset                       # ml/data/dataset.csv (gitignored) + dataset.meta.json + quality.json
pip install -r ml/requirements.txt       # numpy 2.5.2, pandas 3.0.5, scikit-learn 1.9.1, scipy 1.18.1 (Python 3.12)
python -m ml.train.walkforward           # direction, absolute target   -> reports/walkforward.json
python -m ml.train.walkforward rel       # direction, relative target   -> reports/walkforward_rel.json
python -m ml.train.eligibility           # pre-registered gate          -> reports/eligibility.json
python -m ml.train.vol                   # volatility study             -> reports/volatility.json
python -m ml.train.final_vol holdout     # ONE-SHOT holdout (refuses a second run)
python -m ml.train.final_vol export      # lib/ml/artifacts/volatility-ridge-<v>.json
python -m ml.train.final_vol parity      # tests/ml/fixtures/volatility-parity.json
python -m ml.train.regimes               # lib/ml/regimes.json + regime parity fixture
python -m ml.train.registry              # lib/ml/registry.json
python -m ml.render_report               # tables in docs/MODEL_EVALUATION.md
```

Yahoo revises adjusted prices, so a fresh download changes file hashes. The manifest and `datasetSha256` recorded in
the registry identify exactly what a registered model saw.

## Data

| Item | Value |
|---|---|
| Source | Yahoo Finance `chart` API, daily, with `adjclose` |
| Universe | 48 current Nifty 50 symbols requested, **47 used** (`TATAMOTORS` no longer resolves after its demerger) |
| Market series | `^NSEI` (NIFTY 50), `^INDIAVIX` |
| Raw range | 2010-01-04 to 2026-10-12 (SBILIFE/HDFCLIFE from 2017, COALINDIA from Nov 2010) |
| Labelled rows | 178,484 rows, decision dates 2011-01-03 to 2026-10-01 |
| Positive rate | 51.9% (5-day return > 0) |
| Quality audit | 0 duplicate dates, 0 out-of-order rows, 219 zero-volume days, 45 gaps > 5 days, 10 daily moves > 25% |

The 10 large moves were checked one by one: Adani (Jun 2015, May 2019, Feb 2023 Hindenburg), the COVID crash
(23 Mar 2020), IndusInd Bank (Mar 2020, Mar 2025), SBI recapitalisation (Oct 2017), and Nestlé's 2010 split, which
falls before the first usable feature date. Real events are kept; removing crashes would flatter every model.

### Known biases

- **Survivorship**: training uses only today's index members, which overstates returns (measured: 0.242% vs 0.099%
  mean 5-day return for 25 former members). Historical membership dates are not available, so the bias cannot be
  removed from training; instead the deployed model is tested on the 25 former members (`ML_SET=former`,
  `python -m ml.train.survivorship`): it beats persistence on all 25. Delisted companies with no remaining price
  history (e.g. HDFC Ltd after its merger) cannot be tested.
- **Large caps only**: behaviour on mid/small caps is untested.
- **Adjusted prices**: features use split/dividend-adjusted OHLC (factor `adjClose / close`); Yahoo adjustments can be wrong.

## Features (`lib/ml/features.ts`, version `f1`)

One implementation used for both the training CSV and live inference, so there is no train/serve skew.

| Group | Features |
|---|---|
| Price action | `ret_1`, `ret_5`, `ret_10`, `ret_20`, `ret_60`, `gap`, `hl_range`, `eff_ratio_20`, `dd_252`, `range_pos_252` |
| Trend / momentum | `rsi_14`, `macd_hist`, `close_ema20`, `close_ema50`, `sma50_sma200`, `adx_14` |
| Volatility | `atr_pct`, `bb_width`, `rv_20`, `rv_ratio_20_60` |
| Volume | `vol_ratio_5_20` |
| Market | `idx_ret_5`, `idx_ret_20`, `idx_vol_20`, `idx_dd_252`, `rel_str_20`, `beta_60`, `corr_60` |
| Volatility regime | `vix_level`, `vix_chg_5` |

**Not used** (no point-in-time history in the source, so using today's values for past dates would leak the future):
P/E, P/B, EPS and revenue growth, margins, ROE, debt/equity, free cash flow, news sentiment, interest rates,
inflation, currency, commodities.

## Targets and why

| Target | Definition | Why |
|---|---|---|
| `pos_ret_5d` | 1 if `close[t+5] / open[t+1] - 1 > 0` | Matches what a user could trade: decide at close *t*, enter at the next open, hold 5 days. Same convention as the backtester. |
| beats median | 1 if that return beats the same day's cross-sectional median | Removes the market-wide move, which the features cannot predict; tests stock selection only. |
| `log_rv5` | `log(max(RMS of daily returns t+1..t+5, 1e-4))` | Volatility clusters, so it is plausibly forecastable; useful for sizing and risk. |

## Leakage prevention

| Risk | Control | Test |
|---|---|---|
| Future data in features | Every indicator is causal; index/VIX are forward-filled only from earlier dates | `tests/ml/features.test.ts`: truncating all future data leaves row *t* identical; tampering with future prices changes nothing earlier |
| Overlapping labels across the split | Train rows kept only if their label **exit date** is before the test start (purge) | `test_purge_actually_removes_boundary_rows` |
| Naive date split | Detector raises when train labels reach the test period | `test_naive_split_would_leak_and_detector_catches_it` |
| Duplicate observations | `(ticker, date)` uniqueness in dataset and across splits | `validateDataset`, `assert_no_leakage` |
| Calibration on test data | Calibration uses the last 365 days of the *training* window, purged | `test_calibration_split_is_purged` |
| Tuning on the test set | Fixed hyper-parameters; no search | `ml/train/models.py`, `ml/train/vol.py` |
| Peeking at the holdout | Holdout (>= 2025-10-01) scored once by a guard that refuses re-runs | `final_vol.holdout()`; the one deliberate second look is recorded |
| Train/serve skew | Same TS feature code; Python vs TS predictions match to 1e-6 on 25 real rows | `tests/ml/volatility.test.ts` |

## Validation

- **Walk-forward**: expanding window, 14 contiguous six-month test blocks from 2019-01-01 to 2025-10-01; all tickers
  share the same date boundaries (no cross-sectional leakage on one date).
- **Final holdout**: 2025-10-01 to 2026-10-01 (11,656 rows), untouched until a single model was chosen.
- **Direction metrics**: ROC-AUC, PR-AUC, Brier, Brier skill vs base rate, ECE, reliability table, accuracy,
  precision, recall, F1, daily rank IC with overlap-adjusted t-stat, and a cost-aware strategy
  (long top 20% by score, non-overlapping 5-day cohorts, 15 bps per side): Sharpe, Sortino, max drawdown, win rate,
  profit factor, versus the equal-weight universe.
- **Volatility metrics**: OOS R² vs a naive mean, MSE vs persistence, MAE, fold win count, 80% interval coverage,
  own-volatility monotonicity.

## Models compared

| Model | Family | Hyper-parameters (fixed) |
|---|---|---|
| naive prior / naive mean | baseline | — |
| rule baselines | the product's former indicator rules as scores | — |
| logistic_l2 | logistic regression | C = 0.05, winsorised 1/99%, standardised |
| random_forest | random forest | 200 trees, depth 6, min leaf 500 |
| hist_gradient_boosting | histogram gradient boosting (LightGBM-style) | depth 3, lr 0.05, 200 iterations, min leaf 500, L2 10 |
| persist_ols / har_ols | volatility baselines (persistence, HAR-style) | OLS |
| ridge_all | ridge regression | alpha 100, winsorised, standardised; log-only volatility features (v1.1) |
| hgb_reg | gradient-boosted regression | as above |

XGBoost/LightGBM and SHAP were not installed: histogram gradient boosting is the same model family, and the
deployed model is linear, so each feature's contribution (coefficient x standardised, winsorised value, relative to the
training mean) is exactly its SHAP value for that model under the independence assumption, with no SHAP library
needed. The UI sums these by feature group ("Own volatility", "India VIX", ...).

## Calibration

Direction models: Platt (sigmoid) calibration on the purged calibration slice. Isotonic was not used because it overfits
a near-zero signal. Even after calibration, Brier skill stayed at or below 0. Volatility intervals: 10th/90th
percentiles of calibration-slice residuals; measured coverage 79.3% (walk-forward) and 79.6% (holdout) against a
nominal 80%.
