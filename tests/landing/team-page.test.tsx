import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/link", () => ({ default: (p: { href: string; children: React.ReactNode }) => createElement("a", { href: p.href }, p.children) }));
vi.mock("@/components/Navbar", () => ({ Navbar: () => null }));

import TeamPage from "@/app/team/page";
import { AGENT_PROFILES } from "@/lib/agents/profiles";
import { AGENT_IDS } from "@/lib/agents/schema";
import { QUANT_RULES, RULE_EVALUATION } from "@/lib/agents/quant";
import { SIZING_RULES } from "@/lib/agents/risk";
import { ROLE_WEIGHTS } from "@/lib/agents/cio";

const html = renderToStaticMarkup(createElement(TeamPage));
const text = html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ");

describe("/team page", () => {
  it("shows every member with how it works, what it looks at, what it never does and what it hands over", () => {
    for (const a of AGENT_PROFILES) {
      expect(html).toContain(`id="${a.id}"`);
      expect(text).toContain(a.mandate);
      for (const s of [...a.howItWorks, ...a.looksAt, ...a.neverDoes]) expect(text).toContain(s.replace(/&/g, "&"));
      expect(text).toContain(a.handsOver);
    }
    for (const h of ["How it works", "What it looks at", "What it never does", "What it hands to the CIO"]) {
      expect(html.split(h).length - 1).toBe(AGENT_PROFILES.length);
    }
  });

  it("routes the example questions with the real router, including the refusal", () => {
    expect(text).toContain("Should I buy Reliance? Strategist, Quant, Fundamental, Intelligence, Risk, Contrarian");
    expect(text).toContain("Why did TCS fall today? Intelligence, Quant, Fundamental");
    expect(text).toMatch(/Should I buy NVIDIA\? None\. NVIDIA is not covered/);
  });

  it("labels the weight columns with the members' short names", () => {
    expect(text).toContain("Question type Strategist Quant Fundamental Intelligence Risk");
  });

  it("shows the CIO's live weights, with the quant halved while it has no measured edge", () => {
    const q = ROLE_WEIGHTS.investment_decision.quant! * (RULE_EVALUATION.measuredEdge ? 1 : 0.5);
    expect(text).toContain(`${Math.round(q * 100)}%${RULE_EVALUATION.measuredEdge ? "" : "*"}`);
    expect(text).toContain(`${Math.round(ROLE_WEIGHTS.investment_decision.fundamental! * 100)}%`);
  });

  it("reports the track record from the shipped evaluation, not a hard-coded claim", () => {
    expect(text).toContain(`${RULE_EVALUATION.meanRankIc.toFixed(3)} (t ${RULE_EVALUATION.tStat.toFixed(2)})`);
    expect(text).toContain("Fundamental and news: not yet testable");
    expect(text).not.toMatch(/\d+% accura|guarantee|agents active/i);
  });
});

describe("agent profiles match the code", () => {
  it("cover exactly the seven agents, in order", () => {
    expect(AGENT_PROFILES.map((a) => a.id)).toEqual([...AGENT_IDS]);
  });

  it("quote the quant and risk thresholds the code uses", () => {
    const quant = AGENT_PROFILES.find((a) => a.id === "quant")!.howItWorks.join(" ");
    expect(quant).toContain(`±${QUANT_RULES.momentum6m * 100}%`);
    expect(quant).toContain(`±${QUANT_RULES.momentum12m1m * 100}%`);
    expect(quant).toContain(`RSI above ${QUANT_RULES.overbought}`);
    const risk = AGENT_PROFILES.find((a) => a.id === "risk")!.howItWorks.join(" ");
    expect(risk).toContain(`${SIZING_RULES.moderate.budget * 100}% of the portfolio`);
    expect(risk).toContain(`capped at ${SIZING_RULES.moderate.cap * 100}%`);
  });
});
