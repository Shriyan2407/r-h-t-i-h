import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validatePasswordResetToken } from "@/lib/auth/tokens";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/auth/prisma";
import { enforceRateLimit, POLICIES } from "@/lib/ratelimit/guard";

const schema = z.object({
  token:    z.string().regex(/^[a-f0-9]{64}$/, "This reset link is invalid or has expired."),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, POLICIES.passwordReset);
  if (limited) return limited;

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const { token, password } = parsed.data;

    const record = await validatePasswordResetToken(token);
    if (!record) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: {
          hashedPassword,
          // Invalidate every existing session: JWTs carry the version they were issued under.
          sessionVersion: { increment: 1 },
          // Completing the emailed reset proves control of the address.
          ...(record.user.emailVerified ? {} : { emailVerified: new Date() }),
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data:  { used: true },
      }),
      // Any other outstanding reset links for this account are now void.
      prisma.passwordResetToken.deleteMany({
        where: { userId: record.userId, id: { not: record.id } },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/auth/reset-password]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
