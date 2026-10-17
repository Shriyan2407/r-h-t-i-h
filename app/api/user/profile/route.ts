import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/auth/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { invalidateUserAuthState } from "@/lib/auth/authState";
import { enforceRateLimit, POLICIES } from "@/lib/ratelimit/guard";

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
      role:             true,
      emailVerified:    true,
      // Only used to derive `hasPassword` below; the hash itself is never returned.
      hashedPassword:   true,
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
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { hashedPassword, ...safe } = user;
  return NextResponse.json({ ...safe, hasPassword: Boolean(hashedPassword) });
}

const updateSchema = z.object({
  name:            z.string().trim().min(2).max(50).optional(),
  theme:           z.enum(["dark", "light"]).optional(),
  currentPassword: z.string().min(1).max(100).optional(),
  newPassword:     z.string().min(8).max(100).optional(),
}).refine((v) => !v.newPassword || v.currentPassword, {
  message: "Current password required",
  path: ["currentPassword"],
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = updateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const { name, theme, currentPassword, newPassword } = parsed.data;

    if (newPassword) {
      // This endpoint verifies a password, so it is a guessing oracle for anyone holding
      // a stolen session: share the login limiter's per-account budget.
      const limited = await enforceRateLimit(req, POLICIES.login, `user:${userId}`);
      if (limited) return limited;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user?.hashedPassword) {
        return NextResponse.json({ error: "Cannot change password for OAuth accounts" }, { status: 400 });
      }
      const valid = await verifyPassword(currentPassword!, user.hashedPassword);
      if (!valid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }
      if (currentPassword === newPassword) {
        return NextResponse.json({ error: "New password must be different" }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: userId },
        data:  {
          hashedPassword: await hashPassword(newPassword),
          // Signs every session out, including this one: a changed password must kill any
          // session an attacker may be holding.
          sessionVersion: { increment: 1 },
        },
      });
      invalidateUserAuthState(userId);
    }

    if (name) {
      await prisma.user.update({
        where: { id: userId },
        data:  { name },
      });
    }

    if (theme) {
      await prisma.userPreferences.upsert({
        where:  { userId },
        create: { userId, theme },
        update: { theme },
      });
    }

    return NextResponse.json({ success: true, signedOut: Boolean(newPassword) });
  } catch (err) {
    console.error("[/api/user/profile PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const deleteSchema = z.object({
  password:     z.string().min(1).max(100).optional(),
  confirmEmail: z.string().trim().toLowerCase().max(254).optional(),
});

/**
 * Account deletion is irreversible, so a bare session cookie is not enough:
 *   - password accounts must re-enter their password;
 *   - OAuth-only accounts (no password) must type their email address.
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const limited = await enforceRateLimit(req, POLICIES.login, `user:${userId}`);
  if (limited) return limited;

  let raw: unknown = {};
  try {
    raw = await req.json();
  } catch {
    /* an empty body is handled by the checks below */
  }
  const parsed = deleteSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.hashedPassword) {
    if (!parsed.data.password || !(await verifyPassword(parsed.data.password, user.hashedPassword))) {
      return NextResponse.json({ error: "Password is incorrect" }, { status: 403 });
    }
  } else if (parsed.data.confirmEmail !== user.email.toLowerCase()) {
    return NextResponse.json({ error: "Type your account email to confirm" }, { status: 403 });
  }

  await prisma.user.delete({ where: { id: userId } });
  invalidateUserAuthState(userId);
  return NextResponse.json({ success: true });
}
