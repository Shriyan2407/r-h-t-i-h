# HTTP API

All routes are under `/api` and return JSON. **Auth** is a NextAuth session cookie unless noted.
Errors use `{ "error": string, "code"?: string }`. Rate-limited routes answer `429` with `Retry-After`.
Path parameter `[ticker]` must match `^[A-Z0-9&-]{1,20}$` (a trailing `.NS`/`.BO` is stripped);
otherwise `400 INVALID_TICKER`.

## Public (self-authenticating)

| Route | Method | Purpose | Protection |
|---|---|---|---|
| `/api/auth/signup` | POST | Create an **unverified** account, email a link | 5/h per IP; same 202 for new and existing addresses |
| `/api/auth/verify-email` | POST | Consume a verification token (`{token}`, 64 hex) | 10/h per IP; single-use |
| `/api/auth/resend-verification` | POST | New link for an unverified password account | 3/h per IP and per address; generic response |
| `/api/auth/forgot-password` | POST | Email a reset link | 5/h per IP and per address; generic response |
| `/api/auth/reset-password` | POST | Set a new password (`{token,password}`) | 5/h per IP; revokes all sessions |
| `/api/auth/[...nextauth]` | GET/POST | NextAuth (credentials, Google) | 10 attempts/15 min per IP and per account |
| `/api/telegram/webhook` | POST | Telegram bot updates | `x-telegram-bot-api-secret-token` must equal `TELEGRAM_WEBHOOK_SECRET` (503 if unset) |
| `/api/cron/market-alerts`, `/news-alerts`, `/daily-briefing` | GET | Scheduled alert jobs | `Authorization: Bearer $CRON_SECRET` (503 if unset) |

## Authenticated

| Route | Method | Purpose | Notes |
|---|---|---|---|
| `/api/user/profile` | GET | Own profile (`hasPassword`, never the hash) | |
| | PATCH | Name, theme, password change | Password change needs current password, revokes sessions, shares login limit |
| | DELETE | Delete account | Requires `password` (or `confirmEmail` for OAuth-only) |
| `/api/user/portfolio` | GET / POST | List / upsert a holding | Zod-validated; max 500 positions |
| `/api/user/portfolio/[id]` | PUT / DELETE | Edit / remove own holding | Ownership enforced; 404 otherwise |
| `/api/user/watchlist` | GET / POST / DELETE | Watchlist | Zod-validated |
| `/api/alerts/preferences` | GET / PUT | Boolean preference flags | allow-list |
| `/api/alerts/history` | GET / PATCH / DELETE | Own alert log | `limit` 1–100, `offset` ≥ 0 |
| `/api/telegram/connect` | POST / GET / DELETE | Create link token / status / unlink | 10-min token |
| `/api/telegram/test` | POST | Send a test message | |
| `/api/telegram/setup-webhook` | POST | Register the webhook | header `x-setup-secret: $CRON_SECRET` |
| `/api/push/subscribe`, `/unsubscribe` | POST | Web-push registration | Endpoint must be on a known push-service host; max 20 devices |
| `/api/portfolio/scan` | POST (multipart `file`) | Preprocess a screenshot for OCR | PNG/JPEG/WebP ≤ 10 MB; 10/h per user |
| `/api/search?q=` | GET | Symbol search (Yahoo) | q ≤ 60 chars; 60/min per client |
| `/api/market/indices` | GET | Index/rate bar | Real quotes, 60 s shared cache; **503** (no numbers) when unavailable |
| `/api/stocks/[ticker]/quote` · `/candles?range=` | GET | Quote / OHLCV | |
| `/api/technicals/[ticker]` · `/fundamentals/[ticker]` | GET | Indicators / ratios | |
| `/api/news/[ticker]` · `/news/market` · `/sentiment/[ticker]` · `/macro` | GET | News, keyword sentiment, macro snapshot | |
| `/api/history/[ticker]` | GET | Company history (curated / LLM / template) | **Unverified content**, see AI_SYSTEM.md |
| `/api/ai-analysis/[ticker]` | GET | Verdict + narrative | 15/h per user on cache misses |
| `/api/intelligence/[ticker]` · `/intelligence/stream/[ticker]` | GET | Full report / SSE stream | 20/h per user on cache misses; stream always counts |
| `/api/backtest` | POST | `{ticker, strategy, years?, initialCapital?, feeBps?, slippageBps?}` -> `BACKTEST_RESULT` (equity curve, benchmark, trades, metrics, assumptions) | session required; 20/h per user; strategies: `buy_and_hold`, `sma_crossover`, `rsi_mean_reversion`; 1-10 years of daily bars; used by the `/backtest` page |
| `/api/ml/risk/[ticker]` | GET | `risk-forecast/1` contract: 5-day volatility forecast + 80% range, regime, factor contributions, evidence, model card, disclaimers; `direction.available` is always false. `?explain=llm` asks Claude to reword the evidence (guarded) | session; 60/h per user; 503 `MARKET_DATA_UNAVAILABLE`, 404 `NO_DATA`, 422 `INSUFFICIENT_HISTORY`/`INCOMPLETE_FEATURES`; `x-request-id` header |
| `/api/ml/evaluation` | GET | Registry plus recorded walk-forward results for every model, including rejected ones | session |
| `/api/backtest/walk-forward` | POST | `{ticker, years?, trainBars?, testBars?, initialCapital?, feeBps?, slippageBps?}` -> per-fold rule choice and chained out-of-sample equity vs buy-and-hold | session; shares the backtest limit (20/h) |
| `/api/portfolio/risk` | GET | Risk analytics, stress scenarios, style exposures and model-based forward volatility for the saved holdings; `{empty:true}` when there are none | session; 20/h per user; logs counts only |
| `/api/stream/quotes?tickers=A,B` | GET (SSE) | `quote` events when a delayed price changes (shared 10 s poll), `ping`, `end`; 50 s connections, client reconnects | session; 1-20 valid tickers; 200 connections/h |
| `/api/research/move/[ticker]` | GET | `move-explanation/1`: today's move split into market (beta x index) and stock-specific parts, volume vs normal, move vs expected range, regime, headlines (last 72 h), cited answer; `?explain=llm` for guarded Claude wording | session; 30/h |
| `/api/agents/committee` | POST | `{query, stream?, narrative?}` -> `committee/1`: intent, plan, every agent result, decision (weights, disagreements, overrides, conviction), memo, evidence, datasets, trace, integrity; `stream:true` returns NDJSON events (`plan`, `agent_started`, `agent_finished`, `result`, `error`); `narrative:"llm"` asks Claude to reword the thesis behind the numeric and decision guards | session (fails closed); query 3-500 chars; 12/h per user; never cached; holdings read only for the signed-in user |
| `/api/portfolio/performance` | GET | Current holdings valued at real daily closes over ~3 months vs NIFTY 50 | session; 60/h |
| `/api/health` | GET | **Public**: `{status, ts, checks:{database}}`, 503 when degraded. With `Authorization: Bearer $HEALTH_SECRET` (or `CRON_SECRET`): adds market-data/AI/cache/rate-limit config status, version and single-instance latency + cache hit-rate metrics | detail fails closed (503) if no secret is configured |

## Admin

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/alerts` | GET | Telegram users, recent alerts, counts |
| | POST | `{action: "trigger_price"\|"trigger_news"\|"trigger_briefing"}` or `{pref, value}` bulk flag |

Requires `role = ADMIN` in the database and a verified email; anything else is `403`.
