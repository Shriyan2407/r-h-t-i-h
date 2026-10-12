# AI system

An honest account of where "AI" is used, what is deterministic, and what is unverified.

## Classification

| Component | Technique | Where |
|---|---|---|
| Indicators (RSI, MACD, EMAs, Bollinger, ATR, ADX, stochastic, VWAP, OBV) | Classical formulae | `app/api/technicals/[ticker]/route.ts` |
| Verdict + signal strength | **Hand-written rule scoring** (weights/thresholds in QUANT_ENGINE.md) | `lib/scoring/quantEngine.ts` |
| News sentiment | **Keyword counting** (no NLP model) | `lib/services/newsAggregator.ts`, `socialSentiment.ts` |
| Narrative text | **LLM** (Claude or Ollama) when available, else **fixed templates** | `lib/services/intelligenceEngine.ts`, `lib/ai/narrativeEngine.ts` |
| Machine learning | **None in production.** | — |

There is no trained model, no ML inference and no multi-agent system in the deployed app.

## Pipeline as built

```
Yahoo / RSS / Reddit  →  quantEngine (rules)  →  prompt (scores in, JSON schema out)
                                              →  Ollama → Claude → deterministic template
                                              →  parse + default-fill  →  response
```

The offline template path always succeeds, so the endpoint never returns an error object.
Ollama only works where it is reachable (not on Vercel); Claude only if `ANTHROPIC_API_KEY` is set.
On a default Vercel deployment with no key, **every report is the template path**.

## What is and is not verified

| Output | Source | Verified? |
|---|---|---|
| Indicator values, quote, fundamentals | Yahoo Finance | Depends on provider; may be delayed |
| Verdict rating | Rules (`quantEngine`); the LLM may **override** it (`rating` in the parsed JSON) | Rules deterministic; LLM override unverified |
| Signal strength | Rules — agreement of signals | Deterministic; **not a probability** |
| Probability / "confidence" | — | **Unavailable by design** (`probability: null`); UI says so |
| Entry, stop, targets, risk/reward | LLM, or fixed percentages of price when absent | Unverified; the percentage defaults are not derived from volatility |
| Bull/Base/Bear scenarios and their probabilities | LLM, or fixed numbers in the templates | **Unverified, illustrative only** |
| Company history / lifecycle | Hand-written for 9 tickers; otherwise LLM or sector templates | **Unverified; may contain invented events** |
| News "AI read" paragraphs | Fixed text keyed on sentiment | Template, not analysis |

## Rules the system now enforces

- The LLM's own "confidence" is discarded; no default confidence is ever substituted.
- No component may present a number as live data when it is not (see ENGINEERING_BASELINE for the fakes removed).
- If the LLM fails or is absent the user gets template text, not an error — but the response `_meta.model`/`engine` records which path produced it.

## Not built (needed before stronger claims)

- An **evidence model**: every factual sentence linked to a source record (price, filing, headline).
- Constraining the LLM so it cannot author prices, targets, probabilities or company facts; validating its JSON against the deterministic inputs.
- A validated, calibrated probability model (see QUANT_ENGINE.md for the evidence that would be required).
- Retrieval of real filings / announcements for company history.
- Background jobs for slow generation; shared cache for results.
