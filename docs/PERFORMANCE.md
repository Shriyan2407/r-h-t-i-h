# Performance

**Nothing here has been measured on a deployed instance.** These are findings from reading
the code and the production build, plus changes already made. Measure before optimising.

## Already improved

- Sample-data module removed from client and server bundles (verified by content search).
- Market bar and landing page share a 60 s `unstable_cache`; one client poller serves every
  mounted consumer (one request/minute, paused while the tab is hidden).
- Expensive endpoints stop recomputing: `/api/intelligence` no longer evicts its cache on every call.
- A failed upstream call fails fast instead of being papered over with generated data.
- Ollama is opt-in (`OLLAMA_BASE_URL`); with it unset there is no 3 s localhost probe on each uncached AI call.
- `ai-analysis` calls the technicals/fundamentals/macro services in-process (no HTTP hop to itself, shared cache).

## Known bottlenecks

| Issue | Evidence | Plan |
|---|---|---|
| ~~In-memory cache per instance~~ | Intelligence, AI analysis and backtest bars now use `lib/cache/shared.ts` (Upstash when configured) | News, sentiment, history, technicals, fundamentals and macro moved to the shared cache too; empty/error results are never cached. Only per-user auth state (30 s) and the in-memory fallback remain per-process |
| LLM call is synchronous in the request path (up to 60 s `maxDuration`) | `app/api/ai-analysis`, `intelligence` | Queue the job, stream or poll |
| Sequential Yahoo fallbacks (`.NS` → `.BO` → bare) per request | `intelligenceEngine`, `quote` route | Resolve the symbol once, cache the mapping |
| Very large single-file client pages (e.g. `portfolio/page.tsx` ≈ 95 KB) | file sizes | Split by feature, lazy-load heavy panels (charts, OCR, portfolio analytics) |
| `framer-motion` in ~20 files | grep | Lazy-load; respect reduced motion |
| Alert engine loads all preferences with full watchlists in one query | `alertEngine.loadPrefs` | Batch by user, index, cap per run |
| No bundle-size budget | — | Add `@next/bundle-analyzer` and a CI budget |
| No latency / cache-hit metrics | — | Structured logging + metrics (observability phase) |

## Budgets to adopt once measured

LCP < 2.5 s on 4G for `/` and `/stock/[ticker]`; API p95 < 500 ms for cached data; AI endpoint
cache-hit rate > 80 %; first-load JS per route tracked in CI.

## Observability (what exists)

- `lib/observability/logger.ts`: JSON log lines with secret redaction and `LOG_LEVEL`. Adopted only in new code (cache, health); ~50 older `console.*` calls remain.
- `lib/observability/metrics.ts`: latency (avg/p50/p95/max/errors) and cache hit/miss counters. **Per serverless instance, reset on cold start**; shown only on the authenticated `/api/health`. Not fleet-wide SLO data.
- Timed: intelligence and AI-analysis generation. Not yet timed: API routes generally, Yahoo calls, LLM calls individually.
- **Not built:** error tracking (e.g. Sentry), uptime monitor configuration, tracing, a metrics backend.
