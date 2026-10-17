# Security

Every control below is implemented in this repository and covered by a test unless noted.
Use [ENGINEERING_BASELINE.md](ENGINEERING_BASELINE.md) for the findings that motivated them.

## Controls

| Area | Control | Where | Tests |
|---|---|---|---|
| Secrets | Cron and webhook secrets compared in constant time and **fail closed**: 503 when unset, never the literal `Bearer undefined` | `lib/security/secrets.ts`, `app/api/cron/*`, `telegram/*` | `tests/security/secrets.test.ts`, `telegram-webhook.test.ts` |
| Telegram | Mandatory webhook secret; Zod-validated updates; strict ticker/token patterns; all interpolated text HTML-escaped; `/analyze` needs a linked account and is limited to 10/hour/chat | `lib/telegram/updates.ts`, `app/api/telegram/webhook` | `telegram-*.test.ts`, `analyze-flow.test.ts` |
| Signup | Email verification required; identical response for new/existing addresses; re-signup on an **unverified** account replaces its credentials (pre-hijack defence) | `app/api/auth/signup` | `signup-verify.test.ts` |
| Login | Unverified emails cannot sign in (disclosed only after a correct password); per-IP and per-account limits; dummy bcrypt for unknown accounts | `lib/auth/credentials.ts` | `credentials.test.ts` |
| OAuth | No automatic account linking; Google email must be verified | `lib/auth/auth.ts`, `callbacks.ts` | `callbacks.test.ts` |
| Sessions | `sessionVersion` revocation; role/tier read server-side; client `update()` may only set the display name | `lib/auth/callbacks.ts`, `authState.ts` | `callbacks.test.ts` + integration |
| Passwords | Reset tokens stored as SHA-256, single-use, 1 h expiry, delivered by email; change or reset revokes sessions; deletion needs the password (or email for OAuth-only) | `lib/auth/tokens.ts`, `app/api/user/profile` | `tokens.test.ts`, `profile.test.ts` |
| Admin | `role = ADMIN` **and** verified email, read fresh from the DB; no email allow-list; strict body schema | `lib/auth/admin.ts` | `admin.test.ts` |
| Rate limits | Signup, login, reset, verify, resend, search, AI, streaming, portfolio scan, Telegram `/analyze` | `lib/ratelimit/*` | `ratelimit.test.ts`, `rate-limited-routes.test.ts` |
| Input | Zod/regex validation of tickers, portfolio writes, pagination, upload type/size, push subscriptions | `lib/validation/*` | `ticker-validation`, `portfolio-validation`, `push` tests |
| SSRF | Web-push endpoints restricted to real push-service hosts, re-checked at send time | `lib/validation/push.ts`, `pushService.ts` | `push.test.ts` |
| Cost abuse | Intelligence endpoint requires a session, no longer busts its cache, limits cache misses | `app/api/intelligence/*` | `route-access.test.ts` |
| Errors | Internal error text is logged, not returned | `app/api/ai-analysis`, `app/api/agents/committee` | `rate-limited-routes.test.ts`, `tests/agents/route.test.ts` |
| Prompt injection | Retrieved text is sanitized; instruction-like headlines are quarantined before they reach evidence, claims or prompts; LLM input is wrapped as untrusted data; the decision is computed before any LLM call and a rewrite that changes it is rejected | `lib/agents/untrusted.ts`, `intelligence.ts`, `narrative.ts` | `untrusted.test.ts`, `intelligence.test.ts`, `narrative.test.ts`, orchestrator injection test |
| Committee API | Session required (route and middleware), Zod-validated query, 12 runs/h per user, `no-store`, holdings scoped to the session user, logs carry no query text or holdings | `app/api/agents/committee` | `tests/agents/route.test.ts`, `route-access.test.ts`, e2e public tier |
| Headers | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, COOP, HSTS (production); `X-Powered-By` removed; CSP in **report-only** mode | `lib/security/headers.ts`, `next.config.ts` | `tests/security/headers.test.ts` + verified on a running production server |
| Dependencies | `npm audit --omit=dev`: **0** vulnerabilities; CI fails on high/critical | `.github/workflows/ci.yml` | CI |
| Integrity | Production bundle must contain no sample data | `scripts/check-no-mock-in-bundle.mjs` | CI |

## Required production configuration

The app fails closed on these; set them before deploying (see DEPLOYMENT.md):
`DATABASE_URL`, `NEXTAUTH_SECRET` (unique per environment), `NEXTAUTH_URL` (https),
`RESEND_API_KEY` + `EMAIL_FROM`, `CRON_SECRET`, `TELEGRAM_WEBHOOK_SECRET` (if Telegram is used).
`UPSTASH_REDIS_REST_*` is strongly recommended: without it rate limits are per-instance only.

## Known limitations (be honest about these)

- **Rate limits are best-effort without Upstash** and fail **open** if Redis is down.
- **Yahoo Finance is an unofficial API**: it can change or throttle without notice; data may be delayed.
- **JWT sessions** are revalidated against the DB with a 30 s per-instance cache, so a revoked
  session or demoted admin can persist up to 30 s on an instance that cached the old state
  (admin actions read fresh).
- **CSP is report-only**, and still allows `'unsafe-inline'` scripts (Next.js bootstrap + theme/service-worker snippets). It must be validated in a real browser, moved to per-request nonces, and enforced.
- **Error tracking** (Sentry) runs only when `SENTRY_DSN` is set; there is **no audit log** yet.
- `braces` (dev tooling) has an unfixed advisory; not shipped to production.
- `xlsx` is installed from SheetJS's own registry (cdn.sheetjs.com), the vendor's supported
  channel for fixed releases; the lockfile pins its integrity hash.
- Passwords have no breach-list or complexity check beyond length 8–100.
- A second concurrent signup for the same unverified address can still race the first; the
  window is small and requires inbox access to exploit.

## Operator tasks

- Grant admin: `npm run admin:promote -- user@example.com` (needs `DATABASE_URL`). Revoke with `--revoke`.
- Rotate `NEXTAUTH_SECRET`: invalidates all sessions (users sign in again).
- Register the Telegram webhook after deploy: `POST /api/telegram/setup-webhook` with header
  `x-setup-secret: $CRON_SECRET`. It refuses to register without `TELEGRAM_WEBHOOK_SECRET`.

## Reporting a vulnerability

Open a private security advisory on the GitHub repository. Do not file public issues for security problems.
