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
| `/api/backtest` | POST | `{ticker, strategy, years?, initialCapital?, feeBps?, slippageBps?}` -> `BACKTEST_RESULT` (equity curve, benchmark, trades, metrics, assumptions) | session required; 20/h per user; strategies: `buy_and_hold`, `sma_crossover`, `rsi_mean_reversion`; 1-10 years of daily bars; **API only, no UI yet** |
| `/api/health` | GET | Service health | requires a session today (monitoring-friendly endpoint is planned) |

## Admin

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/alerts` | GET | Telegram users, recent alerts, counts |
| | POST | `{action: "trigger_price"\|"trigger_news"\|"trigger_briefing"}` or `{pref, value}` bulk flag |

Requires `role = ADMIN` in the database and a verified email; anything else is `403`.
