# AI system

What the "intelligence" in this product actually is, layer by layer. If something is not listed as built, it is
not built. Measured results: [MODEL_EVALUATION.md](MODEL_EVALUATION.md). Limits: [AI_LIMITATIONS.md](AI_LIMITATIONS.md).

## Layers

| # | Layer | What it is | Is it AI/ML? | Code |
|---|---|---|---|---|
| 1 | Market data | Daily OHLCV + adjusted close (Yahoo Finance), NIFTY 50, India VIX, RSS headlines | No | `lib/ml/data.ts`, `lib/services/*` |
| 2 | Derived indicators | RSI, MACD, EMA/SMA, ATR, ADX, Bollinger width, realised vol, drawdown, beta, correlation | No: fixed formulas | `lib/ml/indicators.ts`, `lib/ml/features.ts` |
| 3 | Rule-based scores | The verdict and 0-100 scores on the analysis page; "signal strength" = agreement of rules | No: hand-written rules. **Evaluated: no predictive value** (rank IC ≈ 0) | `lib/scoring/quantEngine.ts` |
| 4 | Statistical model | Market regime: NIFTY vs 200-day average + India VIX cut-offs fit on 2011-2025 | Statistical classification | `lib/ml/regime.ts`, `ml/train/regimes.py` |
| 5 | Machine learning (deployed) | **volatility-ridge 1.1.0**: ridge regression forecasting the size of the next 5 days' moves | Yes: trained, walk-forward validated, registered | `lib/ml/volatility.ts`, `ml/train/vol.py` |
| 6 | Machine learning (rejected) | Logistic regression, random forest, gradient boosting for 5-day direction | Trained and evaluated; **failed the gate; not used** | `ml/train/walkforward.py`, `lib/ml/registry.json` |
| 7 | Evidence | Every number shown with the forecast is an `Evidence` item with kind, source and timestamp | No | `lib/ai/evidence.ts`, `lib/ml/riskForecast.ts` |
| 8 | LLM | Claude (`claude-opus-5-5`) optionally rewrites the evidence in plain language | LLM; **explains only** | `lib/ai/riskExplainer.ts` |
| 8b | Research | "Why is X moving?": deterministic decomposition (beta x index), volume, move vs forecast, regime, dated headlines; optional Claude wording behind the same guard | Evidence + LLM explains only | `lib/research/*`, `/research` |
| 9 | Validation | Numeric grounding guard: any number not in the evidence, missing citation, or certainty language rejects the LLM text | No | `lib/ai/numericGuard.ts` |
| 10 | Investment committee | One orchestrator routes a question to the minimum set of seven agents (strategist, quant, fundamental, intelligence, risk, contrarian, CIO). Each agent is a published rule set over real data with cited evidence; the CIO decides by weighted rules with risk and contrarian overrides | **No ML or LLM in any agent or the decision.** Uses layers 1-7 as inputs | `lib/agents/*`, `/research` |
| 11 | Committee wording | Claude may reword the memo's thesis; kept only if numbers, citations and the decision all match | LLM; **rewords only** | `lib/agents/narrative.ts` |

The older stock-analysis narrative (`/ai/analyze`, `/api/intelligence`) still uses an LLM or templates on top of the
rule-based scores (layer 3). Since this work it may no longer produce price targets (prompt changed, parser strips
them, regression test), and its scores are labelled heuristics.

## Pipeline (investment committee)

```
question -> parseIntent (rules) -> planExecution (minimum agents, waves)
  -> wave 1 analysts (parallel, shared datasets, 25 s timeout each)
  -> contrarian (attacks wave 1) -> CIO (weights, disagreements, overrides) -> memo
  -> optional Claude rewording of the thesis -> numeric + decision guards -> citation integrity check
  -> POST /api/agents/committee (JSON or NDJSON progress stream) -> /research workspace
```

Details: [ORCHESTRATOR.md](ORCHESTRATOR.md), [AGENTS.md](AGENTS.md), [EVIDENCE_ENGINE.md](EVIDENCE_ENGINE.md).

## Pipeline (risk forecast)

```
Yahoo chart (adjclose)  ->  toAdjustedBars (split/dividend adjust, drop bad rows)
  -> computeFeatureMatrix   30 point-in-time features (price, volume, index, VIX)      [layer 2]
  -> predictVolatility      registered artifact volatility-ridge@1.1.0                  [layer 5]
       + groupContributions exact linear contributions (coef x standardised value)
  -> classifyRegime         NIFTY/SMA200 + VIX cut-offs, with historical stats          [layer 4]
  -> buildRiskForecast      RiskContract: forecast, 80% range, regime, factors,
                            evidence E1..E12, model card, disclaimers, direction=unavailable [layer 7]
  -> explainRisk            template; or Claude rewrite -> checkExplanation -> accept/reject [layers 8-9]
  -> GET /api/ml/risk/[ticker]  -> RiskIntelligencePanel ("Risk Model" tab)
```

## Stage audit (before -> after)

| Stage | Before this work | After |
|---|---|---|
| Data validation | none for ML | `toAdjustedBars`, `cleanBars`, dataset `validateDataset`, data-quality audit (`ml/data/quality.json`) |
| Normalisation | none | split/dividend adjustment; train-quantile winsorising + standardisation stored in the artifact |
| Technical features | computed per request for display only | 30 causal features, one implementation for training and inference |
| Fundamental / sentiment / macro features | n/a | **Not implemented as model inputs**: no point-in-time history (see limitations) |
| Quant signals | rule scores, unvalidated | same rules, now **evaluated** (no edge) and labelled heuristic |
| ML model | none (Python research code unused) | volatility model deployed; direction models rejected by a pre-registered gate |
| Model output | n/a | `RiskContract` schema `risk-forecast/1` |
| Evidence engine | none | `Evidence` items with layer kind, source, timestamp |
| LLM reasoner | wrote verdicts, targets, "confidence" | explains evidence only; numbers grounded or rejected |
| Validation | parser default-filled fields | numeric guard, citation check, banned certainty/advice language |
| API | `/api/ai-analysis`, `/api/intelligence` | + `/api/ml/risk/[ticker]`, `/api/ml/evaluation`, `/api/backtest/walk-forward`, `/api/portfolio/risk` |
| Frontend | "AI Confidence" random walks, "7 agents active" | Risk Model tab, `/models` evidence page, honest `/ai`, portfolio risk |

## What the LLM may and may not do

| May | May not |
|---|---|
| Re-word the provided evidence | Introduce any number (prices, ratios, probabilities, returns, performance) |
| Re-word the committee thesis | Change or contradict the committee's decision, or name another decision label |
| Order and connect points | Predict direction or give buy/sell advice |
| Explain uncertainty | Use certainty language ("guaranteed", "will rise", "risk-free") |
| | Cite evidence that does not exist |

Enforced in code (`checkExplanation`); violations fall back to the deterministic template and increment
`ai.explain.rejected`. The LLM is never told the label or forward returns: it receives `{ticker, horizonDays, evidence[]}`.
Without `ANTHROPIC_API_KEY`, explanations are always the template.

## Confidence semantics

| Concept | Meaning | Where it appears |
|---|---|---|
| Signal strength | Agreement of hand-written rules, 0-100. Not a probability. | Analysis page, macro regime |
| Prediction probability | Would require a validated, calibrated classifier. **None exists**, so it is never shown. | Shown as "Not predicted" / "unavailable" |
| Forecast interval | 80% range from calibration-slice residuals; measured coverage 79.3% (walk-forward), 79.6% (holdout) | Risk Model tab |
| Model validation | Out-of-sample metrics from the registry | Model card, `/models` |
| Evidence quality | Data freshness (`stale` when the last bar is > 4 days old) and explicit unavailability reasons | Risk Model tab |
| Agent confidence | Share of an agent's required inputs that were present and fresh, 0-1. Not a probability. | Committee memo ("input coverage") |
| Source reliability | Fixed trust per evidence source type and publisher tier | Committee evidence list |
| Conviction | Committee score strength x analyst coverage x agreement, 0-100. Not a probability of profit. | Committee verdict |
