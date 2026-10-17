import { prisma } from "./prisma";

/**
 * The security-relevant slice of a user that must be re-checked against the database
 * even though sessions are stateless JWTs: revocation (sessionVersion), authorisation
 * (role) and entitlement (subscriptionTier). Never trust these from client-supplied data.
 */
export interface UserAuthState {
  sessionVersion: number;
  role: "USER" | "ADMIN";
  subscriptionTier: string;
  emailVerified: Date | null;
}

const TTL_MS = 30_000;
const MAX_ENTRIES = 5_000;

const cache = new Map<string, { value: UserAuthState | null; expiresAt: number }>();

/**
 * Load a user's auth state. Results are cached per process for 30 seconds so
 * `auth()` calls on a busy page do not each hit the database; pass `fresh: true`
 * for privileged decisions (admin actions) that must see the latest state.
 */
export async function getUserAuthState(
  userId: string,
  opts: { fresh?: boolean } = {},
): Promise<UserAuthState | null> {
  const now = Date.now();
  if (!opts.fresh) {
    const hit = cache.get(userId);
    if (hit && hit.expiresAt > now) return hit.value;
  }

  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { sessionVersion: true, role: true, subscriptionTier: true, emailVerified: true },
  });

  if (cache.size >= MAX_ENTRIES) cache.clear();
  cache.set(userId, { value: row, expiresAt: now + TTL_MS });
  return row;
}

/** Drop cached state, e.g. after this instance changed a user's role or password. */
export function invalidateUserAuthState(userId?: string) {
  if (userId) cache.delete(userId);
  else cache.clear();
}
