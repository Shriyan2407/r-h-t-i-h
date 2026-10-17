# AI limitations

Read this before relying on any output. Each limitation is either measured or a direct consequence of the design.

## What the system cannot do

1. **It cannot predict price direction.** Six direction models on two targets scored ROC-AUC 0.498-0.512 out of sample
   (0.5 = chance), all with negative Brier skill. No up/down probability, price target, entry or stop level is shown
   anywhere. Older code paths that produced targets were removed and are guarded by tests.
2. **The rule-based scores are not predictive.** The verdict and 0-100 scores on the analysis page come from
   hand-written indicator rules. Evaluated the same way as the models, those rules show essentially no relationship to
   subsequent returns (rank IC between -0.020 and 0.020). They describe the chart; they do not forecast it.
3. **The volatility forecast is about size, not direction,** and covers the next 5 trading days only.
4. **The 80% range is wrong about 1 day in 5 by construction,** and more often in unprecedented conditions
   (measured coverage 79.3% walk-forward, 79.6% holdout).
5. **It does not read news, earnings, filings or order flow.** Model inputs are price, volume, NIFTY 50 and India VIX.
   Scheduled events (results, policy decisions) can move a stock far outside the forecast range.
6. **Fundamentals, sentiment and macro are not model inputs**: there is no point-in-time history for them in the data
   source, and using current values for past dates would leak the future.
7. **Trained on large caps.** 47 current Nifty 50 members. Tested on 25 *former* members it never saw (including
   YES Bank, Vodafone Idea, Zee): it still beat persistence on all 25 (-11.5% error, 79.1% range coverage), so the
   volatility model is not an artefact of survivorship. Raw-return statistics *are* biased (current members averaged
   0.242% per 5 days vs 0.099% for former members). Untested on small caps, IPOs (fewer than 260 trading days are
   refused) or other markets.
8. **Data can be delayed or wrong.** Yahoo Finance is unofficial; forecasts are flagged stale when the last bar is
   more than 4 days old.
9. **Regimes describe risk, not returns.** Historical mean returns by regime show no usable pattern.
10. **Historical statistics are backward-looking.** Portfolio Sharpe, drawdown and VaR describe the past year with
    today's weights; stress scenarios are illustrative estimates.

## Investment committee

11. **Committee decisions are rule-based summaries, not forecasts.** The agents' thresholds and the CIO's weights are
    published judgement calls ([AGENTS.md](AGENTS.md)). The only component that can be tested historically, the quant
    agent's rule score, was tested point-in-time and showed **no edge** (20-day rank IC -0.018, t -0.87). The full
    committee cannot be backtested because fundamentals and news have no point-in-time history, so BUY/SELL labels carry
    no measured edge. Conviction measures agreement of the evidence, not the chance of profit.
12. **Coverage is NSE/BSE equities.** Other assets (US stocks, crypto) are refused with INSUFFICIENT DATA rather than
    analysed from guesses.
13. **Several inputs a human analyst would use are unavailable** and are listed as `DATA_UNAVAILABLE` in every memo:
    policy rate, CPI, GDP, ROCE, interest coverage, FCF yield, moat and management quality, insider and institutional
    flows, and an events calendar.
14. **News tone is keyword-based** and headlines are only "possibly related" to a move. Headlines alone can tilt a view
    but never carry it.
15. **Fundamentals have no reporting date** in the data feed, so they may lag the latest quarter.

## What the LLM is restricted to

The LLM only rewords the computed evidence. It never sees labels or future returns, and any number it writes that is not
in the evidence causes its text to be discarded (`lib/ai/numericGuard.ts`). Without an API key the deterministic template
is used. The older analysis narrative (`/ai/analyze`) still contains LLM-written prose about companies; it is labelled as
such and may contain errors. Company "history" text is not fact-checked.

## Disclosures shown in the product

- Forecasts are probabilistic and can be wrong.
- Past performance does not guarantee future results; backtests describe the past.
- This is not investment advice.
- Data may be delayed or inaccurate.

No user-facing text uses "guaranteed", "will rise/fall", "risk-free" or "100% accurate"; a test enforces this for the
risk view and the explanation guard rejects such language from the LLM.
