import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/auth/prisma";
import { hashPassword } from "@/lib/auth/password";

const signupSchema = z.object({
  name:     z.string().min(2, "Name must be at least 2 characters").max(50),
  email:    z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword,
        lastLogin:   new Date(),
        preferences: { create: { theme: "dark" } },
      },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (err) {
    console.error("[/api/auth/signup]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
