import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/auth/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url    = new URL(req.url);
  const ticker = url.searchParams.get("ticker")?.toUpperCase() ?? undefined;
  const action = url.searchParams.get("action")?.toUpperCase() ?? undefined;
  const active = url.searchParams.get("active");
  const limit  = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 200);
  const offset = parseInt(url.searchParams.get("offset") ?? "0");

  const where: Record<string, unknown> = {};
  if (ticker) where.ticker  = { contains: ticker, mode: "insensitive" };
  if (action) where.action  = action;
  if (active === "true")  where.isActive = true;
  if (active === "false") where.isActive = false;

  const [signals, total] = await Promise.all([
    prisma.stockSignal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take:    limit,
      skip:    offset,
      include: {
        message: {
          include: { source: { select: { name: true, type: true } } },
        },
      },
    }),
    prisma.stockSignal.count({ where }),
  ]);

  return NextResponse.json({ signals, total });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, outcome, isActive } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const updated = await prisma.stockSignal.update({
    where: { id },
    data:  {
      ...(outcome  !== undefined ? { outcome, isActive: outcome !== "PENDING" ? false : true } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });

  return NextResponse.json(updated);
}
