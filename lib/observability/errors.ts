import * as Sentry from "@sentry/nextjs";
import { log } from "./logger";
import { incr } from "./metrics";

/**
 * Report a handled error: structured log + error-tracking event + counter. Use in catch blocks that return a
 * generic 500, so the failure is still visible to operators. `context` is redacted by the logger and by Sentry's
 * beforeSend; never put holdings, emails or tokens in it.
 */
export function reportError(event: string, err: unknown, context: Record<string, unknown> = {}): void {
  incr(`error.${event}`);
  log.error(event, { ...context, error: err });
  Sentry.captureException(err, { tags: { event }, extra: context });
}
