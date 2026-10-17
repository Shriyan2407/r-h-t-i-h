import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth/auth";
import { prisma }       from "@/lib/auth/prisma";
import { holdingIdSchema, holdingUpdateSchema } from "@/lib/validation/portfolio";

/** Resolve the holding only if it belongs to the signed-in user; otherwise behave as "not found". */
async function ownedHolding(id: string, userId: string) {
  const holding = await prisma.portfolioHolding.findUnique({
    where:   { id },
    include: { portfolio: { select: { userId: true } } },
  });
  return holding && holding.portfolio.userId === userId ? holding : null;
}

export async function PUT(
  req:     Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const idCheck = holdingIdSchema.safeParse((await context.params).id);
  if (!idCheck.success) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const id = idCheck.data;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = holdingUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid update" },
      { status: 400 },
    );
  }

  try {
    if (!(await ownedHolding(id, session.user.id))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.portfolioHolding.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE(
  _req:    Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const idCheck = holdingIdSchema.safeParse((await context.params).id);
  if (!idCheck.success) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const id = idCheck.data;

  try {
    if (!(await ownedHolding(id, session.user.id))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.portfolioHolding.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
