# Investment orchestrator

`lib/agents/orchestrator.ts` is the single coordinator. There is one orchestrator; the CIO is an agent that decides,
not a second orchestrator.

```
POST /api/agents/committee {query}
  -> parseIntent        deterministic keyword rules           lib/agents/intent.ts
  -> planExecution      minimum agents, waves, blocked reason  lib/agents/router.ts
  -> ResearchContext    shared, memoized, traced datasets      lib/agents/context.ts
  -> wave 1             analysts in parallel                   strategist, quant, fundamental, intelligence, risk
  -> wave 2             contrarian (needs wave 1)              lib/agents/contrarian.ts
  -> wave 3             CIO decision + memo                    lib/agents/cio.ts, memo.ts
  -> optional           guarded Claude rewording of the thesis lib/agents/narrative.ts
  -> integrity check    every citation resolves to evidence
  -> CommitteeResult    schema "committee/1"
```

## Intent

The parser is rule-based on purpose: the same question always routes the same way, and text typed into the query
cannot change the routing rules.

| Field | Values |
|---|---|
| `intent` | `investment_decision`, `explain_move`, `valuation`, `risk_assessment`, `portfolio_review`, `portfolio_construction`, `general_research` |
| `ticker` / `tickers` | Resolved against the NSE/BSE universe by symbol, company name, unique first word or multi-word alias; an unknown upper-case symbol is kept as a candidate for the data layer to verify |
| `unresolvedAsset` | A recognised non-Indian name (NVIDIA, Tesla, Apple, ...). The committee says it is not covered instead of guessing. |
| `horizon` | `short`, `medium`, `long` or `unknown` (never assumed) |
| `riskProfile` | `conservative`, `moderate`, `aggressive` or `unknown` |
| `scenario` | `recession`, `rate_shock`, `market_crash`, `inflation` or `none` |

Queries are whitespace-normalised and capped at 500 characters.

## Routing

| Intent | Analysts (wave 1) | Contrarian | Decision |
|---|---|---|---|
| Investment decision ("Should I buy Reliance?", "Analyse TCS") | strategist, quant, fundamental, intelligence, risk | yes | yes |
| Explain a move ("Why did TCS fall today?") | intelligence, quant, fundamental | no | no (explanatory) |
| Valuation ("Is Infosys overvalued?") | fundamental, quant, intelligence, risk | yes | yes |
| Risk ("How risky is HDFC Bank?") | risk, quant, strategist | yes | yes |
| Portfolio review ("Should I hold my portfolio in a recession?") | strategist, quant, fundamental, risk | yes | yes |
| Portfolio construction ("Build a moderate-risk portfolio from TCS, ITC, ...") | strategist, fundamental, quant, risk | yes | yes |
| General research ("What is the market outlook?") | strategist | no | no |

A question is **blocked**, and only the CIO runs to return `INSUFFICIENT DATA` with the reason, when it names an
unsupported asset, names no identifiable stock for an asset question, or asks for portfolio construction with fewer
than 2 or more than 15 candidates.

## Data context

Agents never call providers. They ask the context, which:

- starts each dataset on first request and shares the promise, so quant and risk asking for the same bars cost one
  fetch (tested);
- enforces a per-dataset timeout (12 s by default) and retries a provider **error** once after 250 ms (timeouts and
  empty answers are not retried);
- records each dataset's `status` (`ok`, `empty`, `error`, `timeout`), source, data timestamp, latency and attempts;
- reads the user's holdings lazily, only when an agent asks for them.

Production loaders (`lib/agents/loaders.ts`) go through the existing shared-cache services: adjusted bars (8 years,
enough for the 2020 and 2022 stress replays), fundamentals (5 min), news (2 min) and the macro snapshot. Committee
results are not cached because they depend on the user's holdings.

## Execution and failures

- Each agent runs through `runAgent`: 25 s timeout, errors captured, output validated against the schema.
- A failed agent keeps `status: "failed"` with its error. Its memo slot says it did not run successfully; the CIO
  weighs what is left or returns `INSUFFICIENT DATA`. Nothing is substituted.
- If the CIO itself fails, the run fails and the API returns an error; there is no fallback verdict.

## Streaming protocol

With `stream: true` the API returns NDJSON (`application/x-ndjson`), one event per line, emitted when things
actually happen:

| Event | Payload |
|---|---|
| `plan` | `requestId`, parsed `intent`, `plan` (agents, waves, reasons, blocked), agent names and reasons |
| `agent_started` | `agent`, `wave` |
| `agent_finished` | `agent`, `status`, `latencyMs`, `view`, `confidence`, `conclusion` |
| `result` | the full `CommitteeResult` |
| `error` | `requestId`, a generic message (details go to the server log) |

The research page folds these events into its agent activity view (`components/research/committee/state.ts`).

## Result

`CommitteeResult` contains the intent, plan, every agent result, the decision (weights, disagreements, overrides,
conviction), the memo, all evidence, dataset summaries, a trace (`totalMs` and per-agent wave, status, latency and
error), the citation integrity check and the narrative outcome (`template` or `llm`, with rejection reasons).

## Observability

| Signal | Name |
|---|---|
| Per-agent latency and failure (timing histogram) | `agent.<id>` |
| Agent failures | counter `agent.<id>.failed` |
| End-to-end latency | `committee.total` |
| Decisions | counter `committee.decision.<decision>` |
| Integrity failures | counter `committee.integrity_failed` (also logged as an error) |
| LLM rewording | `ai.committee.llm` timing; `ai.committee.accepted`, `.rejected`, `.refusal`, `.error` |
| Structured logs | `committee.completed` (request id, intent, ticker, decision, conviction, per-agent and per-dataset status); `committee.agent_failed` |

Logs never include the query text, holdings or user identifiers beyond the request id.
