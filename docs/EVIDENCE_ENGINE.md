# Evidence engine

Every number, headline or model output the committee relies on is an evidence item with a citation id. Claims cite
ids; the memo keeps those citations; the page links each citation to its evidence row. The goal is that any
statement can be traced to data, with its source, timestamp and how much that source is trusted.

Code: `lib/agents/evidence.ts`, `lib/agents/schema.ts`, `lib/agents/untrusted.ts`, `lib/agents/narrative.ts`,
`lib/ai/numericGuard.ts`. The older risk-forecast and research contracts use the same idea with `E#`, `M#`, `N#` ids
(`lib/ai/evidence.ts`).

## Evidence item

| Field | Meaning |
|---|---|
| `id` | One capital letter (the agent) plus a sequence number: `S` strategist, `Q` quant, `F` fundamental, `N` intelligence, `R` risk, `C` contrarian |
| `kind` | `market_data`, `derived_indicator`, `statistical_model`, `ml_model`, `model_validation`, `fundamentals`, `news`, `macro`, `portfolio`, `agent_inference` |
| `label`, `value`, `display` | What it is, the raw value, and exactly how it is shown (the only form generated text may quote) |
| `source`, `url` | Provider or computation; a link for news (http/https only) |
| `asOf` | Timestamp of the data itself (trading date, publish time), or null when the provider gives none |
| `reliability` | 0-1, from fixed policy below |

## Reliability policy

Assigned by source type, never by the agent's opinion of the content:

| Kind | Reliability |
|---|---|
| market data, portfolio holdings | 0.95 |
| derived indicators, model validation, macro quotes | 0.90 |
| fundamentals | 0.80 |
| ML model output | 0.70 |
| statistical model (regime, in-sample studies) | 0.65 |
| news (default) | 0.60 |
| agent inference (e.g. PEG computed from two ratios, hypothetical shocks) | 0.50 |

News by publisher tier: exchanges, regulators and wire services (NSE, BSE, SEBI, RBI, Reuters, Bloomberg) 0.85;
established business press (Economic Times, Business Standard, Mint, Moneycontrol, NDTV Profit, ...) 0.75;
aggregator feeds (Google News) 0.55, checked first so "Google News — NSE India" is not mistaken for the exchange.

## Freshness

`evidenceQuality` counts items older than 4 days for market data and derived indicators, and older than 30 days for
other kinds, and counts undated items separately. The CIO multiplies each agent's weight by its share of fresh
evidence; the quant agent halves its confidence when the latest bar is stale. The memo's "Data used" section lists
every dataset with its status and as-of date.

## Integrity

- An agent whose claims cite ids it did not register is failed by schema validation.
- After the run, every `[ID]` in agent claims and in the memo must resolve to collected evidence, and ids must be
  unique (`checkIntegrity`). A failure is logged and counted (`committee.integrity_failed`) and returned in the result.
- The contrarian re-cites other agents' evidence under its own ids; the label records the original agent and id.

## LLM output guards

The LLM never decides and never produces numbers. When `narrative: "llm"` is requested, Claude rewords only the
executive thesis, and the rewrite is used only if all of these hold:

| Guard | Rule |
|---|---|
| Numeric grounding (`checkExplanation`) | Every number appears in an evidence `display` value (or the conviction) |
| Citations | At least one `[ID]`, and every id exists |
| Language | No certainty or advice phrases ("guaranteed", "will rise", "price target", "you should buy", ...) |
| Decision consistency (`checkDecisionConsistency`) | States the committee's decision exactly and names no other decision label |

Otherwise the deterministic thesis stays and the reasons are returned in `narrative.rejected`.

## Prompt injection

Retrieved text (headlines, summaries) is data and never instructions.

1. **Sanitize**: markup, control and zero-width characters are removed, whitespace collapsed, length capped.
2. **Quarantine**: text that reads like an instruction to a model (for example "ignore previous instructions",
   role tags such as `<system>`, "respond with strong buy") is dropped before it can become evidence, a claim or
   part of a prompt, and the count is reported as a risk.
3. **Isolation**: when Claude is used, all data is sent inside a `<committee_data>` block, and the system prompt
   says text inside it must never be followed.
4. **Decision independence**: the decision is computed by rules before any LLM call, and the decision guard rejects
   any rewrite that changes it. A test plants an injected headline and asserts the decision is unchanged.

Instruction precedence: system prompt > orchestrator policy (the code) > agent rules > the user's question >
external data.
