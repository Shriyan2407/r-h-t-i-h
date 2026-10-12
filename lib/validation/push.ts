import { z } from "zod";

/**
 * Web Push endpoints are URLs the SERVER will POST to. Accepting arbitrary URLs lets a
 * user turn the alert pipeline into a request cannon aimed at any host (including
 * internal ones). Real browser push services live on a small, well-known set of
 * hosts, so only those are accepted.
 */
const ALLOWED_HOST_SUFFIXES = [
  "fcm.googleapis.com", // Chrome, Edge, Brave, Opera (FCM)
  "android.googleapis.com", // legacy GCM
  "push.services.mozilla.com", // Firefox (also updates.push.services.mozilla.com)
  "push.apple.com", // Safari / iOS (web.push.apple.com)
  "notify.windows.com", // legacy Edge / WNS
] as const;

export function isAllowedPushEndpoint(raw: string): boolean {
  if (raw.length > 2048) return false;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== "443") return false;

  const host = url.hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

const base64url = z
  .string()
  .min(8)
  .max(256)
  .regex(/^[A-Za-z0-9_\-+/=]+$/, "Invalid key encoding");

export const pushSubscriptionSchema = z.object({
  endpoint: z
    .string()
    .url()
    .refine(isAllowedPushEndpoint, "Unsupported push service"),
  keys: z.object({
    auth: base64url,
    p256dh: base64url,
  }),
  userAgent: z.string().max(300).optional(),
});

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
});
