# Deployment

Target: Vercel (the repository already has `vercel.json`) with a managed PostgreSQL. Nothing
here has been executed against production — the steps were verified on a local scratch
cluster and in CI-equivalent clean checkouts only.

## 1. Environment variables

See [`.env.example`](../.env.example) for the full annotated list. Minimum for a working,
secure production deployment:

| Variable | Why |
|---|---|
| `DATABASE_URL` | Prisma/PostgreSQL |
| `NEXTAUTH_SECRET` | Signs sessions. **Use a new value for production**; the previous one was shared between local and production env files |
| `NEXTAUTH_URL` | https origin |
| `RESEND_API_KEY`, `EMAIL_FROM` | Verification + reset email. **Without them signup and reset fail in production** (by design) |
| `CRON_SECRET` | Vercel Cron sends it as `Authorization: Bearer …`. Unset → cron endpoints return 503 |
| `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` | Telegram alerts. Unset webhook secret → webhook returns 503 |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Shared rate limits (recommended) |

## 2. Database migrations

Migrations live in `prisma/migrations`. The production database was created with
`prisma db push` and has no migration history, so it must be **baselined once**:

```bash
# 1. Back up the database first.
# 2. Tell Prisma the existing schema == 0_init (does not change data):
npx prisma migrate resolve --applied 0_init
# 3. Apply everything after it (adds role + sessionVersion, hashes reset tokens):
npx prisma migrate deploy
```

Verified on a scratch cluster with existing rows: users, tiers and verification state are
preserved; new columns default to `role=USER`, `sessionVersion=0`; **all outstanding password-reset
tokens are deleted** (they were stored in plaintext). A fresh database just runs `migrate deploy`.

Do this **before** deploying the new code: the code reads `users.role` and `users.sessionVersion`.

## 3. Deploy order

1. Back up the database; run the migration steps above.
2. Set the environment variables (section 1).
3. Deploy. `npm run build` runs `prisma generate && next build`.
4. Register the Telegram webhook (`POST /api/telegram/setup-webhook`, header `x-setup-secret`).
5. Create the first admin: `npm run admin:promote -- you@example.com`. The account must exist
   and have a verified email (existing credentials users must verify via the new emailed link).

## 4. Existing users after upgrade

- Password accounts whose `emailVerified` is empty **cannot sign in until they verify**. Their
  first login attempt shows "verify your email" with a resend button. Google users are unaffected.
- Everyone with an open session stays signed in until their token is next checked, then is
  checked against `sessionVersion` (unchanged, so still valid).

## 5. Platform notes

- `vercel.json` schedules 8 cron jobs, several more than once a day. **Vercel Hobby allows only
  daily crons** — confirm your plan or the deployment will be rejected. Which plan is in use is
  not verified.
- Functions that call LLMs set `maxDuration` 30–60 s. A local Ollama cannot run on Vercel; AI
  narrative needs `ANTHROPIC_API_KEY` or falls back to rule-based text.
- The Docker image expects `output: "standalone"`, which `next.config.ts` does not set; Vercel
  does not use the Dockerfile. Fix before relying on Docker.

## 6. CI

`.github/workflows/ci.yml` runs on every push/PR: install (`npm ci`), Prisma generate, lint,
typecheck, unit tests, build, bundle guard, production-dependency audit, and a job that applies
all migrations to Postgres 16, checks for schema drift and runs the integration tests. Making the
checks required for merges is a branch-protection setting in GitHub.
