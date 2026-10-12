# Market Ka Baadshah

A research terminal for Indian equities (NSE / BSE). It combines market data, rule-based
technical and fundamental scoring, news and sentiment, and an optional LLM-written
narrative, and can push alerts to Telegram and the browser.

> **Not investment advice.** Output is informational. Scores are hand-written heuristics,
> not predictions, and have not been validated against outcomes (see
> [docs/QUANT_ENGINE.md](docs/QUANT_ENGINE.md)). Market data comes from Yahoo Finance and may be
> delayed or wrong.

This README describes only what exists in this repository. Anything planned is in
[docs/PRODUCT.md](docs/PRODUCT.md) and clearly marked as not built.

## What it does today

| Area | What is implemented |
|---|---|
| Accounts | Email + password (bcrypt) with mandatory email verification, Google sign-in, password reset by email, session revocation on password change, account deletion with re-authentication |
| Market data | Index and rate bar, quotes, candles, technical indicators (RSI, MACD, EMA, Bollinger, ATR, ADX, stochastic, VWAP, OBV), fundamentals, news from public RSS feeds, keyword-based social sentiment |
| Analysis | `quantEngine` turns indicators and ratios into a verdict plus a **signal strength** (indicator agreement, *not* a probability). An LLM narrative is added when one is reachable; otherwise a rule-based template is used. Confidence is shown as "unavailable" — no calibrated model exists. |
| Portfolio | Holdings CRUD with validation; import from CSV, XLSX, PDF or a broker screenshot (OCR) |
| Alerts | Vercel cron jobs detect breakouts, volume spikes, news and send a market briefing to Telegram and Web Push, with per-user de-duplication |
| Admin | Role-based (`ADMIN` in the database + verified email) alert dashboard |

Not built (despite earlier docs): multi-agent AI in production, ML price prediction,
real-time streaming prices, backtesting UI, portfolio risk analytics. See
[docs/PRODUCT.md](docs/PRODUCT.md).

## Quick start

Requirements: Node 24, PostgreSQL 14+.

```bash
npm ci
cp .env.example .env.local         # then fill in DATABASE_URL and NEXTAUTH_SECRET at minimum
npx prisma migrate deploy          # fresh database; see docs/DATABASE.md for an existing one
npm run dev                        # http://localhost:3000
```

Without `RESEND_API_KEY` / `EMAIL_FROM`, emails (verification, password reset) are printed to
the server console in development and **refused in production**.

Optional demo data when you have no network: set `NEXT_PUBLIC_DEMO_MODE=true`. This works
only outside production builds and shows a persistent "DEMO DATA" banner.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | ESLint (existing errors are baselined; new ones fail) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (no database needed) |
| `npm run test:integration` | Real-PostgreSQL tests; needs `TEST_DATABASE_URL` (a scratch database) |
| `npm run check:bundle` | Fails if sample data leaked into the production bundle |
| `npm run admin:promote -- <email>` | Grant ADMIN (operator-only, needs `DATABASE_URL`) |

## Documentation

[Architecture](docs/ARCHITECTURE.md) · [Security](docs/SECURITY.md) · [Deployment](docs/DEPLOYMENT.md) ·
[Database](docs/DATABASE.md) · [API](docs/API.md) · [AI system](docs/AI_SYSTEM.md) ·
[Quant engine](docs/QUANT_ENGINE.md) · [Testing](docs/TESTING.md) · [Performance](docs/PERFORMANCE.md) ·
[Product](docs/PRODUCT.md) · [Changelog](docs/CHANGELOG.md) · [Engineering baseline](docs/ENGINEERING_BASELINE.md)
