import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  getUserAuthState: vi.fn(),
  prisma: {
    alertPreference: { updateMany: vi.fn() },
    telegramConnection: { findMany: vi.fn() },
    alertHistory: { findMany: vi.fn(), groupBy: vi.fn() },
  },
  engine: { processMarketAlerts: vi.fn(), generateAndSendDailyBriefing: vi.fn() },
}));

vi.mock("@/lib/auth/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/auth/authState", () => ({ getUserAuthState: m.getUserAuthState }));
vi.mock("@/lib/auth/prisma", () => ({ prisma: m.prisma }));
vi.mock("@/lib/services/alertEngine", () => m.engine);

import { requireAdmin } from "@/lib/auth/admin";
import { GET, POST } from "@/app/api/admin/alerts/route";

const session = (over: Record<string, unknown> = {}) => ({
  user: { id: "u1", email: "ops@example.com", role: "USER", ...over },
});
const state = (over: Record<string, unknown> = {}) => ({
  role: "ADMIN",
  emailVerified: new Date(),
  sessionVersion: 0,
  subscriptionTier: "free",
  ...over,
});
const post = (body: unknown) =>
  new NextRequest("https://example.test/api/admin/alerts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  m.prisma.telegramConnection.findMany.mockResolvedValue([]);
  m.prisma.alertHistory.findMany.mockResolvedValue([]);
  m.prisma.alertHistory.groupBy.mockResolvedValue([]);
  m.prisma.alertPreference.updateMany.mockResolvedValue({ count: 2 });
  m.engine.processMarketAlerts.mockResolvedValue({ ok: 1 });
  m.engine.generateAndSendDailyBriefing.mockResolvedValue({ sent: 0 });
});

describe("requireAdmin", () => {
  it("denies when there is no session", async () => {
    m.auth.mockResolvedValue(null);
    expect(await requireAdmin()).toBeNull();
  });

  it("denies a regular user", async () => {
    m.auth.mockResolvedValue(session());
    m.getUserAuthState.mockResolvedValue(state({ role: "USER" }));
    expect(await requireAdmin()).toBeNull();
  });

  it("denies an ADMIN whose email is not verified", async () => {
    m.auth.mockResolvedValue(session());
    m.getUserAuthState.mockResolvedValue(state({ emailVerified: null }));
    expect(await requireAdmin()).toBeNull();
  });

  it("ignores any role claimed in the session/token and trusts only the database", async () => {
    m.auth.mockResolvedValue(session({ role: "ADMIN" })); // token says ADMIN...
    m.getUserAuthState.mockResolvedValue(state({ role: "USER" })); // ...database says USER
    expect(await requireAdmin()).toBeNull();
  });

  it("reads the role fresh (bypassing the cache) for privileged decisions", async () => {
    m.auth.mockResolvedValue(session());
    m.getUserAuthState.mockResolvedValue(state());
    await requireAdmin();
    expect(m.getUserAuthState).toHaveBeenCalledWith("u1", { fresh: true });
  });

  it("does NOT grant admin by email address (the old hardcoded address is just a user)", async () => {
    m.auth.mockResolvedValue(session({ email: "shriyanbohra24077@gmail.com" }));
    m.getUserAuthState.mockResolvedValue(state({ role: "USER" }));
    expect(await requireAdmin()).toBeNull();
  });

  it("allows a verified ADMIN", async () => {
    m.auth.mockResolvedValue(session());
    m.getUserAuthState.mockResolvedValue(state());
    expect(await requireAdmin()).toEqual({ id: "u1", email: "ops@example.com" });
  });
});

describe("/api/admin/alerts authorisation", () => {
  it("GET and POST return 403 for non-admins without touching the database", async () => {
    m.auth.mockResolvedValue(session());
    m.getUserAuthState.mockResolvedValue(state({ role: "USER" }));
    expect((await GET()).status).toBe(403);
    expect((await POST(post({ action: "trigger_price" }))).status).toBe(403);
    expect(m.prisma.telegramConnection.findMany).not.toHaveBeenCalled();
    expect(m.engine.processMarketAlerts).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/alerts validation (as admin)", () => {
  beforeEach(() => {
    m.auth.mockResolvedValue(session());
    m.getUserAuthState.mockResolvedValue(state());
  });

  it("runs known actions", async () => {
    expect((await POST(post({ action: "trigger_briefing" }))).status).toBe(200);
    expect(m.engine.generateAndSendDailyBriefing).toHaveBeenCalled();
    expect((await POST(post({ action: "trigger_price" }))).status).toBe(200);
    expect(m.engine.processMarketAlerts).toHaveBeenCalled();
  });

  it("applies only allow-listed boolean preferences", async () => {
    expect((await POST(post({ pref: "marketSummary", value: false }))).status).toBe(200);
    expect(m.prisma.alertPreference.updateMany).toHaveBeenCalledWith({ data: { marketSummary: false } });
  });

  it("rejects unknown fields, unknown prefs and non-boolean values", async () => {
    for (const bad of [
      { action: "drop_database" },
      { pref: "tier", value: true },
      { pref: "marketSummary", value: "yes" },
      { action: "trigger_price", extra: 1 },
      {},
    ]) {
      expect((await POST(post(bad))).status).toBe(400);
    }
    expect(m.prisma.alertPreference.updateMany).not.toHaveBeenCalled();
  });
});
