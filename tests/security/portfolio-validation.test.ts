import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  holdingCreateSchema,
  holdingUpdateSchema,
  holdingIdSchema,
  paginationSchema,
} from "@/lib/validation/portfolio";

const valid = { ticker: "tcs", name: "TCS", quantity: 10, avgPrice: 3500.5 };

describe("holdingCreateSchema", () => {
  it("normalises and applies defaults", () => {
    const out = holdingCreateSchema.parse(valid);
    expect(out).toMatchObject({ ticker: "TCS", exchange: "NSE", quantity: 10 });
  });

  it("strips unknown keys so they can never reach the database (mass-assignment)", () => {
    const out = holdingCreateSchema.parse({ ...valid, id: "x", addedAt: "2020", portfolioId: "other-users", userId: "evil" });
    expect(Object.keys(out).sort()).toEqual(["avgPrice", "exchange", "name", "quantity", "ticker"]);
  });

  it.each([
    ["negative quantity", { quantity: -1 }],
    ["zero quantity", { quantity: 0 }],
    ["NaN", { quantity: Number.NaN }],
    ["Infinity", { avgPrice: Number.POSITIVE_INFINITY }],
    ["string number", { quantity: "10" }],
    ["huge quantity", { quantity: 1e12 }],
    ["huge price", { avgPrice: 1e9 }],
    ["bad ticker", { ticker: "../../x" }],
    ["unknown exchange", { exchange: "NYSE" }],
    ["empty name", { name: "  " }],
    ["long notes", { notes: "n".repeat(501) }],
  ])("rejects %s", (_label, patch) => {
    expect(holdingCreateSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
});

describe("holdingUpdateSchema", () => {
  it("accepts partial updates and null notes", () => {
    expect(holdingUpdateSchema.safeParse({ quantity: 5 }).success).toBe(true);
    expect(holdingUpdateSchema.safeParse({ notes: null }).success).toBe(true);
  });
  it("requires at least one field and validates values", () => {
    expect(holdingUpdateSchema.safeParse({}).success).toBe(false);
    expect(holdingUpdateSchema.safeParse({ quantity: -3 }).success).toBe(false);
  });
  it("cannot touch other columns", () => {
    const out = holdingUpdateSchema.parse({ quantity: 1, portfolioId: "x", ticker: "INFY" });
    expect(out).toEqual({ quantity: 1 });
  });
});

describe("holdingIdSchema", () => {
  it("accepts cuid/uuid shapes and rejects anything else", () => {
    expect(holdingIdSchema.safeParse("cmabc123xyz").success).toBe(true);
    expect(holdingIdSchema.safeParse("123e4567-e89b-12d3-a456-426614174000").success).toBe(true);
    for (const bad of ["", "a b", "../x", "x".repeat(65), "id;drop"]) {
      expect(holdingIdSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("paginationSchema", () => {
  it("applies defaults and coerces strings", () => {
    expect(paginationSchema.parse({})).toEqual({ limit: 50, offset: 0 });
    expect(paginationSchema.parse({ limit: "10", offset: "20" })).toEqual({ limit: 10, offset: 20 });
  });
  it("rejects NaN, negatives and out-of-range values instead of passing NaN to the database", () => {
    for (const bad of [{ limit: "abc" }, { limit: "0" }, { limit: "101" }, { offset: "-1" }, { offset: "1e9" }, { limit: "1.5" }]) {
      expect(paginationSchema.safeParse(bad).success).toBe(false);
    }
  });
});

/* ───────────── route behaviour ───────────── */

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    portfolio: { findUnique: vi.fn(), create: vi.fn() },
    portfolioHolding: { findUnique: vi.fn(), count: vi.fn(), upsert: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));
vi.mock("@/lib/auth/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/auth/prisma", () => ({ prisma: m.prisma }));

import { POST } from "@/app/api/user/portfolio/route";
import { PUT, DELETE } from "@/app/api/user/portfolio/[id]/route";

const post = (body: unknown) =>
  POST(new Request("https://example.test/api/user/portfolio", { method: "POST", body: JSON.stringify(body) }));
const put = (id: string, body: unknown) =>
  PUT(new Request("https://example.test/x", { method: "PUT", body: JSON.stringify(body) }), { params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  m.auth.mockResolvedValue({ user: { id: "u1" } });
  m.prisma.portfolio.findUnique.mockResolvedValue({ id: "p1", userId: "u1" });
  m.prisma.portfolioHolding.findUnique.mockResolvedValue(null);
  m.prisma.portfolioHolding.count.mockResolvedValue(0);
  m.prisma.portfolioHolding.upsert.mockResolvedValue({ id: "h1" });
});

describe("POST /api/user/portfolio", () => {
  it("rejects invalid input with 400 and writes nothing", async () => {
    const res = await post({ ...valid, quantity: -5 });
    expect(res.status).toBe(400);
    expect(m.prisma.portfolioHolding.upsert).not.toHaveBeenCalled();
  });

  it("writes only validated fields, scoped to the caller's portfolio", async () => {
    const res = await post({ ...valid, portfolioId: "someone-elses", id: "x" });
    expect(res.status).toBe(200);
    const arg = m.prisma.portfolioHolding.upsert.mock.calls[0][0];
    expect(arg.create.portfolioId).toBe("p1");
    expect(arg.where.portfolioId_ticker).toEqual({ portfolioId: "p1", ticker: "TCS" });
  });

  it("enforces the per-portfolio position cap for new tickers only", async () => {
    m.prisma.portfolioHolding.count.mockResolvedValue(500);
    expect((await post(valid)).status).toBe(409);
    m.prisma.portfolioHolding.findUnique.mockResolvedValue({ id: "existing" });
    expect((await post(valid)).status).toBe(200);
  });
});

describe("PUT /api/user/portfolio/[id]", () => {
  it("404s for another user's holding (no IDOR)", async () => {
    m.prisma.portfolioHolding.findUnique.mockResolvedValue({ id: "h", portfolio: { userId: "someone-else" } });
    expect((await put("h", { quantity: 1 })).status).toBe(404);
    expect(m.prisma.portfolioHolding.update).not.toHaveBeenCalled();
  });

  it("updates only validated fields on the caller's own holding", async () => {
    m.prisma.portfolioHolding.findUnique.mockResolvedValue({ id: "h", portfolio: { userId: "u1" } });
    expect((await put("h", { quantity: 3, ticker: "HACK", portfolioId: "x" })).status).toBe(200);
    expect(m.prisma.portfolioHolding.update).toHaveBeenCalledWith({ where: { id: "h" }, data: { quantity: 3 } });
  });

  it("rejects malformed ids without querying the database", async () => {
    expect((await put("../../etc", { quantity: 1 })).status).toBe(404);
    expect(m.prisma.portfolioHolding.findUnique).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/user/portfolio/[id]", () => {
  it("404s for another user's holding", async () => {
    m.prisma.portfolioHolding.findUnique.mockResolvedValue({ id: "h", portfolio: { userId: "someone-else" } });
    const res = await DELETE(new Request("https://example.test/x", { method: "DELETE" }), { params: Promise.resolve({ id: "h" }) });
    expect(res.status).toBe(404);
    expect(m.prisma.portfolioHolding.delete).not.toHaveBeenCalled();
  });
});

describe("alert history pagination", () => {
  it("returns 400 for a non-numeric limit instead of crashing the query", async () => {
    vi.doMock("@/lib/auth/auth", () => ({ auth: m.auth }));
    const { GET } = await import("@/app/api/alerts/history/route");
    const res = await GET(new NextRequest("https://example.test/api/alerts/history?limit=abc"));
    expect(res.status).toBe(400);
  });
});
