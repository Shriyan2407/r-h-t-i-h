"use client";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";

/** Route-level error boundary: the page failed to render; the rest of the app keeps working. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main role="alert" style={{ maxWidth: 560, margin: "0 auto", padding: "120px 16px", textAlign: "center" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>This page could not be loaded</h1>
      <p style={{ color: "var(--th-text-muted)", margin: "10px 0 20px" }}>
        Something went wrong on our side. Your data is safe. You can try again, or go back to the dashboard.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button onClick={reset} style={{ background: "var(--primary)", color: "#050505", border: 0, borderRadius: 8, padding: "9px 16px", fontWeight: 600, cursor: "pointer" }}>
          Try again
        </button>
        <Link href="/dashboard" style={{ border: "1px solid var(--th-border-card)", borderRadius: 8, padding: "9px 16px" }}>Dashboard</Link>
      </div>
      {error.digest && <p style={{ marginTop: 18, fontSize: 11, color: "var(--th-text-muted)" }}>Reference: {error.digest}</p>}
    </main>
  );
}
