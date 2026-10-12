import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { isAllowedPushEndpoint, pushSubscriptionSchema } from "@/lib/validation/push";

describe("isAllowedPushEndpoint", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/abc123",
    "https://updates.push.services.mozilla.com/wpush/v2/xyz",
    "https://web.push.apple.com/QabC",
    "https://wns2-par02p.notify.windows.com/w/?token=abc",
    "https://android.googleapis.com/gcm/send/abc",
  ])("accepts real push service %s", (url) => {
    expect(isAllowedPushEndpoint(url)).toBe(true);
  });

  it.each([
    "http://fcm.googleapis.com/fcm/send/abc", // not https
    "https://localhost/hook",
    "https://127.0.0.1/hook",
    "https://169.254.169.254/latest/meta-data/", // cloud metadata
    "https://10.0.0.5/internal",
    "https://attacker.example/collect",
    "https://fcm.googleapis.com.attacker.example/x", // suffix trick
    "https://evilfcm.googleapis.com.evil.test/x",
    "https://user:pass@fcm.googleapis.com/x", // credentials
    "https://fcm.googleapis.com:8443/x", // non-standard port
    "javascript:alert(1)",
    "file:///etc/passwd",
    "not a url",
    "",
    "https://fcm.googleapis.com/" + "a".repeat(2100),
  ])("rejects %s", (url) => {
    expect(isAllowedPushEndpoint(url)).toBe(false);
  });

  it("does not accept a host that merely ends with the allowed name", () => {
    expect(isAllowedPushEndpoint("https://notfcm.googleapis.com.evil/")).toBe(false);
    // "xfcm.googleapis.com" is a different host, not a subdomain of fcm.googleapis.com.
    expect(isAllowedPushEndpoint("https://xfcm.googleapis.com/")).toBe(false);
    expect(isAllowedPushEndpoint("https://x.fcm.googleapis.com/")).toBe(true);
  });
});

describe("pushSubscriptionSchema", () => {
  const ok = {
    endpoint: "https://fcm.googleapis.com/fcm/send/abc",
    keys: { auth: "dGVzdC1hdXRo", p256dh: "dGVzdC1wMjU2ZGgtdmFsdWU" },
  };
  it("accepts a well-formed subscription", () => {
    expect(pushSubscriptionSchema.safeParse(ok).success).toBe(true);
  });
  it("rejects bad endpoints, bad keys and oversized user agents", () => {
    expect(pushSubscriptionSchema.safeParse({ ...ok, endpoint: "https://evil.test/x" }).success).toBe(false);
    expect(pushSubscriptionSchema.safeParse({ ...ok, keys: { ...ok.keys, auth: "<script>" } }).success).toBe(false);
    expect(pushSubscriptionSchema.safeParse({ ...ok, keys: { auth: "x" } }).success).toBe(false);
    expect(pushSubscriptionSchema.safeParse({ ...ok, userAgent: "u".repeat(301) }).success).toBe(false);
  });
});

/* ───────────── route behaviour ───────────── */

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    pushSubscription: { count: vi.fn(), findFirst: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
  },
}));
vi.mock("@/lib/auth/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/auth/prisma", () => ({ prisma: m.prisma }));

import { POST as subscribe } from "@/app/api/push/subscribe/route";

const post = (body: unknown) =>
  subscribe(
    new NextRequest("https://example.test/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

describe("POST /api/push/subscribe", () => {
  const valid = {
    endpoint: "https://fcm.googleapis.com/fcm/send/abc",
    keys: { auth: "dGVzdC1hdXRo", p256dh: "dGVzdC1wMjU2ZGgtdmFsdWU" },
  };
  beforeEach(() => {
    vi.clearAllMocks();
    m.auth.mockResolvedValue({ user: { id: "u1" } });
    m.prisma.pushSubscription.count.mockResolvedValue(0);
    m.prisma.pushSubscription.findFirst.mockResolvedValue(null);
    m.prisma.pushSubscription.upsert.mockResolvedValue({});
  });

  it("requires a session", async () => {
    m.auth.mockResolvedValue(null);
    expect((await post(valid)).status).toBe(401);
  });

  it("refuses endpoints on arbitrary hosts and never touches the database", async () => {
    const res = await post({ ...valid, endpoint: "https://169.254.169.254/latest/meta-data/" });
    expect(res.status).toBe(400);
    expect(m.prisma.pushSubscription.upsert).not.toHaveBeenCalled();
  });

  it("stores a valid subscription for the signed-in user only", async () => {
    expect((await post(valid)).status).toBe(200);
    expect(m.prisma.pushSubscription.upsert.mock.calls[0][0].create.userId).toBe("u1");
  });

  it("caps the number of devices per user", async () => {
    m.prisma.pushSubscription.count.mockResolvedValue(20);
    expect((await post(valid)).status).toBe(409);
    expect(m.prisma.pushSubscription.upsert).not.toHaveBeenCalled();
  });

  it("still allows re-registering an endpoint the user already has when at the cap", async () => {
    m.prisma.pushSubscription.count.mockResolvedValue(20);
    m.prisma.pushSubscription.findFirst.mockResolvedValue({ id: "s1" });
    expect((await post(valid)).status).toBe(200);
  });
});
