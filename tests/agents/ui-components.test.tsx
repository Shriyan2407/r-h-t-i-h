import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AgentActivity } from "@/components/research/committee/AgentActivity";
import { CommitteeMemo } from "@/components/research/committee/CommitteeMemo";
import { runCommittee } from "@/lib/agents/orchestrator";
import { loaders } from "./fixtures";

const NOW = new Date("2026-10-17T00:00:00Z");

describe("committee components", () => {
  it("renders the verdict, every memo section and linkable evidence", async () => {
    const result = await runCommittee("Should I buy TCS?", loaders(), { requestId: "req-9", now: NOW });
    const html = renderToStaticMarkup(createElement(CommitteeMemo, { result }));
    expect(html).toContain(result.decision.decision!);
    for (const h of ["Investment verdict", "Agent opinions", "Disagreements", "Scenarios", "Key catalysts", "Key risks", "What would change our mind", "Data used", "Evidence ("]) expect(html).toContain(h);
    expect(html).toContain("evidence agreement, not a probability");
    expect(html).toContain('role="meter"');
    // Data gaps are listed, not just counted.
    expect(html).toContain("What this agent could not see");
    expect(html).toContain("CPI inflation (DATA_UNAVAILABLE)");
    // Every evidence item has an anchor that citations link to.
    for (const e of result.evidence) expect(html).toContain(`id="ev-${e.id}"`);
    for (const m of html.matchAll(/href="#ev-([A-Z]\d+)"/g)) expect(html).toContain(`id="ev-${m[1]}"`);
    expect(html).toContain("req-9");
  });

  it("shows INSUFFICIENT DATA without a conviction meter", async () => {
    const result = await runCommittee("Should I buy NVIDIA?", loaders(), { requestId: "r", now: NOW });
    const html = renderToStaticMarkup(createElement(CommitteeMemo, { result }));
    expect(html).toContain("INSUFFICIENT DATA");
    expect(html).not.toContain('role="meter"');
    expect(html).toContain("No data was retrieved.");
  });

  it("agent activity announces progress and marks status in text, not only colour", () => {
    const html = renderToStaticMarkup(createElement(AgentActivity, {
      running: true,
      blocked: null,
      agents: [
        { id: "quant", name: "Quantitative Analyst", reason: "trend", wave: 1, status: "success", latencyMs: 1200, view: "lean_bullish", conclusion: "Rule score 1.5" },
        { id: "risk", name: "Risk & Portfolio Manager", reason: "downside", wave: 1, status: "running" },
        { id: "cio", name: "CIO / Investment Committee", reason: "decides", wave: 3, status: "pending" },
      ],
    }));
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Analysing: 1 of 3 agents reported");
    expect(html).toContain(">done<");
    expect(html).toContain(">working<");
    expect(html).toContain("Leans bullish");
    expect(html).toContain("1.2s");
  });
});
