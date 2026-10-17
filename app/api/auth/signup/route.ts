import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/auth/prisma";
import { hashPassword } from "@/lib/auth/password";
import { findUserByEmail } from "@/lib/auth/users";
import { createEmailVerificationToken } from "@/lib/auth/tokens";
import { sendEmail } from "@/lib/email/send";
import { verifyEmailMessage } from "@/lib/email/templates";
import { getAppUrl } from "@/lib/config/appUrl";
import { enforceRateLimit, POLICIES } from "@/lib/ratelimit/guard";

const signupSchema = z.object({
  name:     z.string().trim().min(2, "Name must be at least 2 characters").max(50),
  email:    z.string().trim().toLowerCase().email("Invalid email address").max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

/**
 * The response is the same whether the address is new or already registered, so the
 * endpoint cannot be used to discover who has an account. The user is told to check
 * their inbox either way.
 */
const ACCEPTED = {
  success: true,
  requiresVerification: true,
  message: "If this address can be registered, we have sent a verification link to it.",
};

async function sendVerification(email: string, name: string | null) {
  const token = await createEmailVerificationToken(email);
  const url = `${getAppUrl()}/auth/verify-email?token=${token}`;
  await sendEmail(verifyEmailMessage(email, name, url));
}

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, POLICIES.signup);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { name, email, password } = parsed.data;

  try {
    const existing = await findUserByEmail(email);

    if (existing) {
      // Verified accounts and OAuth-only accounts are never touched.
      //
      // An *unverified* password account is different: it may have been pre-registered
      // by someone else using this address. The newest signup replaces its credentials
      // before a fresh link is sent, so verifying the address can never activate a
      // password chosen by a previous (possibly hostile) registrant.
      if (!existing.emailVerified && existing.hashedPassword) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            name,
            hashedPassword: await hashPassword(password),
            sessionVersion: { increment: 1 },
          },
        });
        await sendVerification(existing.email, name);
      }
      return NextResponse.json(ACCEPTED, { status: 202 });
    }

    const hashedPassword = await hashPassword(password);
    await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword,
        preferences: { create: { theme: "dark" } },
      },
    });

    await sendVerification(email, name);
    return NextResponse.json(ACCEPTED, { status: 202 });
  } catch (err) {
    console.error("[auth/signup]", (err as Error).message);
    return NextResponse.json(
      { error: "We could not complete signup right now. Please try again shortly." },
      { status: 503 },
    );
  }
}
