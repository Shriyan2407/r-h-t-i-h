# Changelog

Branch `modernization/production-hardening` (from `master` @ `80ea5e6`). Newest first within
each theme. Hashes are for this local branch and will change if history is rewritten.

## Branch `feat/equitylens-ai-v2` (AI/ML upgrade; branched from `2ced51c`)

### Findings
- Price direction is **not predictable** from price/volume/index/VIX inputs: 6 models x 2 targets, ROC-AUC 0.498-0.512,
  negative Brier skill, no strategy beats buy-and-hold after costs. All rejected by a pre-registered gate (`987f55d`).
- The product's former indicator rules carry essentially no signal (rank IC -0.020 to 0.020) (`35828fe`).
- Volatility **is** forecastable: ridge beats persistence by 12.1% MSE in 14/14 folds, holdout -9.9%, 80% interval
  coverage 79.6% (`50847c4`, `c4df34e`, `6694810`).

### ML pipeline
- Causal indicators, 30 point-in-time features, labels, dataset integrity checks and leakage tests (`3540ae9`..`b8166c8`)
- Reproducible download with SHA-256 manifest; 178k-row dataset with a data-quality audit (`f368209`, `5bf7527`)
- Purged splitter + leakage detector, calibration/IC metrics, cost-aware cohort strategy (`7f09c88`..`e03055b`)
- Model zoo, walk-forward, relative target, deployment gate (`61b76c4`..`987f55d`)
- Volatility study, one-shot holdout, export, append-only registry (`197effd`..`b7efd8d`)
- **Defect found and fixed**: v1.0.0's forecast fell when volatility rose (collinear features); v1.1.0 adds a
  monotonicity gate; v1.0.0 kept as superseded; v1.1.0 holdout flagged as a second look (`6694810`..`0479d59`)
- TypeScript inference with exact factor contributions; Python parity to 1e-6; regimes with parity (`2ed24b8`..`faf231c`)

### AI (evidence and LLM)
- Layered evidence contract; numeric grounding guard; risk explainer on `claude-opus-5-5` with server-side refusal
  fallbacks, falling back to a template whenever the guard rejects the text (`5279eec`..`652ee24`)
- `GET /api/ml/risk/[ticker]`, `/api/ml/evaluation`, `POST /api/backtest/walk-forward`, `GET /api/portfolio/risk`
  (`be641e5`, `5b66f6a`, `56d64a0`, `11be4c6`)

### UI
- Risk Model tab, `/models` evidence page, portfolio risk panel (lazy-loaded) (`d0a52e3`..`86d125e`)
- Accessible login labels, contrast and toggle name (`92aac27`)

### Fabrications removed
- `/ai`: random-walk "AI Confidence", random "market pulse", "7 agents active" (`59f882e`)
- `/news`: random-walk Fear/Greed and AI confidence; hardcoded sector scores, narratives, trending mentions,
  FII/DII flows, risk alerts; templated "institutional read" on real articles (`2b036cf`)
- Price targets: LLM prompt no longer asks, parser strips them, rule report's fixed +12%/+24%/-7% removed,
  Telegram lines removed, unused `lib/stockData.ts` (hardcoded prices/targets) deleted (`608d5df`..`be11183`)
- Macro regime "confidence %" -> signal strength + input count (`224a974`); paid plans with no billing (`9f0c3b2`);
  multi-agent / real-time / AI-powered copy (`3d3d30d`, `71a081f`)

### Testing, CI, observability
- Python ML tests and Playwright E2E jobs in CI; E2E server is pinned to a non-production database (`7ff4472`, `d776179`, `20e0619`)
- Model versions and ML cache hit rate on detailed health; request ids, inference latency and prediction counters (`ac505cc`, `be641e5`)

### Process notes
- `bbb4d8b` was committed with one failing test assertion (the UI was correct); fixed in the next commit `4d8bfc7`.
- The deletion of `lib/stockData.ts` landed inside `608d5df` and of `components/ui/FearGreedMeter.tsx` inside `224a974`
  (staged deletions were picked up by those commits).

## Branch `modernization/production-hardening`

## Security
- Cron and webhook-setup secrets compare in constant time and **fail closed** (503) — no more `Bearer undefined` (`84a7690`, `86ba6e1`)
- Telegram webhook secret mandatory; Zod-validated updates; HTML escaping; analysis needs a linked account and is limited per chat (`be49f5b`, `20f9740`, `7239b0a`)
- Email verification at signup; pre-hijack defence; verify + resend endpoints and UI (`3e0ad19`, `9ce8083`, `94ceff6`)
- Sign-in: unverified blocked, per-IP/account limits, no timing oracle, **no dangerous OAuth linking**, Google email must be verified (`919f30d`)
- Sessions revoked on password change/reset; client can no longer set `subscriptionTier` (`919f30d`, `76c7e36`, `fc11d78`)
- Admin by database role + verified email instead of a hardcoded address (`e9e9b95`)
- Reset tokens hashed and actually emailed (`76c7e36`, `24f0fa6`, `8e45ffa`)
- Rate limiting (Upstash or in-memory) on auth, search, AI, upload and webhook paths (`8973609`, `8af9f4f`)
- Ticker, portfolio, pagination, upload and push validation; push SSRF closed; no internal errors returned (`f675491`, `d5cee37`, `ceabd30`, `8af9f4f`)
- Public uncached LLM endpoint closed (`7239b0a`)
- Account deletion needs re-authentication (`fc11d78`)
- Security response headers (nosniff, frame denial, referrer/permissions policy, HSTS) and a report-only CSP, verified on a running production server (`da1a802`)
- Production dependencies: 11 findings (4 critical, 6 high) → **0**; Next 16.2.6 → 16.4.0 fixes a critical proxy bypass (`7030585`)

## Honesty / fake data removed
- Telegram `/briefing` and the cron briefing no longer send hardcoded indices, movers, "AI picks", FII/DII or a made-up risk score (`7e5e497`)
- Landing page: no fixed index values, mover prices, fake AI verdicts or "7 agents / <30 s" claims (`dbfa704`, `4740e54`)
- The "LIVE" market ticker was a random walk around fixed numbers; it now shows real quotes or says it is unavailable (`2899faa`)
- Dashboard and login panel hardcoded values and fake verdict cards removed (`66e811e`)
- Silent mock-data fallback removed; demo mode is explicit, dev-only and labelled; verified absent from production bundles (`842ccb2`)
- Invented "confidence %" replaced by **signal strength** + "unavailable"; LLM-written confidence discarded (`c1ab44a`, `4d374f3`)
- Alerts: the "AI Buy/Sell Signal" was a momentum rule shown with a hardcoded 72%/68% confidence and fixed +8%/+15%/-5% targets; it is now an honest rule-based momentum alert with no invented numbers, and "Broke above" wording is only used when true (`176d87b`)

- **AI verdict was a placeholder for every stock in production**: `ai-analysis` fetched its own `/api/technicals|fundamentals|macro` over HTTP without a session (401) and via `localhost:3000`; it now calls the services in-process, guarded by a regression test that fails on the old code

## Quant / backtesting
- Causal backtest engine with costs, slippage, risk metrics and walk-forward validation; `POST /api/backtest` and `/backtest` page (UI not browser-verified)
- Ollama is opt-in via `OLLAMA_BASE_URL`; no more 3 s localhost probe on every uncached AI call

## Observability / performance
- Structured logger, in-process metrics, shared Upstash cache with hit-rate tracking; public `/api/health` (DB only) with secret-gated detail

## Database
- Baseline migration and `1_auth_hardening` (role, sessionVersion, token hashes); verified on empty and populated databases; drift-checked in CI (`156c27f`, `76c7e36`)

## Engineering
- Restored files deleted in the working tree; lockfile synced (`2d9bc1c`); typecheck script (`4551f98`); `middleware.ts` → `proxy.ts` (`d6b0825`)
- ESLint baseline + warning cap (`deae33f`)
- CI: lint, typecheck, tests, build, bundle guard, audit, migrations + DB integration (`d23cf9f`, `2ecbb31`, `4a6d205`)
- Vitest harness, 320 unit tests, 16 real-database integration tests (`88fdefd` and throughout); alert engine covered end to end (`c5da8e1`)
- Engineering baseline recorded (`d6ee83f`)

## Known issues carried forward
See ENGINEERING_BASELINE.md §5–7, ARCHITECTURE.md (macro self-call), and PRODUCT.md "Not built".
