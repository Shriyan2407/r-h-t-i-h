import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/auth/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: {
      id:               true,
      name:             true,
      email:            true,
      image:            true,
      createdAt:        true,
      lastLogin:        true,
      subscriptionTier: true,
      preferences:      true,
      _count: {
        select: {
          watchlist: true,
          aiHistory: true,
          searches:  true,
        },
      },
    },
  });

  return NextResponse.json(user);
}

const updateSchema = z.object({
  name:           z.string().min(2).max(50).optional(),
  theme:          z.enum(["dark", "light"]).optional(),
  currentPassword: z.string().optional(),
  newPassword:    z.string().min(8).max(100).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const { name, theme, currentPassword, newPassword } = parsed.data;

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password required" }, { status: 400 });
      }
      const user = await prisma.user.findUnique({ where: { id: session.user.id } });
      if (!user?.hashedPassword) {
        return NextResponse.json({ error: "Cannot change password for OAuth accounts" }, { status: 400 });
      }
      const valid = await verifyPassword(currentPassword, user.hashedPassword);
      if (!valid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }
      await prisma.user.update({
        where: { id: session.user.id },
        data:  { hashedPassword: await hashPassword(newPassword) },
      });
    }

    if (name) {
      await prisma.user.update({
        where: { id: session.user.id },
        data:  { name },
      });
    }

    if (theme) {
      await prisma.userPreferences.upsert({
        where:  { userId: session.user.id },
        create: { userId: session.user.id, theme },
        update: { theme },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/user/profile PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.user.delete({ where: { id: session.user.id } });
  return NextResponse.json({ success: true });
}
