import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ auth: vi.fn(), fetchLiveQuotes: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/live/quotes", async (orig) => ({ ...(await orig<typeof import("@/lib/live/quotes")>()), fetchLiveQuotes: m.fetchLiveQuotes }));

import { changedQuotes, moveVsForecast, sseEvent, toLiveQuote, type LiveQuote } from "@/lib/live/quotes";
import { GET } from "@/app/api/stream/quotes/route";
import { MemoryBackend, setRateLimitBackend } from "@/lib/ratelimit/limiter";

const q = (ticker: string, price: number, time = "2026-10-14T05:00:00.000Z"): LiveQuote => ({
  ticker, price, change: 1, changePct: 0.5, time, marketState: "REGULAR", delayed: true, source: "yahoo-finance",
});

describe("live quote helpers", () => {
  it("maps provider fields and refuses quotes without a price", () => {
    const lq = toLiveQuote("TCS", { regularMarketPrice: 3500, regularMarketChange: 10, regularMarketChangePercent: 0.29, regularMarketTime: new Date("2026-10-14T05:00:00Z"), marketState: "REGULAR" });
    expect(lq).toMatchObject({ ticker: "TCS", price: 3500, changePct: 0.29, time: "2026-10-14T05:00:00.000Z", delayed: true });
    expect(toLiveQuote("TCS", { regularMarketPrice: NaN })).toBeNull();
    expect(toLiveQuote("TCS", undefined)).toBeNull();
  });

  it("sends only quotes whose price or timestamp changed", () => {
    const prev = { TCS: q("TCS", 100), INFY: q("INFY", 50) };
    const out = changedQuotes(prev, { TCS: q("TCS", 100), INFY: q("INFY", 51), SBIN: q("SBIN", 7), X: null });
    expect(out.map((x) => x.ticker).sort()).toEqual(["INFY", "SBIN"]);
    expect(changedQuotes(prev, { TCS: q("TCS", 100, "2026-10-14T05:00:10.000Z") })).toHaveLength(1);
  });

  it("frames SSE events on a single data line (no field injection)", () => {
    const s = sseEvent("quote", { note: "a\nevent: evil" });
    expect(s.split("\n").filter((l) => l.startsWith("data:"))).toHaveLength(1);
    expect(s.startsWith("event: quote\n")).toBe(true);
    expect(s.endsWith("\n\n")).toBe(true);
  });

  it("relates today's move to the model's expected daily move", () => {
    expect(moveVsForecast(3, 0.01)).toEqual({ ratio: 3, unusual: true });
    expect(moveVsForecast(-1, 0.02)!.unusual).toBe(false);
    expect(moveVsForecast(null, 0.02)).toBeNull();
    expect(moveVsForecast(1, 0)).toBeNull();
  });
});

describe("GET /api/stream/quotes", () => {
  beforeEach(() => {
    setRateLimitBackend(new MemoryBackend());
    m.auth.mockResolvedValue({ user: { id: "u1" } });
    m.fetchLiveQuotes.mockResolvedValue({ TCS: q("TCS", 3500) });
  });

  const call = (qs: string, signal?: AbortSignal) => GET(new Request(`https://x.test/api/stream/quotes?${qs}`, { signal }));

  it("requires a session", async () => {
    m.auth.mockResolvedValue(null);
    expect((await call("tickers=TCS")).status).toBe(401);
  });

  it.each(["tickers=", "tickers=../x", `tickers=${Array.from({ length: 21 }, (_, i) => `T${i}`).join(",")}`, "tickers=TCS,bad%20sym"])(
    "rejects invalid ticker lists (%s)",
    async (qs) => expect((await call(qs)).status).toBe(400),
  );

  it("streams a quote event with SSE headers", async () => {
    const ctrl = new AbortController();
    const res = await call("tickers=tcs", ctrl.signal);
    expect(res.headers.get("content-type")).toMatch(/text\/event-stream/);
    const reader = res.body!.getReader();
    let text = "";
    while (!text.includes("event: quote")) text += new TextDecoder().decode((await reader.read()).value);
    expect(text).toContain("retry: 3000");
    expect(text).toContain('"ticker":"TCS"');
    expect(text).toContain('"delayed":true');
    ctrl.abort();
    await reader.cancel();
  });
});
