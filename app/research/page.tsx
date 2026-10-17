import type { Metadata } from "next";
import { Suspense } from "react";
import { Navbar } from "@/components/Navbar";
import { MoveExplainer } from "@/components/research/MoveExplainer";
import { CommitteeWorkspace } from "@/components/research/committee/CommitteeWorkspace";

export const metadata: Metadata = {
  title: "Research",
  description: "A seven-agent investment committee and an evidence-only answer to why a stock is moving.",
};

export default function ResearchPage() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "96px 16px 64px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 6px" }}>Research</h1>
        <p style={{ color: "var(--th-text-muted)", margin: "0 0 24px", maxWidth: 680 }}>
          Seven specialist agents (strategist, quant, fundamental, intelligence, risk, contrarian and CIO) examine a question
          from real data. Every claim links to its evidence, gaps are stated, and the decision follows published rules.
        </p>
        <div id="committee" style={{ scrollMarginTop: 90 }}>
          <CommitteeWorkspace />
        </div>
        <h2 id="move" style={{ fontSize: 20, fontWeight: 700, margin: "40px 0 6px", scrollMarginTop: 90 }}>Why is a stock moving?</h2>
        <p style={{ color: "var(--th-text-muted)", margin: "0 0 16px", maxWidth: 680 }}>
          A quick evidence-only answer. Headlines are shown as possibly related, never as proven causes.
        </p>
        <Suspense fallback={null}>
          <MoveExplainer />
        </Suspense>
      </main>
    </>
  );
}
