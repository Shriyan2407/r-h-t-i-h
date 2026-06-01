import { randomBytes } from "crypto";
import { prisma } from "./prisma";

export function generateSecureToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createPasswordResetToken(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const token   = generateSecureToken();
  const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expires },
  });

  return token;
}

export async function validatePasswordResetToken(token: string) {
  const record = await prisma.passwordResetToken.findUnique({
    where:   { token },
    include: { user: true },
  });

  if (!record)          return null;
  if (record.used)      return null;
  if (record.expires < new Date()) return null;

  return record;
}
