# Testing

| Layer | Command | Needs | What it covers |
|---|---|---|---|
| Unit / route | `npm test` | nothing | Pure logic and route handlers with the database, Yahoo, email and Redis mocked or in-memory |
| Integration | `npm run test:integration` | `TEST_DATABASE_URL` (scratch Postgres with migrations applied) | Real SQL: constraints, cascades, token races, legacy-data lookups |
| Typecheck | `npm run typecheck` | — | `tsc --noEmit` |
| Lint | `npm run lint` | — | ESLint; **existing** errors are baselined, new ones fail; warnings are capped |
| Bundle guard | `npm run build && npm run check:bundle` | build output | Sample data must not ship |
| Audit | `npm audit --omit=dev --audit-level=high` | network | Production dependencies |

## Current suite (this branch)

- 25 unit files, 294 tests · 1 integration file, 16 tests (skipped unless `TEST_DATABASE_URL` is set).
- Areas: secrets and webhook auth, Telegram escaping/commands/rate limits, rate limiter backends,
  signup/verify/resend, credential sign-in, session callbacks and revocation, admin gate, profile
  (password change, deletion), password-reset and verification tokens, email sending/templates,
  ticker/portfolio/push validation, route access allow-list, market indices and briefing data,
  signal strength and absence of invented confidence, no-silent-mock behaviour, real `sharp`
  and SheetJS smoke tests.

## Running integration tests safely

```bash
# Any scratch Postgres; never real data. Example with a throwaway local cluster on port 55432:
export TEST_DATABASE_URL=postgresql://ci@127.0.0.1:55432/scratch
DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy
npm run test:integration
```

Tests only create/delete rows whose email starts with `it-`.

## Conventions

- Regression tests are written for every defect fixed (e.g. `Bearer undefined`, pre-hijack signup, client-set tier).
- Rate-limit and brute-force tests do not rely on wall-clock speed.
- Every `vi.mock` / `vi.hoisted` is at module top level (required by Vitest 5).

## Not covered yet

- **No end-to-end browser tests** (Playwright planned): login/signup/verify flows in a browser, stock page, portfolio import, alerts UI, mobile layout.
- No React component tests; large legacy pages are untested.
- Alert engine (`lib/services/alertEngine.ts`) detection/dedup logic has no dedicated tests yet.
- LLM output parsing is covered only for the confidence field.
- No load or performance tests.
