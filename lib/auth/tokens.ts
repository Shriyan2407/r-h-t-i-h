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

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Create a single-use email verification token (stored hashed in NextAuth's
 * VerificationToken table), replacing any outstanding one for the address.
 * Returns the raw token to embed in the emailed link.
 */
export async function createEmailVerificationToken(email: string): Promise<string> {
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });

  const token = generateSecureToken();
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: hashToken(token),
      expires: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
    },
  });
  return token;
}

/**
 * Consume a verification token and mark the matching account's email as verified.
 * Returns the verified address, or null for unknown, expired or already-used tokens.
 * The delete-with-count makes consumption atomic: two concurrent requests cannot
 * both succeed with the same token.
 */
export async function consumeEmailVerificationToken(rawToken: string): Promise<string | null> {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.verificationToken.findUnique({ where: { token: tokenHash } });
  if (!record) return null;

  const { count } = await prisma.verificationToken.deleteMany({ where: { token: tokenHash } });
  if (count !== 1) return null;
  if (record.expires < new Date()) return null;

  await prisma.user.updateMany({
    where: { email: record.identifier, emailVerified: null },
    data: { emailVerified: new Date() },
  });
  return record.identifier;
}
