"use client";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/** Last-resort boundary when the root layout itself fails. Must render its own <html> and <body>. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#050505", color: "#f5f5f5", fontFamily: "system-ui, sans-serif" }}>
        <main role="alert" style={{ maxWidth: 520, margin: "0 auto", padding: "120px 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>EquityLens is temporarily unavailable</h1>
          <p style={{ color: "#a0a0a0" }}>An unexpected error occurred. Please try again.</p>
          <button onClick={reset} style={{ background: "#FFD700", color: "#050505", border: 0, borderRadius: 8, padding: "9px 16px", fontWeight: 600, cursor: "pointer" }}>
            Try again
          </button>
          {error.digest && <p style={{ marginTop: 18, fontSize: 11, color: "#888" }}>Reference: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
