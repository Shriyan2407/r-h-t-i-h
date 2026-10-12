import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPasswordResetToken } from "@/lib/auth/tokens";
import { sendEmail } from "@/lib/email/send";
import { resetPasswordMessage } from "@/lib/email/templates";
import { getAppUrl } from "@/lib/config/appUrl";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });

const GENERIC_OK = {
  success: true,
  message: "If an account with that email exists, a reset link has been sent.",
};

export async function POST(req: NextRequest) {
  let email: string;
  try {
    email = schema.parse(await req.json()).email;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // The response is identical whether or not the account exists, and whether or not
  // delivery succeeds, so this endpoint cannot be used to enumerate users. Failures
  // are logged for operators instead.
  try {
    const issued = await createPasswordResetToken(email);
    if (issued) {
      const url = `${getAppUrl()}/auth/reset-password?token=${issued.token}`;
      await sendEmail(resetPasswordMessage(issued.email, issued.name, url));
    }
  } catch (err) {
    console.error("[auth/forgot-password] could not issue or send reset email:", (err as Error).message);
  }

  return NextResponse.json(GENERIC_OK);
}
