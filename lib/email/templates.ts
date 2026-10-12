import { escapeHtml as esc } from "@/lib/security/html";
import type { EmailMessage } from "./send";

const BRAND = "Market Ka Baadshah";

function layout(heading: string, intro: string, ctaLabel: string, url: string, footer: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#0b0b0b;font-family:Arial,Helvetica,sans-serif;color:#e8e8e8">
  <div style="max-width:480px;margin:0 auto;background:#111;border:1px solid #2a2a2a;border-radius:12px;padding:28px">
    <div style="font-size:12px;letter-spacing:2px;color:#c9a227;text-transform:uppercase;margin-bottom:12px">${esc(BRAND)}</div>
    <h1 style="font-size:20px;margin:0 0 12px">${esc(heading)}</h1>
    <p style="font-size:14px;line-height:1.6;color:#bdbdbd">${esc(intro)}</p>
    <p style="margin:24px 0"><a href="${esc(url)}" style="background:#ffd700;color:#111;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px;display:inline-block">${esc(ctaLabel)}</a></p>
    <p style="font-size:12px;color:#888;word-break:break-all">If the button does not work, copy this link:<br>${esc(url)}</p>
    <p style="font-size:12px;color:#888">${esc(footer)}</p>
  </div>
</body></html>`;
}

export function verifyEmailMessage(to: string, name: string | null, url: string): EmailMessage {
  const greeting = name ? `Hi ${name},` : "Hi,";
  return {
    to,
    subject: `Verify your email for ${BRAND}`,
    html: layout(
      "Verify your email",
      `${greeting} confirm this address to activate your account.`,
      "Verify email",
      url,
      "This link expires in 24 hours. If you did not create an account, ignore this email.",
    ),
    text: `${greeting}\n\nVerify your email for ${BRAND}:\n${url}\n\nThis link expires in 24 hours. If you did not create an account, ignore this email.`,
  };
}

export function resetPasswordMessage(to: string, name: string | null, url: string): EmailMessage {
  const greeting = name ? `Hi ${name},` : "Hi,";
  return {
    to,
    subject: `Reset your ${BRAND} password`,
    html: layout(
      "Reset your password",
      `${greeting} we received a request to reset your password.`,
      "Choose a new password",
      url,
      "This link expires in 1 hour and works once. If you did not request this, you can ignore this email - your password will not change.",
    ),
    text: `${greeting}\n\nReset your ${BRAND} password:\n${url}\n\nThis link expires in 1 hour and works once. If you did not request this, ignore this email.`,
  };
}
