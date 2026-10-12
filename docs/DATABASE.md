# Database

PostgreSQL via Prisma 5. Source of truth: [`prisma/schema.prisma`](../prisma/schema.prisma).
History: [`prisma/migrations`](../prisma/migrations).

## Models

```
User 1─* Account                      (OAuth links)
     1─1 UserPreferences
     1─* WatchlistItem                UNIQUE(userId, ticker)
     1─* RecentSearch · AIHistoryEntry   (indexed by userId + time)
     1─1 Portfolio 1─* PortfolioHolding   UNIQUE(portfolioId, ticker)
     1─* PasswordResetToken           tokenHash UNIQUE (SHA-256), expires, used
     1─1 TelegramConnection           chatId UNIQUE, connectToken UNIQUE, tokenExpiry
     1─1 AlertPreference · 1─* AlertHistory (indexed userId, sentAt)
     1─* PushSubscription             endpoint UNIQUE
VerificationToken(identifier, token UNIQUE = SHA-256, expires)   — email verification
Session                                (unused: sessions are JWTs)
```

Every child table references `users` with `ON DELETE CASCADE`; the integration test
`removes every dependent row when a user is deleted` proves account deletion leaves no personal data behind.

Security-relevant columns on `users`: `role` (`USER`|`ADMIN`), `sessionVersion` (bumped on
credential change), `emailVerified`, `hashedPassword` (bcrypt), `subscriptionTier`.

## Migrations

| Migration | Content |
|---|---|
| `0_init` | Baseline of the schema as it existed (generated offline with `prisma migrate diff`). Existing databases are marked applied, not re-run. |
| `1_auth_hardening` | `Role` enum + `users.role`, `users.sessionVersion`, `password_reset_tokens.token` → `tokenHash` (existing plaintext tokens deleted) |

Commands:

```bash
npx prisma migrate deploy                        # apply pending migrations (CI/production)
npx prisma migrate dev --name <change>           # create a new migration locally
npx prisma migrate resolve --applied 0_init      # one-time baseline of an existing database
```

CI applies all migrations to an empty Postgres 16, fails on drift between migrations and
`schema.prisma`, and runs the integration tests.

## Known schema debt (not yet done)

- `PortfolioHolding.quantity` / `avgPrice` are `Float`; money should be `Decimal`.
- `Session` and the NextAuth `VerificationToken` shape are kept for the Prisma adapter; `Session` is unused.
- No index on `PushSubscription.userId` or `TelegramConnection.isActive`; the alert engine loads every preference with its user's whole watchlist in one query, which will not scale past a modest user count.
- `AlertHistory` grows without a retention policy.
- A second, unrelated schema exists in `backend/database/schema.sql` (not in this repo, unused).
