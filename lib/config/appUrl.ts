/**
 * Canonical public origin of the app (no trailing slash), used for links in emails.
 *
 * `APP_URL` wins, then `NEXTAUTH_URL`. In production one of them must be set to an
 * https URL - we refuse to guess, because a wrong origin in a reset email is both a
 * broken feature and a phishing vector.
 */
export function getAppUrl(env: NodeJS.ProcessEnv = process.env): string {
  const raw = (env.APP_URL || env.NEXTAUTH_URL || "").trim().replace(/\/+$/, "");

  if (!raw) {
    if (env.NODE_ENV === "production") {
      throw new Error("APP_URL (or NEXTAUTH_URL) must be set in production");
    }
    return "http://localhost:3000";
  }
  if (env.NODE_ENV === "production" && !raw.startsWith("https://")) {
    throw new Error("APP_URL must be an https URL in production");
  }
  return raw;
}
