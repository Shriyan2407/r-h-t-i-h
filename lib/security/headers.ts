/**
 * HTTP security headers applied to every response (see next.config.ts).
 *
 * Enforced now: headers that cannot break rendering (MIME sniffing, framing, referrer,
 * powerful-feature access, HSTS).
 *
 * Content-Security-Policy is shipped as REPORT-ONLY. A wrong enforced CSP silently breaks
 * the app (inline bootstrap scripts, OCR/PDF web workers, remote news images), and it
 * cannot be validated without driving the app in a real browser. Report-only surfaces
 * violations in the console without blocking anything; promote it to enforced after a
 * browser pass, ideally replacing 'unsafe-inline' with per-request nonces.
 */

export interface SecurityHeader {
  key: string;
  value: string;
}

/** Exact Sentry ingest origin from the configured DSN (no wildcard); omitted when error tracking is off. */
export function sentryOrigin(dsn = process.env.NEXT_PUBLIC_SENTRY_DSN): string[] {
  try {
    return dsn ? [new URL(dsn).origin] : [];
  } catch {
    return [];
  }
}

/** Everything the app loads in the browser, by origin. Keep this list tight and explained. */
const CSP_DIRECTIVES: Record<string, string[]> = {
  "default-src": ["'self'"],
  // Next.js and the theme no-FOUC / service-worker bootstrap are inline scripts.
  "script-src": ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.jsdelivr.net"],
  "style-src": ["'self'", "'unsafe-inline'"],
  // News thumbnails and avatars come from arbitrary publisher/OAuth hosts.
  "img-src": ["'self'", "data:", "blob:", "https:"],
  "font-src": ["'self'", "data:"],
  // tesseract.js downloads language data; same-origin API calls; Sentry ingest only when configured.
  "connect-src": ["'self'", "https://unpkg.com", "https://cdn.jsdelivr.net", "https://tessdata.projectnaptha.com", ...sentryOrigin()],
  "worker-src": ["'self'", "blob:"],
  "frame-ancestors": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "object-src": ["'none'"],
};

export function buildCsp(directives: Record<string, string[]> = CSP_DIRECTIVES): string {
  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(" ")}`)
    .join("; ");
}

export function securityHeaders(opts: { production: boolean }): SecurityHeader[] {
  const headers: SecurityHeader[] = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  ];

  if (opts.production) {
    // Browsers ignore HSTS over plain http, so this is only meaningful (and only sent) in production.
    headers.push({ key: "Strict-Transport-Security", value: "max-age=31536000" });
    headers.push({ key: "Content-Security-Policy-Report-Only", value: buildCsp() });
  }
  return headers;
}
