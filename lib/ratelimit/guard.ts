import { rateLimit } from "./limiter";

export interface RateLimitPolicy {
  /** Stable name; part of the storage key. */
  name: string;
  limit: number;
  windowSec: number;
}

/**
 * Named policies. Numbers are deliberately conservative for abuse-prone endpoints
 * and generous for read endpoints that real users hit while browsing.
 */
export const POLICIES = {
  login: { name: "login", limit: 10, windowSec: 15 * 60 },
  signup: { name: "signup", limit: 5, windowSec: 60 * 60 },
  passwordReset: { name: "pwreset", limit: 5, windowSec: 60 * 60 },
  verifyEmail: { name: "verify", limit: 10, windowSec: 60 * 60 },
  resendVerification: { name: "resend", limit: 3, windowSec: 60 * 60 },
  search: { name: "search", limit: 60, windowSec: 60 },
  aiAnalysis: { name: "ai", limit: 15, windowSec: 60 * 60 },
  intelligence: { name: "intel", limit: 20, windowSec: 60 * 60 },
  portfolioScan: { name: "scan", limit: 10, windowSec: 60 * 60 },
  telegramWebhook: { name: "tgwh", limit: 300, windowSec: 60 },
  backtest: { name: "backtest", limit: 20, windowSec: 60 * 60 },
  mlRisk: { name: "mlrisk", limit: 60, windowSec: 60 * 60 },
  portfolioRisk: { name: "pfrisk", limit: 20, windowSec: 60 * 60 },
  // Each SSE connection lasts ~50 s, so a viewer reconnects ~70x per hour.
  liveQuotes: { name: "live", limit: 200, windowSec: 60 * 60 },
} as const satisfies Record<string, RateLimitPolicy>;

/** Best-effort client IP. On Vercel `x-forwarded-for` is set by the platform edge. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Apply a policy. Returns a ready-to-send 429 Response when the caller is over the
 * limit, otherwise null. `subject` narrows the bucket (an email, a user id); the
 * client IP is used when omitted.
 */
export async function enforceRateLimit(
  req: Request,
  policy: RateLimitPolicy,
  subject?: string,
): Promise<Response | null> {
  const who = (subject ?? clientIp(req)).toLowerCase();
  const result = await rateLimit({
    key: `rl:${policy.name}:${who}`,
    limit: policy.limit,
    windowSec: policy.windowSec,
  });
  if (result.allowed) return null;

  return Response.json(
    { error: "Too many requests. Please try again later.", code: "RATE_LIMITED" },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSec),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}
