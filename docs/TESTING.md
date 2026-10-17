# Testing

| Layer | Command | Needs | What it covers |
|---|---|---|---|
| Unit / route | `npm test` | nothing | Pure logic and route handlers with the database, Yahoo, email and Redis mocked or in-memory |
| Integration | `npm run test:integration` | `TEST_DATABASE_URL` (scratch Postgres with migrations applied) | Real SQL: constraints, cascades, token races, legacy-data lookups |
| Typecheck | `npm run typecheck` | — | `tsc --noEmit` |
| Lint | `npm run lint` | — | ESLint; **existing** errors are baselined, new ones fail; warnings are capped |
| Bundle guard | `npm run build && npm run check:bundle` | build output | Sample data must not ship |
| Audit | `npm audit --omit=dev --audit-level=high` | network | Production dependencies |
| ML (Python) | `python -m unittest discover -s ml/tests -t .` | `pip install -r ml/requirements.txt` | Purged splitter, leakage detector, metrics, cost-aware strategy, deployment gate |
| E2E | `npm run build && npm run test:e2e` | Chromium (`npx playwright install chromium`); `E2E_DATABASE_URL` for the signed-in tier | Public pages, access control, health, headers, mobile overflow (desktop + mobile); WCAG 2.1 AA via axe in both themes; login -> stock risk model -> backtest -> model evidence -> committee -> research -> portfolio risk |

## Current suite (this branch)

| Suite | Count | Status (local run) |
|---|---|---|
| Vitest unit/route/render | 88 files, 797 tests | all pass |
| Vitest integration (real Postgres) | 1 file, 16 tests | runs in CI (`migrations` job) |
| Python ML | 15 tests | all pass |
| Playwright public tier | 11 tests x 2 projects (desktop, mobile) = 22 | all pass (incl. command palette by keyboard, committee API 401, no horizontal overflow) |
| Playwright accessibility | 5 public pages (incl. /team) x 2 themes = 10 (axe, WCAG 2.1 A/AA) | all pass |
| Playwright signed-in tier | 8 tests (login, stock + live stream + risk, backtest, models, committee, committee refusal, research, portfolio) | not run locally (no local DB credentials); passes in CI |

ML/AI areas added on this branch: point-in-time features (truncation and tampering tests), labels, dataset integrity,
Python<->TypeScript prediction parity (25 real rows, 1e-6), regime parity, registry hash and single-production checks,
monotonicity regression test for the v1.0.0 defect, evidence contract, numeric grounding guard, LLM explainer with a
mocked SDK (grounded text accepted; invented numbers, refusals and API errors fall back), risk route
(auth, validation, 503/404/422, rate limit), walk-forward route, evaluation API, portfolio analytics (hand-checkable
cases), stress scenarios, server-rendered UI views (risk panel, model evidence, portfolio risk), and a guard that
price targets cannot return through the LLM, rule report, prompts or Telegram.

Investment committee (`tests/agents/`, 20 files): schemas and validation, intent parsing and routing, the data
context (sharing, timeouts, retry), evidence reliability and freshness, each agent on fixed data (including missing,
stale and failing inputs), CIO rules (weights, disagreements, overrides, INSUFFICIENT DATA), the orchestrator end to end
(event order, failed agents, unsupported assets, an injected headline that must not change the decision), the API route
(auth, validation, streaming, per-user holdings, rate limit), the guarded LLM rewrite (mocked SDK) and the UI state and
rendering.

Earlier areas: secrets and webhook auth, Telegram, rate limiting, signup/verify, credential sign-in, session revocation,
admin gate, tokens, email, validation, route access, alerts, backtest engine, observability.

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

- E2E does not cover signup/verify/reset in a browser, portfolio import, alerts UI or OAuth.
- Large legacy pages (dashboard, portfolio, analyze) have no component tests.
- No load or performance tests.
