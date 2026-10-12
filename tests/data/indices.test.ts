import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({ getMarketIndices: vi.fn() }));

// unstable_cache needs Next's runtime; in unit tests it is a pass-through.
vi.mock("next/cache", () => ({ unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn }));

import { toIndexRows, INDEX_DEFINITIONS } from "@/lib/services/indices";

describe("toIndexRows", () => {
  it("returns real quotes in the defined display order", () => {
    const rows = toIndexRows([
      { symbol: "^BSESN", regularMarketPrice: 81000.5, regularMarketChangePercent: -0.4 },
      { symbol: "^NSEI", regularMarketPrice: 24800.25, regularMarketChangePercent: 0.3 },
    ]);
    expect(rows.map((r) => r.label)).toEqual(["NIFTY 50", "SENSEX"]);
    expect(rows[0]).toMatchObject({ value: 24800.25, changePct: 0.3, kind: "index" });
  });

  it("OMITS indices Yahoo did not return instead of inventing a value", () => {
    const rows = toIndexRows([{ symbol: "^NSEI", regularMarketPrice: 24800 }]);
    expect(rows).toHaveLength(1);
    expect(rows.some((r) => r.symbol === "^CNXIT")).toBe(false);
  });

  it("skips quotes without a finite numeric price (no zeros, no NaN)", () => {
    const rows = toIndexRows([
      { symbol: "^NSEI" },
      { symbol: "^BSESN", regularMarketPrice: Number.NaN },
      { symbol: "^NSEBANK", regularMarketPrice: Number.POSITIVE_INFINITY },
      { symbol: "^CNXIT", regularMarketPrice: 38000 },
    ]);
    expect(rows.map((r) => r.symbol)).toEqual(["^CNXIT"]);
  });

  it("treats a missing change as 0 only when the price itself is real", () => {
    expect(toIndexRows([{ symbol: "^NSEI", regularMarketPrice: 1 }])[0].changePct).toBe(0);
  });

  it("ignores unknown symbols", () => {
    expect(toIndexRows([{ symbol: "AAPL", regularMarketPrice: 200 }])).toEqual([]);
  });

  it("formats rates (VIX, USD/INR) differently from indices", () => {
    const kinds = Object.fromEntries(INDEX_DEFINITIONS.map((d) => [d.label, d.kind]));
    expect(kinds["INDIA VIX"]).toBe("rate");
    expect(kinds["USD/INR"]).toBe("rate");
    expect(kinds["NIFTY 50"]).toBe("index");
  });
});

describe("GET /api/market/indices", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock("@/lib/services/indices", () => ({ getMarketIndices: m.getMarketIndices }));
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("returns the data with a short private cache header", async () => {
    m.getMarketIndices.mockResolvedValue({ asOf: "2026-01-01T00:00:00Z", indices: [], movers: { gainers: [], losers: [] } });
    const { GET } = await import("@/app/api/market/indices/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("private");
    expect((await res.json()).asOf).toBe("2026-01-01T00:00:00Z");
  });

  it("answers 503 with a code - never fabricated numbers - when data is unavailable", async () => {
    m.getMarketIndices.mockRejectedValue(new Error("no index data available"));
    const { GET } = await import("@/app/api/market/indices/route");
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe("MARKET_DATA_UNAVAILABLE");
    expect(body).not.toHaveProperty("indices");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
