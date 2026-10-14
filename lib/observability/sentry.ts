/**
 * Error-tracking options shared by the server, edge and browser Sentry SDKs.
 * Disabled unless a DSN is configured. Privacy: no default PII, cookies and auth headers are dropped, and query
 * strings are stripped from URLs (password-reset and verification links carry tokens in the query).
 */
import type { ErrorEvent } from "@sentry/nextjs";
import { redact } from "./logger";

const SENSITIVE_HEADER = /^(cookie|authorization|x-telegram-bot-api-secret-token|x-api-key)$/i;

export function stripQuery(url: string | undefined): string | undefined {
  if (!url) return url;
  const i = url.indexOf("?");
  return i === -1 ? url : `${url.slice(0, i)}?[redacted]`;
}

/** Remove secrets and personal data from an event before it leaves the process. Exported for tests. */
export function scrubEvent<T extends Pick<ErrorEvent, "request" | "user" | "extra" | "breadcrumbs">>(event: T): T {
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    event.request.url = stripQuery(event.request.url);
    delete event.request.query_string;
    if (event.request.headers) {
      for (const k of Object.keys(event.request.headers)) if (SENSITIVE_HEADER.test(k)) delete event.request.headers[k];
    }
  }
  if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;
  if (event.extra) event.extra = redact(event.extra) as Record<string, unknown>;
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b) => ({
      ...b,
      data: b.data ? { ...(redact(b.data) as Record<string, unknown>), url: stripQuery(b.data.url as string | undefined) } : b.data,
    }));
  }
  return event;
}

export function sentryOptions(dsn: string | undefined) {
  return {
    dsn,
    enabled: Boolean(dsn),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    sendDefaultPii: false,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    beforeSend: (event: ErrorEvent) => scrubEvent(event),
  };
}
