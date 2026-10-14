import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/observability/sentry";

/** Server and edge error tracking. Inactive (no network calls) unless SENTRY_DSN is set. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init(sentryOptions(process.env.SENTRY_DSN));
  }
}

/** Uncaught errors in route handlers, server components and middleware. */
export const onRequestError = Sentry.captureRequestError;
