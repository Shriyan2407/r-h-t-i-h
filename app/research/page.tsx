import type { Metadata } from "next";
import { Suspense } from "react";
import { Navbar } from "@/components/Navbar";
import { MoveExplainer } from "@/components/research/MoveExplainer";

export const metadata: Metadata = {
  title: "Research",
  description: "Why is a stock moving today? An answer built only from cited evidence.",
};

export default function ResearchPage() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "96px 16px 64px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 6px" }}>Research</h1>
        <p style={{ color: "var(--th-text-muted)", margin: "0 0 24px", maxWidth: 680 }}>
          Ask why a stock is moving. Every statement links to its evidence; headlines are shown as possibly related,
          never as proven causes.
        </p>
        <Suspense fallback={null}>
          <MoveExplainer />
        </Suspense>
      </main>
    </>
  );
}
