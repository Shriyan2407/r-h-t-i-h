import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth/auth";
import { prisma }       from "@/lib/auth/prisma";

export async function PUT(
  req:     Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await req.json();
    const { quantity, avgPrice, notes } = body;

    const holding = await prisma.portfolioHolding.findUnique({
      where:   { id },
      include: { portfolio: { select: { userId: true } } },
    });

    if (!holding || holding.portfolio.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.portfolioHolding.update({
      where: { id },
      data: {
        ...(quantity  != null && { quantity  }),
        ...(avgPrice  != null && { avgPrice  }),
        ...(notes     !== undefined && { notes: notes ?? null }),
        updatedAt: new Date(),
      },
    });

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

  const { id } = await context.params;

  try {
    const holding = await prisma.portfolioHolding.findUnique({
      where:   { id },
      include: { portfolio: { select: { userId: true } } },
    });

    if (!holding || holding.portfolio.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.portfolioHolding.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
