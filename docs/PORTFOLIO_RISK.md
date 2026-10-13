# Portfolio risk

`GET /api/portfolio/risk` analyses the signed-in user's saved holdings (`lib/portfolio/riskService.ts`,
`lib/portfolio/risk.ts`). It is run on demand from the portfolio page ("Run risk analysis").

## Conventions

- **Current weights held constant** over the last 252 common trading days. This measures the risk of today's
  portfolio, not the user's historical P&L.
- Only dates on which every holding and NIFTY 50 traded are used (no forward fill).
- Daily simple returns; annualised with 252 days; risk-free rate 0.
- Up to 40 holdings; holdings without enough history, with non-positive quantity, or beyond the cap are listed as
  **excluded, with the reason**, never silently dropped.
- Holdings are private: the route logs counts only, never tickers or values.

## Metrics

| Metric | Definition |
|---|---|
| Weights, sector exposure | market value at the last common close / total |
| Concentration | Herfindahl index, effective holdings = 1/HHI, largest and top-5 weights |
| Volatility | annualised std of constant-weight portfolio returns; per holding too |
| Beta, correlation to index | covariance with NIFTY 50 returns / index variance |
| Correlation matrix | pairwise, 1-year daily returns; average pairwise correlation |
| Max drawdown | of the constant-weight return series |
| Sharpe / Sortino | historical, rf = 0, labelled as past |
| VaR 95% (1 day) | empirical 5th-percentile daily loss |
| Risk contribution | Euler decomposition `w_i (Σw)_i / wᵀΣw` (sums to 1) |
| Diversification ratio | `Σ w_i σ_i / σ_p` (>= 1) |
| Liquidity | days to exit = position value / (10% x 20-day average traded value) |
| **Forward volatility (model)** | per-holding 5-day forecasts from `volatility-ridge` combined with historical correlations: `sqrt(Σ_ij w_i w_j σ̂_i σ̂_j ρ_ij)`, with coverage reported |

## Stress scenarios (estimates, not forecasts)

| Scenario | Method |
|---|---|
| NIFTY 50 falls 10% | Σ w_i β_i x (-10%); linear, ignores stock-specific news |
| Largest sector falls 20% | that sector's weight x (-20%); no contagion |
| High-volatility regime | 1-day 95% VaR x 1.84: the ratio of NIFTY volatility in "Market stress" to its average across regimes (2011-2026, `lib/ml/regimes.json`) |
| COVID crash | each holding's actual price change from 2020-01-17 to 2020-03-23 |
| 2022 rate-hike sell-off | each holding's actual price change from 2022-01-17 to 2022-06-17 |

Historical replays report **coverage**: holdings that did not trade through the window are excluded and the result is
rescaled to the covered part, with a note. If nothing is covered the result is "no data", not 0.

## Tests

`tests/portfolio/*`: hand-checkable cases (equal weights give effective N = N; risk contributions sum to 1; perfectly
co-moving series have correlation 1; the index itself has beta 1; a single-stock portfolio equals that stock), stress
arithmetic, replay coverage, exclusions, holding cap, model-implied volatility coverage, and the rendered view.

## Not built

Factor exposures beyond market beta (size, value, momentum), regime-conditional correlations, intraday liquidity,
transaction-cost-aware rebalancing, and any optimisation or recommendation.
