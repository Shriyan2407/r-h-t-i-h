import { describe, it, expect, vi, beforeEach } from "vitest";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";

const m = vi.hoisted(() => ({ getUserAuthState: vi.fn() }));
vi.mock("@/lib/auth/authState", () => ({ getUserAuthState: m.getUserAuthState }));

import { jwtCallback, sessionCallback, signInCallback } from "@/lib/auth/callbacks";

const state = (over: Record<string, unknown> = {}) => ({
  sessionVersion: 3,
  role: "USER",
  subscriptionTier: "free",
  emailVerified: new Date(),
  ...over,
});
const token = (over: Partial<JWT> = {}): JWT => ({ id: "u1", sv: 3, role: "USER", subscriptionTier: "free", ...over });

beforeEach(() => vi.clearAllMocks());

describe("jwtCallback: sign-in", () => {
  it("takes id, version, role and tier from the database, not from the caller", async () => {
    m.getUserAuthState.mockResolvedValue(state({ role: "ADMIN", subscriptionTier: "pro" }));
    const out = await jwtCallback({ token: {} as JWT, user: { id: "u1" } });
    expect(out).toMatchObject({ id: "u1", sv: 3, role: "ADMIN", subscriptionTier: "pro" });
    expect(m.getUserAuthState).toHaveBeenCalledWith("u1", { fresh: true });
  });

  it("ends the session if the user no longer exists", async () => {
    m.getUserAuthState.mockResolvedValue(null);
    expect(await jwtCallback({ token: {} as JWT, user: { id: "gone" } })).toBeNull();
  });
});

describe("jwtCallback: later requests", () => {
  it("keeps a session whose version still matches", async () => {
    m.getUserAuthState.mockResolvedValue(state());
    expect(await jwtCallback({ token: token() })).not.toBeNull();
  });

  it("REVOKES the session after a password change (sessionVersion bumped)", async () => {
    m.getUserAuthState.mockResolvedValue(state({ sessionVersion: 4 }));
    expect(await jwtCallback({ token: token({ sv: 3 }) })).toBeNull();
  });

  it("ends the session when the account was deleted", async () => {
    m.getUserAuthState.mockResolvedValue(null);
    expect(await jwtCallback({ token: token() })).toBeNull();
  });

  it("rejects a token with no identity", async () => {
    expect(await jwtCallback({ token: {} as JWT })).toBeNull();
    expect(m.getUserAuthState).not.toHaveBeenCalled();
  });

  it("picks up role and tier changes made in the database", async () => {
    m.getUserAuthState.mockResolvedValue(state({ role: "ADMIN", subscriptionTier: "pro" }));
    const out = await jwtCallback({ token: token() });
    expect(out).toMatchObject({ role: "ADMIN", subscriptionTier: "pro" });
  });

  it("demotes immediately when the database role is reduced", async () => {
    m.getUserAuthState.mockResolvedValue(state({ role: "USER" }));
    const out = await jwtCallback({ token: token({ role: "ADMIN" }) });
    expect(out?.role).toBe("USER");
  });
});

describe("jwtCallback: client-controlled update()", () => {
  it("CANNOT escalate the subscription tier or role", async () => {
    m.getUserAuthState.mockResolvedValue(state());
    const out = await jwtCallback({
      token: token(),
      trigger: "update",
      session: { user: { name: "New Name", subscriptionTier: "pro", role: "ADMIN" } as never },
    });
    expect(out?.subscriptionTier).toBe("free");
    expect(out?.role).toBe("USER");
    expect(out?.name).toBe("New Name");
  });

  it("limits the display name length and ignores non-string names", async () => {
    m.getUserAuthState.mockResolvedValue(state());
    const long = await jwtCallback({ token: token(), trigger: "update", session: { user: { name: "x".repeat(200) } } });
    expect((long?.name as string).length).toBe(50);
    const bad = await jwtCallback({ token: token({ name: "Keep" }), trigger: "update", session: { user: { name: { evil: 1 } } } });
    expect(bad?.name).toBe("Keep");
  });
});

describe("sessionCallback", () => {
  it("exposes id, role and tier with safe defaults", () => {
    const s = sessionCallback({ session: { user: {} } as Session, token: token({ role: "ADMIN", subscriptionTier: "pro" }) });
    expect(s.user).toMatchObject({ id: "u1", role: "ADMIN", subscriptionTier: "pro" });
    const d = sessionCallback({ session: { user: {} } as Session, token: { id: "u2", sv: 0 } as JWT });
    expect(d.user).toMatchObject({ role: "USER", subscriptionTier: "free" });
  });
});

describe("signInCallback", () => {
  it("accepts only Google accounts with a verified email", () => {
    expect(signInCallback({ account: { provider: "google" }, profile: { email_verified: true } })).toBe(true);
    expect(signInCallback({ account: { provider: "google" }, profile: { email_verified: false } })).toBe(false);
    expect(signInCallback({ account: { provider: "google" }, profile: {} })).toBe(false);
    expect(signInCallback({ account: { provider: "google" }, profile: { email_verified: null } })).toBe(false);
  });
  it("does not interfere with credentials sign-in", () => {
    expect(signInCallback({ account: { provider: "credentials" } })).toBe(true);
  });
});
