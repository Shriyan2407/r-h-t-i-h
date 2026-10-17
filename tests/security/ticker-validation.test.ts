import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { parseTicker } from "@/lib/validation/ticker";

describe("parseTicker", () => {
  it.each([
    ["RELIANCE", "RELIANCE"],
    ["  tcs ", "TCS"],
    ["infy.ns", "INFY"],
    ["HDFCBANK.BO", "HDFCBANK"],
    ["M&M", "M&M"],
    ["bajaj-auto", "BAJAJ-AUTO"],
    ["20MICRONS", "20MICRONS"],
  ])("accepts %s -> %s", (input, expected) => {
    expect(parseTicker(input)).toBe(expected);
  });

  it.each([
    "",
    " ",
    "A".repeat(21),
    "../../etc/passwd",
    "RELIANCE;DROP TABLE users",
    "<script>",
    "TCS\nINFY",
    "TC S",
    "TCS%00",
    "^NSEI",
    "'; --",
  ])("rejects %j", (input) => {
    expect(parseTicker(input)).toBeNull();
  });

  it("rejects non-strings", () => {
    expect(parseTicker(undefined)).toBeNull();
    expect(parseTicker(null)).toBeNull();
    expect(parseTicker(42 as unknown as string)).toBeNull();
  });
});

describe("[ticker] routes reject malformed symbols before doing any work", () => {
  const ctx = (ticker: string) => ({ params: Promise.resolve({ ticker }) });
  const req = (path: string) => new NextRequest(`https://example.test${path}`);

  it("news", async () => {
    const { GET } = await import("@/app/api/news/[ticker]/route");
    const res = await GET(req("/api/news/x"), ctx("bad ticker!"));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("INVALID_TICKER");
  });

  it("technicals", async () => {
    const { GET } = await import("@/app/api/technicals/[ticker]/route");
    expect((await GET(req("/api/technicals/x"), ctx("../../etc"))).status).toBe(400);
  });

  it("quote", async () => {
    const { GET } = await import("@/app/api/stocks/[ticker]/quote/route");
    expect((await GET(req("/api/stocks/x/quote"), ctx("<script>"))).status).toBe(400);
  });
});
