# Engineering Baseline

Recorded on branch `modernization/production-hardening` at commit `e12f053`
(on top of `master` @ `80ea5e6`), before any hardening work. Everything below was
observed by running the command or reading the file; items we could not check are
marked **NOT VERIFIED**.

## 1. Repository state

| Item | Finding |
|---|---|
| Git repo root | `frontend/` only. The sibling `backend/` (Python) directory is **not under version control**. |
| Branches | `master` (tracks `origin/master`). 18 commits. |
| Tracked-but-deleted files in the working tree | `prisma/schema.prisma`, `public/*` (incl. `sw.js`), `store/*`, `types/next-auth.d.ts`. Restored from `HEAD`. |
| Uncommitted work | ~1,800 lines (UI refinements, CSV/XLSX/PDF portfolio parsers). Checkpointed in `e12f053`. |
| `.env*` committed in history | No (`git log --all -- .env .env.local .env.production` is empty). |
| Lockfile | `package-lock.json` was out of sync with `package.json`; `npm ci` failed. Fixed in the next commit. |

## 2. Toolchain results

| Command | Result |
|---|---|
| `npm install` / `npx prisma generate` | OK (Prisma 5.22). npm 11 blocks install scripts by default, so `prisma generate` must run explicitly. |
| `npx tsc --noEmit` | **0 errors** |
| `npx eslint .` | **186 errors, 118 warnings** (158 `no-explicit-any`, 117 `no-unused-vars`, 20 `react-hooks/set-state-in-effect`, 2 `purity`, 2 `immutability`, 2 `no-unescaped-entities`, 1 each `static-components`, `no-img-element`, `prefer-const`) |
| `npx next build` | **Passes** (~57 s). Warning: the `middleware` file convention is deprecated in favour of `proxy`. |
| Tests | **None.** No test runner, no `test` script. |
| CI | **None.** No `.github/`. |
| `typecheck` script | Missing from `package.json`. |
| `npm audit --omit=dev` | 11 vulnerabilities: **4 critical, 6 high, 1 moderate** (`next`, `next-auth`, `@auth/core`, `@auth/prisma-adapter`, `pdfjs-dist`, `sharp`, `nanoid`, `postcss`, `source-map-js`, `xlsx`). Not yet triaged per advisory. |

## 3. Current architecture (as deployed)

Next.js 16 / React 19 on Vercel. Route handlers under `app/api/*` are the only
backend that production uses. Data comes from `yahoo-finance2`, RSS feeds and
Reddit/StockTwits. The "AI" is a three-tier chain: Ollama (`localhost`, which cannot
exist on Vercel) -> Anthropic Claude (only if `ANTHROPIC_API_KEY` is set) -> a
deterministic template generator. Persistence is PostgreSQL via Prisma. Alerts are
sent by Vercel crons through Telegram and Web Push. Cache is process-local memory.

`frontend/lib/api.ts` states "No Python backend required". Nothing in the frontend
calls the FastAPI backend, `ai-service`, `ocr-service` or `ws-hub`.

## 4. Known vulnerabilities (verified in code)

| # | Severity | Issue | Location |
|---|---|---|---|
| 1 | High | Cron auth accepts `Bearer undefined` when `CRON_SECRET` is unset | `app/api/cron/*/route.ts` |
| 2 | High | Telegram webhook secret check is skipped when `TELEGRAM_WEBHOOK_SECRET` is unset | `app/api/telegram/webhook/route.ts` |
| 3 | High | `allowDangerousEmailAccountLinking: true` with no email verification (pre-hijack takeover) | `lib/auth/auth.ts`, `app/api/auth/signup/route.ts` |
| 4 | High | Admin = string equality with a hardcoded email default; email never verified | `app/api/admin/alerts/route.ts` |
| 5 | High | Client-controlled `subscriptionTier` copied into the JWT on `update()` | `lib/auth/auth.ts` |
| 6 | High | Public `/api/intelligence/*` always busts its cache and calls the LLM | `app/api/intelligence/[ticker]/route.ts` |
| 7 | Medium | No rate limiting on any route | all |
| 8 | Medium | Password reset links are never delivered (only logged in development); tokens stored in plaintext; sessions not revoked | `app/api/auth/forgot-password`, `lib/auth/tokens.ts` |
| 9 | Medium | Push `endpoint` is stored unvalidated and later POSTed to by the server | `app/api/push/subscribe/route.ts` |
| 10 | Medium | Weak input validation (portfolio numbers, pagination) | `app/api/user/portfolio`, `app/api/alerts/history` |
| 11 | Medium | Same `NEXTAUTH_SECRET` in `.env.local` and `.env.production` | env files (not committed) |
| 12 | Low | Account deletion needs no re-authentication | `app/api/user/profile` |

## 5. Known broken or misleading functionality

- `/briefing` in the Telegram bot sends hardcoded index levels, gainers, losers and "AI picks".
- The landing page shows hardcoded NIFTY/SENSEX/VIX values and static "AI verdicts".
- `lib/api.ts` silently substitutes generated mock data when an API call fails.
- `parseIntelligenceResponse` clamps `aiConfidence` into 60-95, so confidence can never be low.
- Company "history" is hand-written for 9 tickers and otherwise template- or LLM-generated with no fact checking.
- Password reset cannot work in production (no email provider).
- "7 AI agents" exists only in the unversioned, non-deployed Python backend, where `requirements.txt` omits `anthropic` and `tenacity`.
- Two unrelated schemas exist (`prisma/schema.prisma` and `backend/database/schema.sql`).
- The Docker image for the frontend expects `output: "standalone"`, which `next.config.ts` does not set.
- `vercel.json` defines 8 sub-daily crons; Vercel Hobby allows daily only. **NOT VERIFIED** which plan is in use.

## 6. Technical debt

- 135 `any` / `@ts-ignore` occurrences; very large single-file pages (`portfolio/page.tsx` ~95 KB).
- Technical indicators implemented in four places (TS route, `aiReasoningEngine.py`, `indicators/technical.py`, `quant/features/indicators.py`).
- In-memory cache is per serverless instance and therefore ineffective on Vercel.
- No structured logging, error tracking or metrics.
- Brand name is inconsistent: EquityLens / R.H.T.I.H / Market Ka Baadshah.
- `Session` and `VerificationToken` Prisma models are unused under the JWT strategy.
- Money fields (`quantity`, `avgPrice`) are `Float`.

## 7. Missing functionality

Tests, CI, rate limiting, email delivery, email verification, roles, shared cache,
background jobs, observability, a validated quant model, a backtesting UI, and
documentation beyond a stale README.

## 8. Not verified

Production environment variables (Vercel dashboard), production database contents,
the Vercel plan, authenticated pages on the live site, runtime performance, and bundle sizes.
