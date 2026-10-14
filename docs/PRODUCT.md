# Product

## Name

**EquityLens** is the canonical product name (decided 2026-10-14) and is used in the UI, metadata, emails, Telegram,
push notifications, prompts and documentation. Earlier names ("Market Ka Baadshah", "R.H.T.I.H") were removed;
browser storage keys from those names are migrated on first load so saved portfolios and settings are kept.
The Vercel project and its domain are still `market-ka-baadshah`; renaming them changes the live URL and is an
owner action in the Vercel dashboard (then set `NEXT_PUBLIC_APP_URL`).

## Who it is for

Indian retail investors who want one place to see price action, simple technical and
fundamental indicators, news and portfolio holdings, with optional Telegram/push alerts.

## What it is not

- Not investment advice, a broker, or a signal service. No order placement.
- Not a price-prediction engine: direction models were tested and rejected. The one validated model forecasts volatility (how much, not which way); see MODEL_EVALUATION.md.
- Not real-time: quotes come from Yahoo Finance and may be delayed.

## Built

Accounts with verification, market bar, quotes/charts/technicals/fundamentals, news and keyword
sentiment, rule-based verdict with signal strength, optional LLM narrative, portfolio CRUD and
import (CSV/XLSX/PDF/screenshot), Telegram and Web Push alerts with de-duplication, role-based
admin dashboard, a validated 5-day volatility model with regime and evidence, a model evidence page,
backtesting with walk-forward validation, and portfolio risk analytics with stress scenarios.

## Not built (do not claim)

| Idea | Status |
|---|---|
| Price-direction prediction, up/down probabilities, price targets | **Tested and rejected** (MODEL_EVALUATION.md); deliberately not shown |
| Multi-agent AI | Not built; the Python prototype is retired (ARCHITECTURE.md) |
| Fundamentals / news / macro as model inputs | Not built: no point-in-time history in the data source |
| Free-form AI research chat ("why is X moving?") | Not built; the Risk Model tab shows evidence-backed explanations for one forecast |
| Factor exposures beyond beta (size, value, momentum) | Not built |
| Real-time streaming prices / signal changes | Not built (polling every 60 s only) |
| Direct NSE/BSE feed | Not built; Yahoo only |
| Command palette, full accessibility audit, redesigned mobile layout | Not built |
| Email/SMS alert channels, subscriptions/billing | Not built (`subscriptionTier` is a stored label only; nothing is gated on it) |

## Disclaimer shown to users

Informational and educational only; not investment advice; past performance does not
guarantee future results; data may be delayed or inaccurate.
