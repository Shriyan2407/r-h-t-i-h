import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/link", () => ({ default: (p: { href: string; children: React.ReactNode }) => createElement("a", { href: p.href }, p.children) }));

import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { SummaryStrip } from "@/components/portfolio/SummaryStrip";
import { AllocationCard } from "@/components/portfolio/AllocationCard";
import { concentrationNotes, sectorAllocation, summarize, toHoldingViews } from "@/features/portfolio/compute";
import type { PortfolioHolding } from "@/store/portfolioStore";

const h = (ticker: string, quantity: number, avgPrice: number, sector = "IT"): PortfolioHolding =>
  ({ id: `id-${ticker}`, ticker, name: `${ticker} Ltd`, exchange: "NSE", sector, quantity, avgPrice, addedAt: "2026-01-01" }) as PortfolioHolding;
const views = toHoldingViews([h("AAA", 10, 100), h("BBB", 5, 200, "Banks"), h("CCC", 1, 50)], { AAA: { price: 120, change: 2, changePct: 1.69 }, BBB: { price: 180, change: -1, changePct: -0.55 } });
const summary = summarize(views);
const slices = sectorAllocation(views);

describe("portfolio page components", () => {
  it("summary shows only computed figures and flags unpriced holdings", () => {
    const html = renderToStaticMarkup(createElement(SummaryStrip, { s: summary }));
    expect(html).toContain("+5.00%");
    expect(html).toContain("No current price for CCC");
    expect(html).not.toMatch(/Health Score|Sharpe|Beta|AI/);
  });

  it("table marks unavailable prices and has accessible sort and row controls", () => {
    const html = renderToStaticMarkup(createElement(HoldingsTable, { views, onEdit: () => {}, onRemove: () => {} }));
    expect(html).toContain("unavailable");
    expect(html).toMatch(/aria-sort="descending"/);
    expect(html).toContain('aria-label="Edit AAA"');
    expect(html).toContain('aria-label="Remove BBB"');
    expect(html).not.toMatch(/REDUCE|STRONG|WATCH|>HOLD</);
  });

  it("allocation card lists sectors with an accessible chart label and factual notes", () => {
    const html = renderToStaticMarkup(createElement(AllocationCard, { slices, notes: concentrationNotes(summary, slices) }));
    expect(html).toMatch(/aria-label="Sector allocation: IT 57%, Banks 43%"/);
    expect(html).toContain("AAA is 57.1% of priced value.");
  });
});
