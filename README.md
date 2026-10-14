# EquityLens

A research and risk-analytics tool for Indian equities (NSE / BSE). It combines market data,
rule-based technical and fundamental scoring, news, backtesting, portfolio risk analysis and one
validated machine-learning model, a 5-day **volatility** forecast, and can push alerts to Telegram and the browser.

> **Not investment advice.** Output is informational. The rule-based scores were evaluated against
> outcomes and are **not predictive**; no model could predict price direction better than chance, so none is
> shown (see [docs/MODEL_EVALUATION.md](docs/MODEL_EVALUATION.md)). Market data comes from Yahoo Finance and
> may be delayed or wrong.

This README describes only what exists in this repository. Anything planned is in
[docs/PRODUCT.md](docs/PRODUCT.md) and clearly marked as not built.

## What it does today

| Area | What is implemented |
|---|---|
| Accounts | Email + password (bcrypt) with mandatory email verification, Google sign-in, password reset by email, session revocation on password change, account deletion with re-authentication |
| Market data | Index and rate bar, quotes, candles, technical indicators (RSI, MACD, EMA, Bollinger, ATR, ADX, stochastic, VWAP, OBV), fundamentals, news from public RSS feeds, keyword-based social sentiment |
| Analysis | `quantEngine` turns indicators and ratios into a verdict plus a **signal strength** (indicator agreement, *not* a probability). An LLM narrative is added when one is reachable; otherwise a rule-based template is used. Confidence is shown as "unavailable" — no calibrated model exists. |
| Risk model | `volatility-ridge` 1.1.0 forecasts the size of the next 5 days' moves with an 80% range, factor contributions, market regime and sourced evidence ("Risk Model" tab). Walk-forward: 12% lower error than repeating recent volatility in 14/14 test periods. Direction is never predicted. |
| Model evidence | `/models` publishes every model trained, including the rejected direction models and the superseded v1.0.0 |
| Explanations | Optional Claude rewording of the evidence; any number not in the evidence rejects the text (deterministic template otherwise) |
| Backtesting | `/backtest`: three rules on daily history with next-open fills, fees and slippage; walk-forward validation via the API |
| Portfolio | Holdings CRUD with validation; import from CSV, XLSX, PDF or a broker screenshot (OCR); risk analysis: concentration, sectors, beta, correlation, drawdown, VaR, risk contribution, liquidity, stress scenarios and model-based forward volatility |
| Alerts | Vercel cron jobs detect 52-week high/low proximity, volume spikes, rule-based momentum moves and news, and send a market briefing to Telegram and Web Push, with per-user de-duplication |
| Admin | Role-based (`ADMIN` in the database + verified email) alert dashboard |

Not built: multi-agent AI, price-direction prediction or price targets (tested and rejected), real-time
streaming prices, fundamentals/news as model inputs, billing. See [docs/PRODUCT.md](docs/PRODUCT.md) and
[docs/AI_LIMITATIONS.md](docs/AI_LIMITATIONS.md).

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
| `npm run test:e2e` | Playwright (after `npm run build`); signed-in tier needs `E2E_DATABASE_URL` |
| `npm run ml:download` / `ml:dataset` | Rebuild the ML dataset (see docs/ML_PIPELINE.md for training) |
| `npm run admin:promote -- <email>` | Grant ADMIN (operator-only, needs `DATABASE_URL`) |

## Documentation

[Architecture](docs/ARCHITECTURE.md) · [Security](docs/SECURITY.md) · [Deployment](docs/DEPLOYMENT.md) ·
[Database](docs/DATABASE.md) · [API](docs/API.md) · [AI system](docs/AI_SYSTEM.md) ·
[Quant engine](docs/QUANT_ENGINE.md) · [ML pipeline](docs/ML_PIPELINE.md) · [Model evaluation](docs/MODEL_EVALUATION.md) ·
[Model registry](docs/MODEL_REGISTRY.md) · [Backtesting](docs/BACKTESTING.md) · [Portfolio risk](docs/PORTFOLIO_RISK.md) ·
[AI limitations](docs/AI_LIMITATIONS.md) · [Testing](docs/TESTING.md) · [Performance](docs/PERFORMANCE.md) ·
[Product](docs/PRODUCT.md) · [Changelog](docs/CHANGELOG.md) · [Engineering baseline](docs/ENGINEERING_BASELINE.md)
