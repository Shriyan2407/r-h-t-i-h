# The investment committee: seven agents

One question goes to the orchestrator ([ORCHESTRATOR.md](ORCHESTRATOR.md)), which convenes only the agents the
question needs. Each agent is a deterministic analysis function over real data. None of them calls an LLM, and none
invents a value it was not given: a missing input is listed in `missingData` and lowers the agent's confidence.
The only LLM step is optional and comes after the decision: Claude may reword the memo's thesis ([EVIDENCE_ENGINE.md](EVIDENCE_ENGINE.md)).

Code: `lib/agents/` (one file per agent). Tests: `tests/agents/`.

## Shared contract

Every agent returns an `AgentResult` (`lib/agents/schema.ts`, validated with Zod):

| Field | Meaning |
|---|---|
| `status` | `success`, `partial` (ran with gaps) or `failed` (threw, timed out, or returned an invalid result) |
| `view` | `bullish`, `lean_bullish`, `neutral`, `lean_bearish`, `bearish` or `no_view` |
| `confidence` | 0-1 **input coverage**: the share of the inputs the agent needs that were present and fresh. Not a probability. |
| `claims` | Sentences with `[ID]` citations; every cited id must exist in the agent's `evidence` or the result is failed |
| `evidence` | Items with kind, value, display text, source, data timestamp and source reliability ([EVIDENCE_ENGINE.md](EVIDENCE_ENGINE.md)) |
| `metrics`, `risks`, `catalysts`, `disagreements`, `missingData` | Structured outputs the CIO and memo use |
| `details` | Agent-specific structure (below) |

A result that fails validation becomes a `failed` result. It is never repaired or filled in.

## 1. Investment Strategist (`strategist.ts`, evidence prefix `S`)

| | |
|---|---|
| Inputs | NIFTY 50 and India VIX daily bars; macro quotes (India VIX, USD/INR, US 10Y, Brent, S&P 500 1-month change); the stock's NIFTY sector index 1-week change |
| Regime | `lib/ml/regime.ts`: NIFTY vs its 200-day average and India VIX cut-offs fit on pre-2025 data, with what historically followed each regime (5-day volatility, share of 5-day windows with a >3% drawdown) |
| Scenarios | Base: the current regime persists. Bull: a shift to "Calm uptrend". Bear: a shift to "Market stress". Each uses that regime's historical statistics, not invented probabilities. |
| View | At most `lean`: an uptrend without high volatility gives `lean_bullish`; a downtrend with high volatility gives `lean_bearish`; anything else is `neutral`. Regimes describe risk, not expected return. |
| Not available | RBI policy rate and stance, CPI, GDP/PMI: no data feed. Reported as `DATA_UNAVAILABLE`. |

## 2. Quantitative Analyst (`quant.ts`, prefix `Q`)

Six published rules on adjusted daily bars, each adding to a rule score:

| Rule | +score | -score |
|---|---|---|
| 200-day trend (close and 50-day vs 200-day average) | uptrend +1 | downtrend -1 |
| 6-month return | > +10%: +1 | < -10%: -1 |
| 12-month return excluding the last month | > +15%: +1 | < -15%: -1 |
| MACD(12,26,9) histogram | > 0: +0.5 | < 0: -0.5 |
| Distance from 52-week high | within 5%: +0.5 | more than 30% below: -0.5 |
| RSI(14) | | > 75 (overbought): -0.5 |

The score maps to a view: ≥ 2.5 bullish, ≥ 1 lean bullish, ≤ -2.5 bearish, ≤ -1 lean bearish, otherwise neutral.

Reported **separately** and never merged:

| Quantity | Source |
|---|---|
| Signal | The rule score and view above |
| Probability | Always unavailable: no direction model passed validation ([MODEL_EVALUATION.md](MODEL_EVALUATION.md)) |
| Confidence | Coverage of: price history, 200 days for the trend, the index (for beta), the volatility forecast. Halved when the latest bar is more than 4 days old. |
| Historical reliability | The registered volatility model's walk-forward and holdout validation; plus a descriptive, **in-sample** study of how often 20-day windows rose when price was above its 200-day average (labelled as such, never called accuracy) |

Also: beta and correlation to the NIFTY 50 over one year, realised volatility, the volume ratio (5 days vs the prior
60), and the `volatility-ridge` 5-day forecast with its 80% range. For portfolios it reports trend breadth (share of
holdings in up- and downtrends, median 6-month return).

## 3. Fundamental Analyst (`fundamental.ts`, prefix `F`)

Reported ratios scored against fixed thresholds; each area's score is the mean points per scored rule in [-1, 1]:

| Area | Rules |
|---|---|
| Growth | Revenue and earnings growth: ≥ 15% +1, ≥ 5% +0.5, < 0 -1 |
| Profitability | ROE ≥ 18% +1, ≥ 12% +0.5, < 8% -1; operating margin ≥ 20% +0.5, < 5% -0.5; net margin ≥ 15% +0.5, < 3% -0.5 |
| Financial health | Debt/equity < 50% +1, > 150% -1 (**not scored for banks and lenders**); current ratio < 1 -0.5, ≥ 1.5 +0.5; free cash flow positive +0.5, negative -0.5 |
| Valuation | Trailing P/E < 0 or > 60: -1, > 40: -0.5, < 15: +0.5; EV/EBITDA > 30: -0.5, < 10: +0.5; PEG (trailing P/E / earnings growth, both positive) < 1: +1, > 2.5: -1 |

Grades: mean ≥ 0.5 strong, ≤ -0.25 weak, otherwise adequate. The 0-100 score is `50 + 40 × mean(area scores)`
and needs at least two areas with data. View: ≥ 70 bullish, ≥ 58 lean bullish, ≤ 30 bearish, ≤ 42 lean bearish.

`DATA_UNAVAILABLE`: ROCE and interest coverage (not in the feed), FCF yield (no market capitalisation in the feed),
and moat, market share, pricing power and management quality (no data source; never estimated). Trailing and
forward P/E are separate fields; forward P/E is never reported as trailing.

## 4. Intelligence & Sentiment Analyst (`intelligence.ts`, prefix `N`)

- Headlines from the news aggregator from the last 14 days with relevance ≥ 0.3, de-duplicated, at most 10.
- Each headline is evidence with publisher, link (http/https only), publish time and a publisher-tier reliability.
- Catalyst types by keyword: earnings, corporate action, deal, regulatory, analyst rating, management, product.
- Tone is the aggregator's **keyword** classification, weighted by reliability. Headlines alone move the view at
  most to `lean_bullish` / `lean_bearish`, and only with at least three items and a clear balance (|balance| ≥ 0.4).
- Wording is fixed: headlines are "possibly related, not verified as a cause". Nothing is called "breaking"; the age
  in hours is shown instead.
- Instruction-like headlines are quarantined (see [EVIDENCE_ENGINE.md](EVIDENCE_ENGINE.md#prompt-injection)).
- `DATA_UNAVAILABLE`: insider disclosures, institutional (FII/DII) flows per stock, earnings/events calendar.

## 5. Risk & Portfolio Manager (`risk.ts`, prefix `R`)

Uses the portfolio risk engine (`lib/portfolio/risk.ts`) for a single stock (as a one-holding portfolio), the
user's saved holdings, or a basket built from named candidates.

| Measure | Definition |
|---|---|
| Volatility, beta, max drawdown, Sharpe, Sortino | One year of daily returns; annualised with 252 days; risk-free rate 0 |
| VaR / CVaR | Empirical 1-day 95%; CVaR is the mean loss at and beyond the VaR cut-off |
| Liquidity | 20-day average traded value |
| Stress tests | Replays of real windows (COVID crash Jan-Mar 2020, 2022 rate-hike sell-off) using each holding's actual price change, ordered by the user's scenario; beta-scaled NIFTY -10% / -20% and a -20% top-sector shock **labelled hypothetical**; a stressed-volatility VaR. Windows the history does not cover are reported, not estimated. |

Risk level from annualised volatility (< 20% low, < 35% medium, < 55% high, else extreme), bumped one level each for
a one-year drawdown worse than -40%, CVaR above 6% a day, or average traded value under ₹1 crore (and, for
portfolios, a largest holding above 25%).

Position ceiling (a risk-budget rule, not a recommendation): `min(cap, budget / annualised volatility)` with budget
and cap of 1.5% / 5% (conservative), 2.5% / 10% (moderate, also used when no profile is stated, which is said), and
4% / 15% (aggressive). Baskets use inverse-volatility weights capped at 25% / 30% / 40% (raised to 1/n when fewer
names make the cap infeasible).

**View is never bullish**: low or medium risk is `neutral`, high is `lean_bearish`, extreme is `bearish`. The CIO
also uses the risk level as a cap.

## 6. Research / Contrarian Analyst (`contrarian.ts`, prefix `C`)

Runs after the analysts. The emerging thesis is the confidence-weighted mean of their views (≥ 0.5 bullish,
≤ -0.5 bearish, otherwise "no edge"). It then applies fixed challenges and scores them:

| Challenge (bullish thesis) | Severity |
|---|---|
| Trailing P/E > 60 / > 40 | 3 / 2 |
| PEG > 2 | 2 |
| Price > 25% above its 200-day average | 2 |
| RSI > 70 | 1 |
| Risk agent rates HIGH / EXTREME | 2 / 3 |
| Fundamental view negative | 2 |
| Negative regulatory headline | 2 |
| High-volatility market regime | 1 |

| Challenge (bearish thesis) | Severity |
|---|---|
| Fundamental view positive | 2 |
| P/E < 15 or PEG < 1 | 2 |
| RSI < 30 | 1 |
| Risk only LOW / MEDIUM | 1 |
| Positive catalysts in the news | 1 |

| Challenge (any thesis) | Severity |
|---|---|
| Analysts point in opposite directions | 2 |
| One / two or more agents had no usable data | 1 / 2 |
| No validated direction model (directional theses only) | 1 |
| The trend statistic is in-sample on a surviving company (survivorship and look-back bias) | 1 |

Survival score = 100 - 10 × total severity. ≥ 65 **THESIS SURVIVES**, ≥ 35 **THESIS WEAKENED**, otherwise
**THESIS INVALIDATED**. The contrarian never adds conviction: its view is neutral unless the thesis is invalidated,
when it leans against it. Every challenge that uses data re-cites the original evidence under a `C` id whose label
names the agent and original id.

## 7. CIO / Investment Committee (`cio.ts`)

No LLM. The decision follows published rules:

1. **Sufficiency.** A blocked question (unsupported asset, too few candidates) or too little usable evidence
   (no usable quant or fundamental result; for valuation no fundamental result; for risk questions no risk result)
   gives `INSUFFICIENT DATA`. Explanatory questions ("why did it fall?", market outlook) get no decision.
2. **Weighting.** Effective weight = role weight × horizon multiplier × evidence quality, where quality =
   confidence × mean source reliability × share of fresh evidence.

   | Intent | Role weights |
   |---|---|
   | Investment decision | fundamental 0.30, quant 0.25, risk 0.25, strategist 0.10, intelligence 0.10 |
   | Valuation | fundamental 0.50, risk 0.25, quant 0.15, intelligence 0.10 |
   | Risk assessment | risk 0.50, quant 0.30, strategist 0.20 |
   | Portfolio review / construction | risk 0.35, quant 0.25, fundamental 0.25, strategist 0.15 |

   A long horizon multiplies fundamental by 1.5 and quant/intelligence by 0.6; a short horizon the reverse.
3. **Disagreements.** Every pair with opposite views is listed with the side that carried more effective weight.
4. **Mapping** (weighted score from -2 to +2): ≥ 1.5 STRONG BUY, ≥ 1.0 BUY, ≥ 0.5 ACCUMULATE, > -0.5 HOLD,
   > -1.0 REDUCE (held) or WATCH (not held), otherwise SELL (held) or AVOID (not held).
5. **Overrides.** Risk HIGH caps at ACCUMULATE; EXTREME caps at WATCH. A weakened thesis lowers a buy-side decision
   one step and an invalidated thesis two steps (not below HOLD). STRONG BUY also needs no disagreement, at least two
   outright bullish analysts, a surviving thesis, low or medium risk and at least 80% of analysts reporting.

**Conviction** (0-100) = strength of the score × share of analysts reporting × share of agent pairs that agree. It
measures how strong and consistent the evidence is. It is not a probability of profit and is labelled that way.

The memo (`memo.ts`) is assembled from the agents' cited claims: verdict, thesis, why, per-agent views,
disagreements, bull/base/bear cases, catalysts, risks, what would change the committee's mind, the data used and
disclaimers.
