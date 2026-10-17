import { describe, expect, it, vi } from "vitest";
import { ResearchContext } from "@/lib/agents/context";
import { parseIntent } from "@/lib/agents/intent";
import { loaders, trendBars } from "./fixtures";

const ctx = (q: string, l = loaders(), timeoutMs = 1000) => new ResearchContext(parseIntent(q), l, { requestId: "t", now: new Date("2026-10-17T00:00:00Z"), timeoutMs, retryDelayMs: 1 });

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

  it("retries a provider error once, but not a timeout or an empty answer", async () => {
    let n = 0;
    const flaky = vi.fn(async () => { if (++n === 1) throw new Error("ECONNRESET"); return trendBars(10); });
    const c = new ResearchContext(parseIntent("Should I buy TCS?"), loaders({ marketBars: flaky, news: vi.fn(async () => []) }), { requestId: "t", retryDelayMs: 1 });
    const d = await c.index();
    expect(d).toMatchObject({ status: "ok", attempts: 2 });
    const empty = await c.news("TCS");
    expect(empty).toMatchObject({ status: "empty", attempts: 1 });
    const down = new ResearchContext(parseIntent("Should I buy TCS?"), loaders({ fundamentals: async () => { throw new Error("500"); } }), { requestId: "t", retryDelayMs: 1 });
    expect(await down.fundamentals("TCS")).toMatchObject({ status: "error", attempts: 2, error: "500" });
  });

  it("resolves the subject from the intent", async () => {
    expect(await ctx("Should I buy TCS?").subject()).toEqual({ kind: "asset", ticker: "TCS" });
    expect(await ctx("Build a portfolio from TCS and INFY").subject()).toEqual({ kind: "portfolio", source: "query", tickers: ["TCS", "INFY"] });
    const saved = ctx("Review my portfolio", loaders({ holdings: async () => [{ ticker: "TCS", quantity: 5, sector: "IT" }] }));
    expect(await saved.subject()).toEqual({ kind: "portfolio", source: "saved", tickers: ["TCS"] });
    expect(await ctx("What is the market outlook?").subject()).toEqual({ kind: "market" });
  });
});
