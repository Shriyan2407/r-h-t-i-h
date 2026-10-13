# Backtesting

Two separate things are called "backtest" in this repository. Neither is a prediction.

| | Strategy backtester (product) | ML strategy evaluation (research) |
|---|---|---|
| Where | `lib/backtest/*`, `/backtest`, `POST /api/backtest`, `POST /api/backtest/walk-forward` | `ml/train/strategy.py` inside the walk-forward study |
| What | One stock, one rule (buy & hold, SMA crossover, RSI mean reversion) | Portfolio of the top 20% of 47 stocks by model score |
| Purpose | Let users see how a simple rule behaved | Decide whether a model has economic value |

## Strategy backtester

**Execution.** Long-only, all-in or flat. A strategy's position for bar *t* is computed from bars `0..t` and filled at
the **open of bar t+1**. The last bar's signal is never traded. An open position at the end is marked at the last close,
net of exit costs, and counted as a trade.

**Costs.** Per side: fee (bps) + slippage (bps), applied to every fill. Defaults 10 + 5 bps. Validated bounds 0-100 and
0-200 bps.

**Metrics.** Total return, CAGR, Sharpe and Sortino (0% risk-free, 252 days), max drawdown, win rate, profit factor,
trade count, exposure. Undefined ratios are `null` and shown as "n/a", never 0. A buy-and-hold benchmark is always
returned alongside.

**Walk-forward** (`POST /api/backtest/walk-forward`). For each fold, the candidate rule with the best in-sample Sharpe
on the training window (default 250 bars) is traded on the next unseen window (default 63 bars). Out-of-sample folds
are chained into one equity curve and compared with buy-and-hold. Windows never overlap and never precede training.

**Not modelled.** Dividends (prices are as returned), taxes, position sizing, shorting, leverage, borrow costs,
liquidity limits, survivorship (a user can only test stocks that still trade).

**Tests.** `tests/backtest/*`: next-open fills, final-bar signal ignored, causal strategies (truncating the future does
not change earlier signals), exact round-trip cost, metrics on known series, walk-forward window ordering, request
validation, route auth and rate limits.

## ML strategy evaluation

Every 5th trading date, buy the top 20% of names by out-of-sample score, hold exactly the label window (next open to
close t+5), equal weight, 15 bps per side on every name every cohort (full turnover, conservative). Cohorts do not
overlap, so the series is a valid periodic return series (annualised with 252/5 periods). The benchmark is the
equal-weight average of all names over the same cohorts.

Result: no direction model or rule beat the benchmark (net Sharpe -0.15 to 0.13 vs 0.80). See
[MODEL_EVALUATION.md](MODEL_EVALUATION.md).

## Parameters are never optimised on the test set

The product's strategy parameters are fixed (SMA 20/50 and 10/30, RSI 14 with 30/55). The walk-forward selects among
these candidates using training windows only. The ML study uses fixed hyper-parameters and a final holdout.
