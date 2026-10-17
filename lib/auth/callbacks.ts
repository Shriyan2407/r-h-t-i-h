import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";
import { getUserAuthState } from "./authState";

/**
 * JWT callback.
 *
 * Sessions are stateless, so every use of the token is re-checked against the
 * database (cached for 30s) for three things the token alone cannot guarantee:
 *   - revocation: `sv` must equal users.sessionVersion (bumped on password change/reset)
 *   - authorisation: role is read from the database, never from the client
 *   - entitlement: subscriptionTier is read from the database, never from the client
 *
 * Returning null ends the session.
 */
export async function jwtCallback(params: {
  token: JWT;
  user?: { id?: string } | null;
  trigger?: "signIn" | "signUp" | "update";
  session?: { user?: { name?: unknown } } | null;
}): Promise<JWT | null> {
  const { token, user, trigger, session } = params;

  // First issue of the token (sign-in): take authoritative values from the database.
  if (user?.id) {
    const state = await getUserAuthState(user.id, { fresh: true });
    if (!state) return null;
    token.id = user.id;
    token.sv = state.sessionVersion;
    token.role = state.role;
    token.subscriptionTier = state.subscriptionTier;
    return token;
  }

  // `useSession().update(...)` is client-controlled input: only the display name may
  // be changed this way. Role, tier and identity are never taken from it.
  if (trigger === "update" && typeof session?.user?.name === "string") {
    token.name = session.user.name.trim().slice(0, 50);
  }

  if (!token.id) return null;

  const state = await getUserAuthState(token.id);
  if (!state || state.sessionVersion !== token.sv) return null;

  token.role = state.role;
  token.subscriptionTier = state.subscriptionTier;
  return token;
}

export function sessionCallback({ session, token }: { session: Session; token: JWT }): Session {
  session.user.id = token.id;
  session.user.role = token.role ?? "USER";
  session.user.subscriptionTier = token.subscriptionTier ?? "free";
  return session;
}

/** Only accept Google accounts whose email Google itself has verified. */
export function signInCallback(params: {
  account?: { provider?: string } | null;
  profile?: { email_verified?: boolean | null } | null;
}): boolean {
  if (params.account?.provider === "google") return params.profile?.email_verified === true;
  return true;
}
