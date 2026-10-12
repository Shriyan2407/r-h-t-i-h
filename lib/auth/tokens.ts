import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./prisma";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** 256 bits of randomness, hex-encoded. This is the value that is emailed to the user. */
export function generateSecureToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Tokens are stored as SHA-256 hashes so a database leak does not yield usable
 * reset links. SHA-256 (not bcrypt) is appropriate because the input is already
 * 256 bits of entropy - there is nothing to brute-force.
 */
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export interface IssuedResetToken {
  /** Raw token to embed in the emailed link. Never persisted. */
  token: string;
  email: string;
  name: string | null;
}

/**
 * Create a single-use reset token for the account, replacing any outstanding one.
 * Returns null when no account exists - callers must not reveal that to the requester.
 */
export async function createPasswordResetToken(email: string): Promise<IssuedResetToken | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const token = generateSecureToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  return { token, email: user.email, name: user.name };
}

/** Look up a reset token by its hash. Returns null for unknown, used or expired tokens. */
export async function validatePasswordResetToken(rawToken: string) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: true },
  });

  if (!record) return null;
  if (record.used) return null;
  if (record.expires < new Date()) return null;

  return record;
}
