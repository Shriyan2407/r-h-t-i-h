import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findFirst: vi.fn() },
  passwordResetToken: {
    deleteMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
  },
}));
vi.mock("@/lib/auth/prisma", () => ({ prisma: db }));

import {
  createPasswordResetToken,
  validatePasswordResetToken,
  hashToken,
  generateSecureToken,
} from "@/lib/auth/tokens";

beforeEach(() => vi.clearAllMocks());

describe("hashToken", () => {
  it("is deterministic, hex, 64 chars and never equals the input", () => {
    const t = generateSecureToken();
    expect(t).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken(t)).not.toBe(t);
  });
});

describe("createPasswordResetToken", () => {
  it("returns null for an unknown email and writes nothing", async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.user.findFirst.mockResolvedValue(null);
    expect(await createPasswordResetToken("nobody@example.com")).toBeNull();
    expect(db.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it("stores only the hash, never the raw token", async () => {
    db.user.findUnique.mockResolvedValue({ id: "u1", email: "a@b.co", name: "A" });
    const issued = await createPasswordResetToken("a@b.co");

    expect(issued).not.toBeNull();
    const data = db.passwordResetToken.create.mock.calls[0][0].data;
    expect(data.tokenHash).toBe(hashToken(issued!.token));
    expect(JSON.stringify(data)).not.toContain(issued!.token);
    expect(data.expires.getTime()).toBeGreaterThan(Date.now());
    expect(db.passwordResetToken.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } });
  });
});

describe("validatePasswordResetToken", () => {
  it("looks tokens up by hash", async () => {
    db.passwordResetToken.findUnique.mockResolvedValue(null);
    await validatePasswordResetToken("rawtoken");
    expect(db.passwordResetToken.findUnique.mock.calls[0][0].where).toEqual({
      tokenHash: hashToken("rawtoken"),
    });
  });

  it("rejects unknown, used and expired tokens", async () => {
    db.passwordResetToken.findUnique.mockResolvedValueOnce(null);
    expect(await validatePasswordResetToken("x")).toBeNull();

    db.passwordResetToken.findUnique.mockResolvedValueOnce({ used: true, expires: new Date(Date.now() + 1000) });
    expect(await validatePasswordResetToken("x")).toBeNull();

    db.passwordResetToken.findUnique.mockResolvedValueOnce({ used: false, expires: new Date(Date.now() - 1000) });
    expect(await validatePasswordResetToken("x")).toBeNull();
  });

  it("accepts a fresh, unused token", async () => {
    const record = { used: false, expires: new Date(Date.now() + 60_000), userId: "u1" };
    db.passwordResetToken.findUnique.mockResolvedValue(record);
    expect(await validatePasswordResetToken("x")).toBe(record);
  });
});
