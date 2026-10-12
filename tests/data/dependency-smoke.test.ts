import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import sharp from "sharp";
import * as XLSX from "xlsx";

const m = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: m.auth }));

/**
 * Smoke tests that exercise the REAL native/third-party libraries after security upgrades
 * (sharp 0.34 -> 0.35, SheetJS 0.18 -> 0.20.3 from cdn.sheetjs.com). They guard against an
 * upgrade that installs cleanly but breaks the feature that depends on it.
 */

describe("SheetJS (xlsx 0.20.x) portfolio import", () => {
  const workbookFile = (rows: unknown[][], name = "holdings.xlsx") => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Holdings");
    const bytes = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    return new File([bytes], name, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  };

  it("parses a broker-style holdings sheet", async () => {
    const { parseXLSX } = await import("@/lib/csvXlsxParser");
    const file = workbookFile([
      ["Instrument", "Qty.", "Avg. cost", "LTP"],
      ["TCS", 10, 3500.5, 4000],
      ["INFY", 25, 1500, 1600],
    ]);
    const result = await parseXLSX(file);
    expect(result.holdings.length).toBe(2);
    const tcs = result.holdings.find((h) => h.ticker === "TCS");
    expect(tcs).toMatchObject({ quantity: 10, avg_price: 3500.5, current_price: 4000 });
    expect(result.holdings.find((h) => h.ticker === "INFY")).toMatchObject({ quantity: 25 });
  });

  it("returns no holdings (and does not throw) for a sheet without recognisable columns", async () => {
    const { parseXLSX } = await import("@/lib/csvXlsxParser");
    const result = await parseXLSX(workbookFile([["foo", "bar"], [1, 2]]));
    expect(result.holdings).toEqual([]);
  });

  it("is not vulnerable to the known prototype-pollution vector via crafted headers", async () => {
    const { parseXLSX } = await import("@/lib/csvXlsxParser");
    await parseXLSX(workbookFile([["__proto__", "constructor", "prototype"], ["polluted", "polluted", "polluted"]]));
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe("sharp 0.35.x image preprocessing route", () => {
  beforeEach(async () => {
    m.auth.mockResolvedValue({ user: { id: "u1" } });
    const { MemoryBackend, setRateLimitBackend } = await import("@/lib/ratelimit/limiter");
    setRateLimitBackend(new MemoryBackend());
  });

  const png = (r: number, g: number, b: number, w = 120, h = 60) =>
    sharp({ create: { width: w, height: h, channels: 3, background: { r, g, b } } }).png().toBuffer();

  const upload = async (buf: Buffer, type = "image/png") => {
    const { POST } = await import("@/app/api/portfolio/scan/route");
    const fd = new FormData();
    fd.append("file", new File([new Uint8Array(buf)], "shot.png", { type }));
    return POST(new NextRequest("https://example.test/api/portfolio/scan", { method: "POST", body: fd }));
  };

  it("preprocesses a real light-theme screenshot into a PNG", async () => {
    const res = await upload(await png(240, 240, 240));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.mimeType).toBe("image/png");
    expect(body.wasDark).toBe(false);
    const out = Buffer.from(body.image, "base64");
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("png");
    expect(meta.width).toBeGreaterThan(0);
  });

  it("detects and inverts a dark-theme screenshot", async () => {
    const res = await upload(await png(10, 10, 10));
    expect((await res.json()).wasDark).toBe(true);
  });

  it("returns a controlled 500 (not a crash) for bytes that claim to be an image but are not", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await upload(Buffer.from("this is definitely not a png"), "image/png");
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Preprocessing failed");
  });
});
