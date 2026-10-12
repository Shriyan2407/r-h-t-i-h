# Changelog

Branch `modernization/production-hardening` (from `master` @ `80ea5e6`). Newest first within
each theme. Hashes are for this local branch and will change if history is rewritten.

## Security
- Cron and webhook-setup secrets compare in constant time and **fail closed** (503) — no more `Bearer undefined` (`84a7690`, `86ba6e1`)
- Telegram webhook secret mandatory; Zod-validated updates; HTML escaping; analysis needs a linked account and is limited per chat (`be49f5b`, `20f9740`, `7239b0a`)
- Email verification at signup; pre-hijack defence; verify + resend endpoints and UI (`3e0ad19`, `9ce8083`, `94ceff6`)
- Sign-in: unverified blocked, per-IP/account limits, no timing oracle, **no dangerous OAuth linking**, Google email must be verified (`919f30d`)
- Sessions revoked on password change/reset; client can no longer set `subscriptionTier` (`919f30d`, `76c7e36`, `fc11d78`)
- Admin by database role + verified email instead of a hardcoded address (`e9e9b95`)
- Reset tokens hashed and actually emailed (`76c7e36`, `24f0fa6`, `8e45ffa`)
- Rate limiting (Upstash or in-memory) on auth, search, AI, upload and webhook paths (`8973609`, `8af9f4f`)
- Ticker, portfolio, pagination, upload and push validation; push SSRF closed; no internal errors returned (`f675491`, `d5cee37`, `ceabd30`, `8af9f4f`)
- Public uncached LLM endpoint closed (`7239b0a`)
- Account deletion needs re-authentication (`fc11d78`)
- Production dependencies: 11 findings (4 critical, 6 high) → **0**; Next 16.2.6 → 16.4.0 fixes a critical proxy bypass (`7030585`)

## Honesty / fake data removed
- Telegram `/briefing` and the cron briefing no longer send hardcoded indices, movers, "AI picks", FII/DII or a made-up risk score (`7e5e497`)
- Landing page: no fixed index values, mover prices, fake AI verdicts or "7 agents / <30 s" claims (`dbfa704`, `4740e54`)
- The "LIVE" market ticker was a random walk around fixed numbers; it now shows real quotes or says it is unavailable (`2899faa`)
- Dashboard and login panel hardcoded values and fake verdict cards removed (`66e811e`)
- Silent mock-data fallback removed; demo mode is explicit, dev-only and labelled; verified absent from production bundles (`842ccb2`)
- Invented "confidence %" replaced by **signal strength** + "unavailable"; LLM-written confidence discarded (`c1ab44a`, `4d374f3`)

- **AI verdict was a placeholder for every stock in production**: `ai-analysis` fetched its own `/api/technicals|fundamentals|macro` over HTTP without a session (401) and via `localhost:3000`; it now calls the services in-process, guarded by a regression test that fails on the old code

## Database
- Baseline migration and `1_auth_hardening` (role, sessionVersion, token hashes); verified on empty and populated databases; drift-checked in CI (`156c27f`, `76c7e36`)

## Engineering
- Restored files deleted in the working tree; lockfile synced (`2d9bc1c`); typecheck script (`4551f98`); `middleware.ts` → `proxy.ts` (`d6b0825`)
- ESLint baseline + warning cap (`deae33f`)
- CI: lint, typecheck, tests, build, bundle guard, audit, migrations + DB integration (`d23cf9f`, `2ecbb31`, `4a6d205`)
- Vitest harness, 294 unit tests, 16 real-database integration tests (`88fdefd` and throughout)
- Engineering baseline recorded (`d6ee83f`)

## Known issues carried forward
See ENGINEERING_BASELINE.md §5–7, ARCHITECTURE.md (macro self-call), and PRODUCT.md "Not built".
