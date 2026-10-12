import { prisma } from "@/lib/auth/prisma";
import { isAllowedPushEndpoint } from "@/lib/validation/push";

// ── VAPID config ─────────────────────────────────────────────────────────────

export function getVapidPublicKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
}

// ── Send to a single subscription ────────────────────────────────────────────

export async function sendPushNotification(
  subscription: { endpoint: string; auth: string; p256dh: string },
  payload: { title: string; body: string; tag?: string; url?: string }
): Promise<boolean> {
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL ?? "mailto:admin@example.com";

  if (!vapidPublic || !vapidPrivate) return false;

  // Rows written before endpoint validation existed may point anywhere: refuse and purge them.
  if (!isAllowedPushEndpoint(subscription.endpoint)) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: subscription.endpoint } }).catch(() => {});
    return false;
  }

  try {
    const webpush = await import("web-push");
    webpush.default.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);

    await webpush.default.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { auth: subscription.auth, p256dh: subscription.p256dh },
      },
      JSON.stringify(payload)
    );
    return true;
  } catch (err: any) {
    // 410 = subscription expired/revoked, clean up
    if (err?.statusCode === 410) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: subscription.endpoint },
      }).catch(() => {});
    }
    return false;
  }
}

// ── Send to all subscriptions for a user ─────────────────────────────────────

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; tag?: string; url?: string }
): Promise<void> {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.allSettled(subs.map(s => sendPushNotification(s, payload)));
}

// ── Broadcast to all subscriptions ───────────────────────────────────────────

export async function broadcastPush(
  payload: { title: string; body: string; tag?: string; url?: string }
): Promise<void> {
  const subs = await prisma.pushSubscription.findMany();
  await Promise.allSettled(subs.map(s => sendPushNotification(s, payload)));
}
