import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), updateMany: vi.fn() },
  verificationToken: {
    deleteMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  passwordResetToken: { deleteMany: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
}));
vi.mock("@/lib/auth/prisma", () => ({ prisma: db }));

import {
  createEmailVerificationToken,
  consumeEmailVerificationToken,
  hashToken,
} from "@/lib/auth/tokens";

beforeEach(() => vi.clearAllMocks());

describe("createEmailVerificationToken", () => {
  it("replaces earlier tokens and stores only the hash with a 24h expiry", async () => {
    const raw = await createEmailVerificationToken("a@b.co");

    expect(db.verificationToken.deleteMany).toHaveBeenCalledWith({ where: { identifier: "a@b.co" } });
    const data = db.verificationToken.create.mock.calls[0][0].data;
    expect(data.identifier).toBe("a@b.co");
    expect(data.token).toBe(hashToken(raw));
    expect(JSON.stringify(data)).not.toContain(raw);
    const hours = (data.expires.getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(23.9);
    expect(hours).toBeLessThanOrEqual(24);
  });
});

describe("consumeEmailVerificationToken", () => {
  it("returns null for an unknown token", async () => {
    db.verificationToken.findUnique.mockResolvedValue(null);
    expect(await consumeEmailVerificationToken("nope")).toBeNull();
    expect(db.user.updateMany).not.toHaveBeenCalled();
  });

  it("verifies the account and consumes the token exactly once", async () => {
    db.verificationToken.findUnique.mockResolvedValue({
      identifier: "a@b.co",
      token: hashToken("raw"),
      expires: new Date(Date.now() + 60_000),
    });
    db.verificationToken.deleteMany.mockResolvedValue({ count: 1 });

    expect(await consumeEmailVerificationToken("raw")).toBe("a@b.co");
    expect(db.user.updateMany).toHaveBeenCalledWith({
      where: { email: "a@b.co", emailVerified: null },
      data: { emailVerified: expect.any(Date) },
    });
  });

  it("loses the race when another request already consumed the token", async () => {
    db.verificationToken.findUnique.mockResolvedValue({
      identifier: "a@b.co",
      token: "h",
      expires: new Date(Date.now() + 60_000),
    });
    db.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
    expect(await consumeEmailVerificationToken("raw")).toBeNull();
    expect(db.user.updateMany).not.toHaveBeenCalled();
  });

  it("rejects expired tokens (and still deletes them)", async () => {
    db.verificationToken.findUnique.mockResolvedValue({
      identifier: "a@b.co",
      token: "h",
      expires: new Date(Date.now() - 1000),
    });
    db.verificationToken.deleteMany.mockResolvedValue({ count: 1 });
    expect(await consumeEmailVerificationToken("raw")).toBeNull();
    expect(db.verificationToken.deleteMany).toHaveBeenCalled();
    expect(db.user.updateMany).not.toHaveBeenCalled();
  });
});
