import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/observability/sentry";

// Browser error tracking. Inactive unless NEXT_PUBLIC_SENTRY_DSN is set. No session replay (privacy).
Sentry.init(sentryOptions(process.env.NEXT_PUBLIC_SENTRY_DSN));

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
