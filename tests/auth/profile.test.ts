import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    userPreferences: { upsert: vi.fn() },
  },
  verifyPassword: vi.fn(),
  hashPassword: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/auth/prisma", () => ({ prisma: m.prisma }));
vi.mock("@/lib/auth/password", () => ({ verifyPassword: m.verifyPassword, hashPassword: m.hashPassword }));
vi.mock("@/lib/auth/authState", () => ({ invalidateUserAuthState: m.invalidate }));

import { GET, PATCH, DELETE } from "@/app/api/user/profile/route";
import { MemoryBackend, setRateLimitBackend } from "@/lib/ratelimit/limiter";

const req = (method: string, body?: unknown) =>
  new NextRequest("https://example.test/api/user/profile", {
    method,
    headers: { "content-type": "application/json", "x-forwarded-for": "192.0.2.10" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const passwordUser = { id: "u1", email: "Asha@Example.com", hashedPassword: "HASH" };
const oauthUser = { id: "u1", email: "asha@example.com", hashedPassword: null };

beforeEach(() => {
  vi.clearAllMocks();
  setRateLimitBackend(new MemoryBackend());
  m.auth.mockResolvedValue({ user: { id: "u1" } });
  m.hashPassword.mockResolvedValue("NEWHASH");
  m.prisma.user.update.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/user/profile", () => {
  it("never returns the password hash, only whether one exists", async () => {
    m.prisma.user.findUnique.mockResolvedValue({
      id: "u1", name: "A", email: "a@b.co", hashedPassword: "SECRET_HASH", role: "USER", emailVerified: new Date(),
    });
    const body = await (await GET()).json();
    expect(body.hasPassword).toBe(true);
    expect(JSON.stringify(body)).not.toContain("SECRET_HASH");
    expect(body).not.toHaveProperty("hashedPassword");
  });

  it("requires a session", async () => {
    m.auth.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });
});

describe("PATCH /api/user/profile - password change", () => {
  const change = { currentPassword: "old-password", newPassword: "new-password-1" };

  it("requires the current password", async () => {
    expect((await PATCH(req("PATCH", { newPassword: "new-password-1" }))).status).toBe(400);
  });

  it("rejects a wrong current password and changes nothing", async () => {
    m.prisma.user.findUnique.mockResolvedValue(passwordUser);
    m.verifyPassword.mockResolvedValue(false);
    expect((await PATCH(req("PATCH", change))).status).toBe(400);
    expect(m.prisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects reusing the same password", async () => {
    m.prisma.user.findUnique.mockResolvedValue(passwordUser);
    m.verifyPassword.mockResolvedValue(true);
    const res = await PATCH(req("PATCH", { currentPassword: "same-password", newPassword: "same-password" }));
    expect(res.status).toBe(400);
  });

  it("refuses OAuth-only accounts", async () => {
    m.prisma.user.findUnique.mockResolvedValue(oauthUser);
    expect((await PATCH(req("PATCH", change))).status).toBe(400);
  });

  it("REVOKES every session by bumping sessionVersion and tells the client it is signed out", async () => {
    m.prisma.user.findUnique.mockResolvedValue(passwordUser);
    m.verifyPassword.mockResolvedValue(true);
    const res = await PATCH(req("PATCH", change));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.signedOut).toBe(true);
    const data = m.prisma.user.update.mock.calls[0][0].data;
    expect(data.hashedPassword).toBe("NEWHASH");
    expect(data.sessionVersion).toEqual({ increment: 1 });
    expect(m.invalidate).toHaveBeenCalledWith("u1");
  });

  it("limits password guessing through this endpoint", async () => {
    m.prisma.user.findUnique.mockResolvedValue(passwordUser);
    m.verifyPassword.mockResolvedValue(false);
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) statuses.push((await PATCH(req("PATCH", change))).status);
    expect(statuses.slice(0, 10).every((s) => s === 400)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it("does not sign the user out for a plain name change", async () => {
    const res = await PATCH(req("PATCH", { name: "New Name" }));
    expect((await res.json()).signedOut).toBe(false);
  });
});

describe("DELETE /api/user/profile - re-authentication", () => {
  it("requires a session", async () => {
    m.auth.mockResolvedValue(null);
    expect((await DELETE(req("DELETE", {}))).status).toBe(401);
  });

  it("refuses a bare session cookie from a password account", async () => {
    m.prisma.user.findUnique.mockResolvedValue(passwordUser);
    expect((await DELETE(req("DELETE", {}))).status).toBe(403);
    expect(m.prisma.user.delete).not.toHaveBeenCalled();
  });

  it("refuses a wrong password", async () => {
    m.prisma.user.findUnique.mockResolvedValue(passwordUser);
    m.verifyPassword.mockResolvedValue(false);
    expect((await DELETE(req("DELETE", { password: "nope" }))).status).toBe(403);
    expect(m.prisma.user.delete).not.toHaveBeenCalled();
  });

  it("deletes after the correct password", async () => {
    m.prisma.user.findUnique.mockResolvedValue(passwordUser);
    m.verifyPassword.mockResolvedValue(true);
    expect((await DELETE(req("DELETE", { password: "right" }))).status).toBe(200);
    expect(m.prisma.user.delete).toHaveBeenCalledWith({ where: { id: "u1" } });
  });

  it("OAuth-only accounts must type their email (case-insensitive)", async () => {
    m.prisma.user.findUnique.mockResolvedValue(oauthUser);
    expect((await DELETE(req("DELETE", {}))).status).toBe(403);
    expect((await DELETE(req("DELETE", { confirmEmail: "other@example.com" }))).status).toBe(403);
    expect(m.prisma.user.delete).not.toHaveBeenCalled();
    expect((await DELETE(req("DELETE", { confirmEmail: "ASHA@example.com" }))).status).toBe(200);
    expect(m.prisma.user.delete).toHaveBeenCalledTimes(1);
  });
});
