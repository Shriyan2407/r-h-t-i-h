-- Auth hardening:
--   * users.role (USER | ADMIN) replaces the hardcoded admin email check
--   * users.sessionVersion lets password changes revoke existing JWT sessions
--   * password_reset_tokens stores a SHA-256 hash instead of the raw token

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- DropIndex
DROP INDEX "password_reset_tokens_token_key";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER',
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- Outstanding reset tokens were stored in plaintext. Invalidate them all: the new
-- column cannot be backfilled (only a hash of the emailed token is kept from now on).
DELETE FROM "password_reset_tokens";

-- AlterTable
ALTER TABLE "password_reset_tokens" DROP COLUMN "token",
ADD COLUMN     "tokenHash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

