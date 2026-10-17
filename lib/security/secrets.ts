import { createHash, timingSafeEqual } from "node:crypto";

export type SecretCheck =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string };

/**
 * Constant-time string comparison. Both values are hashed first so the
 * comparison runs over equal-length buffers and leaks neither content nor length.
 */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Verify a caller-supplied secret against the configured one.
 * Fails CLOSED: if the server has no secret configured, nothing is accepted
 * (503), so a missing env var can never turn into an open endpoint.
 */
export function checkSecret(
  provided: string | null | undefined,
  expected: string | undefined,
): SecretCheck {
  if (!expected) {
    return { ok: false, status: 503, error: "Server misconfigured" };
  }
  if (!provided) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return safeEqual(provided, expected)
    ? { ok: true }
    : { ok: false, status: 401, error: "Unauthorized" };
}

/** Verify an `Authorization: Bearer <secret>` header (the scheme Vercel Cron uses). */
export function checkBearer(req: Request, expected: string | undefined): SecretCheck {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer (.+)$/.exec(header);
  return checkSecret(match ? match[1] : null, expected);
}
