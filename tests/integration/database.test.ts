import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { prisma } from "@/lib/auth/prisma";
import { findUserByEmail } from "@/lib/auth/users";
import {
  createEmailVerificationToken,
  consumeEmailVerificationToken,
  createPasswordResetToken,
  validatePasswordResetToken,
  hashToken,
} from "@/lib/auth/tokens";
import { getUserAuthState, invalidateUserAuthState } from "@/lib/auth/authState";

const enabled = Boolean(process.env.TEST_DATABASE_URL);
const run = describe.skipIf(!enabled);

let seq = 0;
const email = (tag: string) => `it-${tag}-${Date.now()}-${++seq}@example.test`;

async function newUser(tag: string, over: Record<string, unknown> = {}) {
  return prisma.user.create({ data: { email: email(tag), name: tag, hashedPassword: "x", ...over } });
}

afterEach(async () => {
  if (enabled) await prisma.user.deleteMany({ where: { email: { startsWith: "it-" } } });
  invalidateUserAuthState();
});
afterAll(async () => {
  if (enabled) await prisma.$disconnect();
});

run("schema defaults and constraints", () => {
  it("new users default to role USER, sessionVersion 0, tier free, unverified", async () => {
    const u = await newUser("defaults");
    expect(u).toMatchObject({ role: "USER", sessionVersion: 0, subscriptionTier: "free", emailVerified: null });
  });

  it("rejects an invalid role at the database level", async () => {
    await expect(newUser("badrole", { role: "SUPERUSER" })).rejects.toThrow();
  });

  it("enforces unique emails", async () => {
    const u = await newUser("dup");
    await expect(prisma.user.create({ data: { email: u.email } })).rejects.toThrow(/Unique constraint/);
  });

  it("enforces one position per ticker within a portfolio, but not across portfolios", async () => {
    const a = await newUser("pa");
    const b = await newUser("pb");
    const pa = await prisma.portfolio.create({ data: { userId: a.id } });
    const pb = await prisma.portfolio.create({ data: { userId: b.id } });
    const holding = (portfolioId: string) => ({ portfolioId, ticker: "TCS", name: "TCS", quantity: 1, avgPrice: 1 });

    await prisma.portfolioHolding.create({ data: holding(pa.id) });
    await expect(prisma.portfolioHolding.create({ data: holding(pa.id) })).rejects.toThrow(/Unique constraint/);
    await expect(prisma.portfolioHolding.create({ data: holding(pb.id) })).resolves.toBeTruthy();
  });

  it("limits each user to one portfolio, one telegram link and one alert-preference row", async () => {
    const u = await newUser("one");
    await prisma.portfolio.create({ data: { userId: u.id } });
    await expect(prisma.portfolio.create({ data: { userId: u.id } })).rejects.toThrow(/Unique constraint/);
    await prisma.alertPreference.create({ data: { userId: u.id } });
    await expect(prisma.alertPreference.create({ data: { userId: u.id } })).rejects.toThrow(/Unique constraint/);
  });
});

run("cascade deletes (account deletion leaves no orphaned personal data)", () => {
  it("removes every dependent row when a user is deleted", async () => {
    const u = await newUser("cascade");
    const p = await prisma.portfolio.create({ data: { userId: u.id } });
    await prisma.portfolioHolding.create({ data: { portfolioId: p.id, ticker: "INFY", name: "Infosys", quantity: 2, avgPrice: 10 } });
    await prisma.watchlistItem.create({ data: { userId: u.id, ticker: "TCS", name: "TCS" } });
    await prisma.alertPreference.create({ data: { userId: u.id } });
    await prisma.alertHistory.create({ data: { userId: u.id, type: "x", title: "t", message: "m", channel: "push" } });
    await prisma.pushSubscription.create({ data: { userId: u.id, endpoint: `https://fcm.googleapis.com/${u.id}`, auth: "a", p256dh: "p" } });
    await prisma.telegramConnection.create({ data: { userId: u.id } });
    await prisma.passwordResetToken.create({ data: { userId: u.id, tokenHash: hashToken(u.id), expires: new Date(Date.now() + 1000) } });

    await prisma.user.delete({ where: { id: u.id } });

    const where = { userId: u.id };
    expect(await prisma.portfolio.count({ where })).toBe(0);
    expect(await prisma.portfolioHolding.count({ where: { portfolioId: p.id } })).toBe(0);
    expect(await prisma.watchlistItem.count({ where })).toBe(0);
    expect(await prisma.alertPreference.count({ where })).toBe(0);
    expect(await prisma.alertHistory.count({ where })).toBe(0);
    expect(await prisma.pushSubscription.count({ where })).toBe(0);
    expect(await prisma.telegramConnection.count({ where })).toBe(0);
    expect(await prisma.passwordResetToken.count({ where })).toBe(0);
  });
});

run("findUserByEmail", () => {
  it("finds an account stored with mixed case (legacy rows) regardless of the query's case", async () => {
    const legacy = `It-Legacy-${Date.now()}@Example.Test`;
    const u = await prisma.user.create({ data: { email: legacy } });
    expect((await findUserByEmail(legacy.toLowerCase()))?.id).toBe(u.id);
    expect((await findUserByEmail(legacy.toUpperCase()))?.id).toBe(u.id);
  });

  it("returns null for an unknown address", async () => {
    expect(await findUserByEmail(`it-nobody-${Date.now()}@example.test`)).toBeNull();
  });
});

run("email verification tokens (real SQL)", () => {
  it("verifies the account exactly once even when two requests race", async () => {
    const u = await newUser("race");
    const token = await createEmailVerificationToken(u.email);

    const results = await Promise.all([
      consumeEmailVerificationToken(token),
      consumeEmailVerificationToken(token),
      consumeEmailVerificationToken(token),
    ]);

    expect(results.filter((r) => r === u.email)).toHaveLength(1);
    expect(results.filter((r) => r === null)).toHaveLength(2);
    expect((await prisma.user.findUnique({ where: { id: u.id } }))?.emailVerified).toBeInstanceOf(Date);
  });

  it("stores only the hash and cannot be replayed", async () => {
    const u = await newUser("replay");
    const token = await createEmailVerificationToken(u.email);
    const rows = await prisma.verificationToken.findMany({ where: { identifier: u.email } });
    expect(rows).toHaveLength(1);
    expect(rows[0].token).toBe(hashToken(token));
    expect(rows[0].token).not.toBe(token);

    expect(await consumeEmailVerificationToken(token)).toBe(u.email);
    expect(await consumeEmailVerificationToken(token)).toBeNull();
  });

  it("rejects an expired token and still removes it", async () => {
    const u = await newUser("expired");
    await prisma.verificationToken.create({
      data: { identifier: u.email, token: hashToken("old"), expires: new Date(Date.now() - 1000) },
    });
    expect(await consumeEmailVerificationToken("old")).toBeNull();
    expect(await prisma.verificationToken.count({ where: { identifier: u.email } })).toBe(0);
    expect((await prisma.user.findUnique({ where: { id: u.id } }))?.emailVerified).toBeNull();
  });

  it("a new token invalidates the previous one for the same address", async () => {
    const u = await newUser("replace");
    const first = await createEmailVerificationToken(u.email);
    const second = await createEmailVerificationToken(u.email);
    expect(await consumeEmailVerificationToken(first)).toBeNull();
    expect(await consumeEmailVerificationToken(second)).toBe(u.email);
  });
});

run("password reset tokens (real SQL)", () => {
  it("issues a hashed single-use token that expires and replaces earlier ones", async () => {
    const u = await newUser("reset");
    const first = await createPasswordResetToken(u.email);
    const second = await createPasswordResetToken(u.email);

    expect(await validatePasswordResetToken(first!.token)).toBeNull(); // replaced
    const valid = await validatePasswordResetToken(second!.token);
    expect(valid?.userId).toBe(u.id);

    const stored = await prisma.passwordResetToken.findMany({ where: { userId: u.id } });
    expect(stored).toHaveLength(1);
    expect(stored[0].tokenHash).toBe(hashToken(second!.token));
    expect(JSON.stringify(stored)).not.toContain(second!.token);
  });

  it("returns null for unknown accounts", async () => {
    expect(await createPasswordResetToken(`it-ghost-${Date.now()}@example.test`)).toBeNull();
  });
});

run("session revocation state", () => {
  it("reflects a bumped sessionVersion and role changes once the cache is invalidated", async () => {
    const u = await newUser("session");
    const before = await getUserAuthState(u.id);
    expect(before).toMatchObject({ sessionVersion: 0, role: "USER" });

    await prisma.user.update({ where: { id: u.id }, data: { sessionVersion: { increment: 1 }, role: "ADMIN" } });

    expect(await getUserAuthState(u.id)).toMatchObject({ sessionVersion: 0, role: "USER" }); // cached (30s)
    expect(await getUserAuthState(u.id, { fresh: true })).toMatchObject({ sessionVersion: 1, role: "ADMIN" });
  });

  it("returns null once the user is gone", async () => {
    const u = await newUser("gone");
    await prisma.user.delete({ where: { id: u.id } });
    expect(await getUserAuthState(u.id, { fresh: true })).toBeNull();
  });
});

beforeAll(() => {
  if (!enabled) console.info("[integration] TEST_DATABASE_URL not set - database integration tests skipped");
});
