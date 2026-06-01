import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validatePasswordResetToken } from "@/lib/auth/tokens";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/auth/prisma";

const schema = z.object({
  token:    z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export async function POST(req: NextRequest) {
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
        data:  { hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data:  { used: true },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/auth/reset-password]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
