import { z } from "zod";
import bcrypt from "bcryptjs";
import { findUserByEmail } from "./users";
import { EmailNotVerifiedError, TooManyAttemptsError } from "./errors";
import { enforceRateLimit, POLICIES } from "@/lib/ratelimit/guard";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(100),
});

/**
 * Valid bcrypt hash (cost 12) of a random value nobody knows. Used to burn the same
 * CPU time when an account does not exist, so response time does not reveal which
 * emails are registered.
 */
const DUMMY_HASH = "$2b$12$9c/Xr9kFnGvrUuQ9dN/s8OxgyfQYwlQFWLHhlsdmJabHRd3ighnuu";

export interface AuthorizedUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

/**
 * Credentials sign-in. Returns the user on success and `null` for any failure the
 * client should see as plain "invalid email or password".
 *
 * Throws typed errors only for conditions that are safe to disclose *after* the
 * password has been proven correct (unverified email) or that are not about the
 * account at all (rate limiting).
 */
export async function authorizeCredentials(
  credentials: unknown,
  request: Request,
): Promise<AuthorizedUser | null> {
  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) return null;
  const { email, password } = parsed.data;

  // Limit by IP (spraying across accounts) and by account (guessing one password).
  if (await enforceRateLimit(request, POLICIES.login)) throw new TooManyAttemptsError();
  if (await enforceRateLimit(request, POLICIES.login, `email:${email}`)) throw new TooManyAttemptsError();

  const user = await findUserByEmail(email);
  const passwordOk = await bcrypt.compare(password, user?.hashedPassword ?? DUMMY_HASH);
  if (!user || !user.hashedPassword || !passwordOk) return null;

  // Only now - with a correct password - is it safe to say the email is unverified.
  if (!user.emailVerified) throw new EmailNotVerifiedError();

  return { id: user.id, name: user.name, email: user.email, image: user.image };
}
