import { describe, expect, it, vi } from "vitest";
import { ResearchContext } from "@/lib/agents/context";
import { parseIntent } from "@/lib/agents/intent";
import { loaders, trendBars } from "./fixtures";

const ctx = (q: string, l = loaders(), timeoutMs = 1000) => new ResearchContext(parseIntent(q), l, { requestId: "t", now: new Date("2026-10-17T00:00:00Z"), timeoutMs });

describe("research context", () => {
  it("fetches each dataset once and shares it between agents", async () => {
    const stockBars = vi.fn(async (t: string) => ({ symbol: `${t}.NS`, bars: trendBars(10) }));
    const c = ctx("Should I buy TCS?", loaders({ stockBars }));
    const [a, b] = await Promise.all([c.stock("TCS"), c.stock("TCS")]);
    expect(stockBars).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(a).toMatchObject({ status: "ok", asOf: "2026-10-16" });
  });

  it("records failures, empties and timeouts instead of throwing", async () => {
    const c = ctx("Should I buy TCS?", loaders({
      fundamentals: async () => { throw new Error("upstream 500"); },
      news: async () => [],
      macro: () => new Promise(() => {}),
    }), 30);
    const [f, n, m] = await Promise.all([c.fundamentals("TCS"), c.news("TCS"), c.macro()]);
    expect(f).toMatchObject({ status: "error", value: null, error: "upstream 500" });
    expect(n).toMatchObject({ status: "empty", value: null });
    expect(m).toMatchObject({ status: "timeout", value: null });
    expect(c.datasets().map((d) => d.status).sort()).toEqual(["empty", "error", "timeout"]);
    expect(c.datasets().some((d) => "value" in d)).toBe(false);
  });

  it("resolves the subject from the intent", async () => {
    expect(await ctx("Should I buy TCS?").subject()).toEqual({ kind: "asset", ticker: "TCS" });
    expect(await ctx("Build a portfolio from TCS and INFY").subject()).toEqual({ kind: "portfolio", source: "query", tickers: ["TCS", "INFY"] });
    const saved = ctx("Review my portfolio", loaders({ holdings: async () => [{ ticker: "TCS", quantity: 5, sector: "IT" }] }));
    expect(await saved.subject()).toEqual({ kind: "portfolio", source: "saved", tickers: ["TCS"] });
    expect(await ctx("What is the market outlook?").subject()).toEqual({ kind: "market" });
  });
});
