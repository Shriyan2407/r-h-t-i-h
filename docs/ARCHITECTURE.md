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
   ├─ LLM narrative: Claude if ANTHROPIC_API_KEY is set, Ollama if reachable, else templates
   ├─ Resend (transactional email)        ├─ Telegram Bot API   ├─ Web Push (VAPID)
   └─ Upstash Redis REST (rate limits; optional, in-memory fallback)
   ▼
PostgreSQL via Prisma  (users, portfolios, watchlists, alert preferences/history, push, telegram)
```

Scheduled work: `vercel.json` defines cron entries that call `/api/cron/market-alerts`,
`/api/cron/news-alerts` and `/api/cron/daily-briefing` with `Authorization: Bearer $CRON_SECRET`.

## What is deployed

Only this Next.js application. `lib/api.ts` calls relative `/api/*` routes; nothing in the
frontend references any other backend.

## What is NOT part of this repository

A Python tree (`backend/`: FastAPI, multi-agent Claude orchestration, a quant/ML research
package, `ai-service`, `ocr-service`, a Socket.IO `ws-hub`) lives next to this repository
but is **not version-controlled here and is not deployed**. Verified problems with it:

- `requirements.txt` removed `anthropic` and `tenacity`, yet `agents/base_agent.py` imports them.
- `api/routes/analysis.py` can report job status but nothing creates a job.
- `api/routes/quant.py` uses relative imports that fail under `uvicorn main:app`, and the
  failure is swallowed, silently disabling the router.
- The quant package has no data, trained models or reported results (see QUANT_ENGINE.md).

Decision pending (see ENGINEERING_BASELINE): consolidate into this repo behind a
clear interface, or remove. Until then, treat that tree as unmaintained reference code.

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

`lib/services/cache.ts` is an in-process Map: on Vercel each instance has its own, so it only
smooths bursts within one warm instance. `unstable_cache` (Vercel Data Cache) is used for the
market bar and landing page so they are shared. A shared Redis cache for expensive AI results is
planned, not built.

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
lib/scoring/         deterministic quant scoring
prisma/              schema + migrations
tests/               unit tests; tests/integration needs a real database
scripts/             operator tools and build guards
```
