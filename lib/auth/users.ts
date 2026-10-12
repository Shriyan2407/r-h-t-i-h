import { prisma } from "./prisma";

/**
 * Look up a user by email, ignoring case.
 *
 * New accounts are stored lower-cased, so the indexed unique lookup normally hits.
 * Accounts created before normalisation may be stored with mixed case; the
 * case-insensitive fallback keeps those users able to log in and reset passwords.
 */
export async function findUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const exact = await prisma.user.findUnique({ where: { email: normalized } });
  if (exact) return exact;
  return prisma.user.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" } },
  });
}
