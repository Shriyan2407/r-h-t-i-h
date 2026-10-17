import { describe, expect, it, vi } from "vitest";

const capture = vi.hoisted(() => vi.fn());
vi.mock("@sentry/nextjs", () => ({ captureException: capture }));

import { scrubEvent, sentryOptions, stripQuery } from "@/lib/observability/sentry";
import { reportError } from "@/lib/observability/errors";
import { setLogSink } from "@/lib/observability/logger";
import { snapshot, resetMetrics } from "@/lib/observability/metrics";

describe("error tracking privacy", () => {
  it("is disabled without a DSN", () => {
    expect(sentryOptions(undefined).enabled).toBe(false);
    expect(sentryOptions("https://k@o.ingest.sentry.io/1").enabled).toBe(true);
    expect(sentryOptions(undefined).sendDefaultPii).toBe(false);
  });

  it("strips query strings (reset/verification tokens live there)", () => {
    expect(stripQuery("https://x.test/auth/reset-password?token=abc123")).toBe("https://x.test/auth/reset-password?[redacted]");
    expect(stripQuery("https://x.test/models")).toBe("https://x.test/models");
  });

  it("drops cookies, bodies, auth headers and user details other than id", () => {
    const ev = scrubEvent({
      request: {
        url: "https://x.test/api/auth/reset?token=t0k",
        cookies: { "authjs.session-token": "s" },
        data: { password: "hunter2" },
        query_string: "token=t0k",
        headers: { Authorization: "Bearer x", Cookie: "a=b", "user-agent": "ua" },
      },
      user: { id: "u1", email: "a@b.c", ip_address: "1.2.3.4" },
      extra: { password: "p", ticker: "TCS" },
      breadcrumbs: [{ data: { url: "https://x.test/api?token=t", apiKey: "k" } }],
    });
    expect(JSON.stringify(ev)).not.toMatch(/hunter2|t0k|Bearer|a=b|a@b\.c|1\.2\.3\.4|"p"|"k"/);
    expect(ev.user).toEqual({ id: "u1" });
    expect(ev.request?.headers).toEqual({ "user-agent": "ua" });
    expect(ev.extra).toEqual({ password: "[redacted]", ticker: "TCS" });
  });

  it("reportError logs, counts and captures", () => {
    resetMetrics();
    const lines: string[] = [];
    setLogSink((_l, line) => lines.push(line));
    reportError("x.failed", new Error("boom"), { requestId: "r1" });
    setLogSink(null);
    expect(capture).toHaveBeenCalledWith(expect.any(Error), { tags: { event: "x.failed" }, extra: { requestId: "r1" } });
    expect(JSON.parse(lines[0])).toMatchObject({ level: "error", event: "x.failed", requestId: "r1" });
    expect(snapshot().counters["error.x.failed"]).toBe(1);
  });
});
