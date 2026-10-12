import { auth } from "./auth";
import { getUserAuthState } from "./authState";

export interface AdminIdentity {
  id: string;
  email: string | null;
}

/**
 * Authorise an administrator.
 *
 * Requires ALL of:
 *   - a valid session,
 *   - role === ADMIN in the database (read fresh, not from the token or cache),
 *   - a verified email address.
 *
 * There is no email allow-list and no environment-variable bootstrap: roles are
 * granted only by an operator with database access (`npm run admin:promote`).
 * Returns null when the caller is not an administrator.
 */
export async function requireAdmin(): Promise<AdminIdentity | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  const state = await getUserAuthState(id, { fresh: true });
  if (!state || state.role !== "ADMIN" || !state.emailVerified) return null;

  return { id, email: session.user.email ?? null };
}
