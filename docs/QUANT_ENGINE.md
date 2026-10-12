# Quant engine

## 1. The production scoring system (`lib/scoring/quantEngine.ts`)

A transparent rule table, deterministic and reproducible. **It is a heuristic, not a model:
nothing here has been fitted to or tested against historical outcomes.**

Each sub-score starts at 50 and adds or subtracts fixed amounts, clamped to 0–100.

| Score | Rules (summary) |
|---|---|
| Technical | RSI (<30 +12, <45 +6, >70 −12, >55 −4, else +2); MACD cross/histogram ±10/±5; price vs EMA 20/50/200 (+15 all aligned, +6 above 200, −10/−6 below); Bollinger position (+8 near lower, −6 near upper); ADX (+5 >25, −3 <15); stochastic (+8 / −8 at extremes) |
| Momentum | Trend and strength (±12/±20); position in 52-week range (+8 … −10); price vs VWAP (±5); OBV sign (±3) |
| Fundamental | P/E bands, ROE, revenue growth, net margin, debt/equity, P/B, free-cash-flow sign |
| Volatility | ATR as % of price; Bollinger width — higher = calmer |
| Risk | current ratio, debt/equity, promoter holding, pledged shares, FCF sign |

Composite = `0.30·technical + 0.25·momentum + 0.25·fundamental + 0.10·volatility + 0.10·risk`.

Verdict from composite: ≥72 STRONG BUY · ≥60 BUY · ≥43 HOLD · ≥30 SELL · else STRONG SELL.

**Signal strength** = `|bullish − bearish| / (bullish + bearish) · 100` over the signals that fired
(0 if none). It measures agreement between rules. It is **not a probability** and must not be
described as confidence or accuracy.

Unit tests (`tests/data/signal-strength.test.ts`) pin the signal-strength definition and
the absence of any invented confidence. The weights and thresholds themselves are untested
against outcomes.

### Known limitations

- Weights and thresholds are arbitrary; several rules overlap (RSI, stochastic and Bollinger all reward "oversold").
- The scoring treats missing data as neutral rather than reducing the strength of the output.
- Indicators come from daily Yahoo data; there is no intraday model.
- No transaction costs, slippage, sector adjustment or regime awareness.

## 2. The research package (`backend/quant`, NOT in this repository, NOT deployed)

Design intentions visible in the source (not demonstrated results):

- Features shifted one bar so a feature at T only uses data up to T−1.
- Label = forward N-bar return **net of round-trip costs**, thresholded into {−1, 0, +1}.
- Time-ordered train/validation/test split with a gap; a walk-forward validator;
  XGBoost / LightGBM / Random Forest / LSTM / Transformer / RL and a stacking ensemble.
- Metrics code for Sharpe, Sortino, drawdown, profit factor.

Verified gaps:

- **No data, trained model files or result tables exist** in the tree.
- Its dependencies (xgboost, lightgbm, torch, …) are absent from `requirements.txt`.
- The HTTP router (`api/routes/quant.py`) fails to import, references undefined names (`pd`,
  `prepare_train_test_split`) in `/backtest`, and trains a model on every GET request.
- Therefore **no performance claim can be made for it.**

## 3. Evidence required before claiming any predictive ability

A model is only described as predictive after all of these exist and are reproducible from the repo:

1. A documented dataset (source, period, survivorship handling, corporate-action adjustment).
2. Fixed feature list and label definition; no look-ahead (tests that shift/purge correctly).
3. Walk-forward evaluation with an untouched final test period.
4. Reported: accuracy, precision, recall, F1, **calibration curve / Brier score**, Sharpe, Sortino,
   max drawdown, win rate, profit factor, trade count — all **after** costs and slippage.
5. Comparison against simple baselines (buy-and-hold, momentum, the rule score above).
6. Confidence intervals / multiple-testing awareness (a strategy picked from many trials is overfit by default).

Until then the product shows signal strength and "confidence unavailable".
