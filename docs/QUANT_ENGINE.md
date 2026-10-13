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
the absence of any invented confidence. The individual rules have since been **evaluated against outcomes** in the
purged walk-forward study (`rule_*` rows in MODEL_EVALUATION.md): rank IC between -0.020 and 0.020, and "above EMA50 =
bullish" is slightly negative. The rule scores are therefore labelled heuristics in the UI and are not predictive.

### Known limitations

- Weights and thresholds are arbitrary; several rules overlap (RSI, stochastic and Bollinger all reward "oversold").
- The scoring treats missing data as neutral rather than reducing the strength of the output.
- Indicators come from daily Yahoo data; there is no intraday model.
- No transaction costs, slippage, sector adjustment or regime awareness.

## 2. The Python research package (retired)

`backend/quant` (outside this repository, never deployed) is retired; see ARCHITECTURE.md. It had no data, trained
models or results. The validated pipeline in `ml/` replaces it.

## 3. Evidence required before claiming any predictive ability

A model is only described as predictive after all of these exist and are reproducible from the repo:

1. A documented dataset (source, period, survivorship handling, corporate-action adjustment).
2. Fixed feature list and label definition; no look-ahead (tests that shift/purge correctly).
3. Walk-forward evaluation with an untouched final test period.
4. Reported: accuracy, precision, recall, F1, **calibration curve / Brier score**, Sharpe, Sortino,
   max drawdown, win rate, profit factor, trade count — all **after** costs and slippage.
5. Comparison against simple baselines (buy-and-hold, momentum, the rule score above).
6. Confidence intervals / multiple-testing awareness (a strategy picked from many trials is overfit by default).

### Status against this bar

| Requirement | Direction models | Volatility model |
|---|---|---|
| 1-2 Dataset, features, labels, leakage tests | done (ML_PIPELINE.md) | done |
| 3 Walk-forward + untouched final period | done; holdout **not used** (no finalist) | done; holdout scored (second look for v1.1.0) |
| 4 Metrics after costs | done | R², MSE, coverage (no trading metrics: it is not a trading signal) |
| 5 Baselines | naive, buy-and-hold, rule scores | naive mean, persistence, HAR-style |
| 6 Multiple testing | 6 models x 2 targets reported, none pass | selection rule pre-registered |
| **Outcome** | **Rejected: not predictive** | **Deployed: volatility-ridge 1.1.0** |

The product still shows signal strength for the rule score and never a direction probability.

## Backtest engine (`lib/backtest/`)

Built and unit-tested (see `tests/backtest/`). It is separate from the verdict scorer above and
makes no claim about the scorer's accuracy.

- **No look-ahead**: a strategy's position for bar *i* is computed from bars `0..i` and filled at
  the **open of bar *i+1***; the last bar's signal is never traded. A test asserts every built-in
  strategy is causal (truncating future bars never changes earlier signals).
- **Costs**: per-side fee (bps) plus slippage (bps) applied to every fill and to the final
  mark-to-market exit.
- **Metrics**: total return, CAGR, Sharpe, Sortino (0% risk-free, 252 days), max drawdown, win
  rate, profit factor, trade count, exposure. Undefined ratios are `null`, never `0`.
- **Walk-forward** (`walkForward.ts`): per fold, choose the best in-sample-Sharpe candidate on
  the training window and evaluate only that choice on the next unseen window; windows never
  overlap. Tested for window ordering; **not yet exposed in the API or UI**.
- **Not done**: precision/recall/F1 and probability calibration (need a classifier, which does not
  exist), dividends/taxes, shorting, position sizing, survivorship-bias handling, any
  claim that these strategies have edge.
