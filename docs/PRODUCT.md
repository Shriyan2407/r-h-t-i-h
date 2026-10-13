# Product

## Name

The deployed product is **Market Ka Baadshah**. Earlier code and documents also say
"EquityLens" and "R.H.T.I.H". One canonical name is still to be chosen and applied everywhere
(README, metadata, emails, env vars, favicon, SEO); until then the user-facing name is
Market Ka Baadshah.

## Who it is for

Indian retail investors who want one place to see price action, simple technical and
fundamental indicators, news and portfolio holdings, with optional Telegram/push alerts.

## What it is not

- Not investment advice, a broker, or a signal service. No order placement.
- Not a prediction engine: there is no validated model (see QUANT_ENGINE.md).
- Not real-time: quotes come from Yahoo Finance and may be delayed.

## Built

Accounts with verification, market bar, quotes/charts/technicals/fundamentals, news and keyword
sentiment, rule-based verdict with signal strength, optional LLM narrative, portfolio CRUD and
import (CSV/XLSX/PDF/screenshot), Telegram and Web Push alerts with de-duplication, role-based
admin dashboard.

## Not built (do not claim)

| Idea | Status |
|---|---|
| "7 specialised AI agents" in production | Exists only in unmaintained, undeployed Python code |
| ML price/direction prediction, calibrated probabilities | Not built; no validation evidence |
| Real-time streaming prices / signal changes | Not built (polling every 60 s only) |
| Backtesting module | Engine, `POST /api/backtest` and a `/backtest` page (3 rules, costs, equity curve vs buy-and-hold, metrics, assumptions). Engine/API unit-tested; the page compiles and builds but has **not been checked in a browser or by an automated UI test**. Walk-forward is not exposed. It reports what a rule did historically, not a prediction |
| Portfolio factor exposure, correlation matrix, beta, stress tests, liquidity risk | Not built |
| AI research workspace with evidence per claim | Not built |
| Direct NSE/BSE feed | Not built; Yahoo only |
| Command palette, full accessibility audit, redesigned mobile layout | Not built |
| Email/SMS alert channels, subscriptions/billing | Not built (`subscriptionTier` is a stored label only; nothing is gated on it) |

## Disclaimer shown to users

Informational and educational only; not investment advice; past performance does not
guarantee future results; data may be delayed or inaccurate.
