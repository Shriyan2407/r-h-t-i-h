import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/link", () => ({ default: (p: { href: string; children: React.ReactNode }) => createElement("a", { href: p.href }, p.children) }));

import { InvestorCommitteeSection } from "@/components/landing/InvestorCommitteeSection";

describe("landing: investor section", () => {
  const html = renderToStaticMarkup(createElement(InvestorCommitteeSection));

  it("introduces the committee to investors and lists all seven specialists", () => {
    expect(html).toContain("For investors");
    expect(html).toContain("Your own investment committee");
    for (const name of ["Strategist", "Quant", "Fundamental", "Intelligence", "Risk", "Contrarian", "CIO"]) expect(html).toContain(`>${name}<`);
    expect(html).toContain('href="/research#committee"');
  });

  it("states what the committee is not, and makes no performance or activity claims", () => {
    expect(html).toMatch(/They are not predictions/);
    expect(html).toMatch(/Not investment advice/);
    expect(html).not.toMatch(/\d+% accura|guarantee|agents active|AI-Powered|multi-agent/i);
  });
});
