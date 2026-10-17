import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findUserByEmail } from "@/lib/auth/users";
import { createEmailVerificationToken } from "@/lib/auth/tokens";
import { sendEmail } from "@/lib/email/send";
import { verifyEmailMessage } from "@/lib/email/templates";
import { getAppUrl } from "@/lib/config/appUrl";
import { enforceRateLimit, POLICIES } from "@/lib/ratelimit/guard";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });

const GENERIC_OK = {
  success: true,
  message: "If that account needs verification, a new link has been sent.",
};

export async function POST(req: NextRequest) {
  let email: string;
  try {
    email = schema.parse(await req.json()).email;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Limit per address as well as per IP, so one inbox cannot be flooded from many IPs.
  const byIp = await enforceRateLimit(req, POLICIES.resendVerification);
  if (byIp) return byIp;
  const byEmail = await enforceRateLimit(req, POLICIES.resendVerification, `email:${email}`);
  if (byEmail) return byEmail;

  try {
    const user = await findUserByEmail(email);
    if (user && !user.emailVerified && user.hashedPassword) {
      const token = await createEmailVerificationToken(user.email);
      const url = `${getAppUrl()}/auth/verify-email?token=${token}`;
      await sendEmail(verifyEmailMessage(user.email, user.name, url));
    }
  } catch (err) {
    console.error("[auth/resend-verification]", (err as Error).message);
  }

  return NextResponse.json(GENERIC_OK);
}
