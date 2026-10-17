import { describe, expect, it } from "vitest";
import { parseIntent } from "@/lib/agents/intent";
import { planExecution } from "@/lib/agents/router";

const plan = (q: string) => planExecution(parseIntent(q));

describe("agent routing", () => {
  it("a full investment decision convenes all seven agents, contrarian after the analysts and CIO last", () => {
    const p = plan("Should I buy Reliance?");
    expect(p.waves).toEqual([["strategist", "quant", "fundamental", "intelligence", "risk"], ["contrarian"], ["cio"]]);
    expect(p.blocked).toBeNull();
  });

  it("'why did it fall' runs intelligence, quant and fundamental, then the CIO", () => {
    expect(plan("Why did TCS fall today?").agents).toEqual(["intelligence", "quant", "fundamental", "cio"]);
  });

  it("a valuation question runs the five agents that bear on value", () => {
    expect(plan("Is Infosys overvalued?").agents).toEqual(["fundamental", "quant", "intelligence", "risk", "contrarian", "cio"]);
  });

  it("a portfolio question in a recession runs strategist, quant, risk, fundamental and contrarian", () => {
    const p = plan("Should I hold my portfolio during a recession?");
    expect(new Set(p.agents)).toEqual(new Set(["strategist", "quant", "fundamental", "risk", "contrarian", "cio"]));
  });

  it("does not run any analyst for an asset outside the NSE/BSE universe", () => {
    const p = plan("Should I buy NVIDIA right now?");
    expect(p.agents).toEqual(["cio"]);
    expect(p.blocked).toMatch(/NVIDIA is not covered/);
  });

  it("refuses to construct a portfolio without candidate stocks", () => {
    const p = plan("Build me a portfolio for moderate risk");
    expect(p.agents).toEqual(["cio"]);
    expect(p.blocked).toMatch(/at least 2/);
  });

  it("a market question with no asset only needs the strategist", () => {
    expect(plan("What is the market outlook?").agents).toEqual(["strategist", "cio"]);
  });

  it("every planned agent has a stated reason", () => {
    const p = plan("Should I buy Reliance?");
    for (const a of p.agents) expect(p.reasons[a]).toBeTruthy();
  });
});
