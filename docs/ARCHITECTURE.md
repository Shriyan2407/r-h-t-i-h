# Architecture

Status: describes the code as it is on this branch. Items marked **(not built)** are
intentionally absent so this document stays truthful.

## Shape of the system

```
Browser (React 19, App Router)
   │  fetch("/api/...")  — same origin, session cookie
   ▼
proxy.ts  ── NextAuth authorized(): every /api/* route needs a session except
   │           /api/auth/*, /api/telegram/webhook, /api/cron/*  (these authenticate themselves)
   ▼
Route handlers  app/api/**                (Vercel serverless functions, Node runtime)
   │   validate (Zod) → rate-limit → service call → JSON
   ▼
Services  lib/services/**, lib/scoring/**, lib/auth/**, lib/ratelimit/**, lib/email/**
   ├─ Yahoo Finance via yahoo-finance2 (quotes, history, fundamentals)   — unofficial API
   ├─ Public RSS feeds + Reddit/StockTwits (news, keyword sentiment)
   ├─ ML inference (lib/ml): point-in-time features -> registered JSON artifact (volatility-ridge)
   │     -> regime -> evidence contract -> optional Claude explanation behind a numeric guard (lib/ai)
   ├─ Backtesting (lib/backtest) and portfolio risk (lib/portfolio): pure TypeScript
   ├─ LLM narrative: Claude if ANTHROPIC_API_KEY is set, Ollama only if OLLAMA_BASE_URL is set, else templates
   ├─ Resend (transactional email)        ├─ Telegram Bot API   ├─ Web Push (VAPID)
   └─ Upstash Redis REST (rate limits + shared cache; optional, in-memory fallback)
   ▼
PostgreSQL via Prisma  (users, portfolios, watchlists, alert preferences/history, push, telegram)
```

Scheduled work: `vercel.json` defines cron entries that call `/api/cron/market-alerts`,
`/api/cron/news-alerts` and `/api/cron/daily-briefing` with `Authorization: Bearer $CRON_SECRET`.

## What is deployed

Only this Next.js application. `lib/api.ts` calls relative `/api/*` routes; nothing in the
frontend references any other backend.

## Offline ML (not deployed)

```
ml/download.ts (Yahoo) -> ml/build-dataset.ts (same TS feature code) -> dataset.csv
  -> ml/train/*.py (scikit-learn: purged walk-forward, gate, holdout, export)
  -> lib/ml/artifacts/*.json + lib/ml/registry.json  (committed; read by the app at build time)
```

Python is used **only offline** for training and evaluation. Inference runs in TypeScript from the JSON artifact
(ridge regression is a dot product), so there is no Python service to deploy, scale or secure. Parity between the two
is tested to 1e-6. See ML_PIPELINE.md.

## Decision: the Python `backend/` directory

A Python tree (`backend/`: FastAPI, "multi-agent" Claude orchestration, a quant package with tree, LSTM,
transformer and RL model code, `ai-service`, `ocr-service`, a Socket.IO `ws-hub`) sits next to this repository. It is
**not version-controlled, not deployed and not referenced** by the app.

**Decision: retire it.** Reasons:

- Nothing calls it, and it duplicates logic that now exists here with tests (indicators four times over).
- Its ML code never produced data, trained models or reported results; the validated pipeline in `ml/` supersedes it,
  and its LSTM/transformer/RL models were never justified by evidence (the simpler direction models here already fail).
- Verified defects: `requirements.txt` omits `anthropic` and `tenacity` that `agents/base_agent.py` imports; the analysis
  job route can report status but nothing creates jobs; `api/routes/quant.py` fails on import under `uvicorn` and the
  failure is swallowed.
- If Python is ever needed at serving time, the boundary is defined: Next.js -> an ML service that loads registry
  artifacts by `id@version`; not before a model requires it.

**Not yet deleted**: the directory is unversioned, so deleting it cannot be undone from git. It is left for the owner
to delete or archive.

## Request lifecycle: stock analysis

1. `app/stock/[ticker]/page.tsx` calls `getAIAnalysis()` in `lib/api.ts`.
2. `GET /api/ai-analysis/[ticker]` — session required by `proxy.ts`; ticker validated by
   `parseTicker`; cache lookup; on a cache **miss** the per-user limiter runs (15/hour).
3. `generateAnalysis`: Yahoo quote + technicals + fundamentals + news (parallel, with timeouts).
4. `computeQuantScore` (deterministic) → verdict + `signalStrength`.
5. LLM narrative if available, otherwise `generateDeterministicAnalysis`. The LLM can phrase
   the report but cannot set the verdict's strength or probability.
6. Result cached (default 20 min) and returned; failures return a generic error.

Step 3 calls the technicals, fundamentals and macro **services in-process**
(`lib/services/{technicals,fundamentals,macro}.ts`, shared with their HTTP routes and cache).
It previously fetched this app's own `/api/*` routes over HTTP; those requests carried no
session (the auth proxy answered 401) and the base URL defaulted to `http://localhost:3000`, so
the data was always missing and every stock received a placeholder HOLD. A regression test
(`tests/data/ai-analysis-inprocess.test.ts`) fails against the old code and passes now.

## Authentication and authorisation

- NextAuth v5, JWT sessions. Providers: credentials (bcrypt, cost 12) and Google.
- A JWT carries `id`, `sv` (session version), `role`, `subscriptionTier`. On every use the
  server re-reads these from the database (30 s per-process cache). A mismatched `sv` ends the
  session, so a password change or reset signs the user out everywhere.
- Roles live in `users.role` (`USER` | `ADMIN`) and are changed only by
  `npm run admin:promote`. `requireAdmin()` reads the role fresh and also requires a verified email.
- The client can update only its display name through `useSession().update()`.

## Caching

`lib/cache/shared.ts` stores JSON in Upstash Redis when configured (shared by all instances) and in the per-process
map (`lib/services/cache.ts`) otherwise; Redis errors fail open. It serves intelligence reports, AI analysis, backtest
bars and ML price history, never caches error-shaped results, and records hit/miss counters. News, sentiment,
technicals, fundamentals and macro still use the per-process map. `unstable_cache` serves the market bar and landing page.

## Directory map

```
app/                 pages and route handlers
  api/               HTTP API (see API.md)
components/          UI components (large legacy pages are being split up)
lib/auth/            auth config, credentials, tokens, session callbacks, admin check
lib/ratelimit/       limiter + named policies
lib/email/           Resend client + templates
lib/validation/      Zod schemas (ticker, portfolio, push)
lib/security/        constant-time secrets, HTML escaping
lib/services/        market data, news, alerts, Telegram, push, intelligence engines
lib/scoring/         deterministic rule scoring (evaluated: not predictive)
lib/ml/              features, indicators, dataset/labels, volatility inference, regime, risk contract, registry
lib/ai/              evidence contract, numeric guard, risk explainer, LLM clients
lib/backtest/        backtest engine, metrics, strategies, walk-forward
lib/portfolio/       portfolio risk analytics and service
lib/observability/   structured logger, metrics, health
ml/                  offline data download, dataset build, Python training/evaluation, reports
e2e/                 Playwright tests (public tier + signed-in tier)
prisma/              schema + migrations
tests/               unit tests; tests/integration needs a real database
scripts/             operator tools and build guards
```
