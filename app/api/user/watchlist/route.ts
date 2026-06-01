import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/auth/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.watchlistItem.findMany({
    where:   { userId: session.user.id },
    orderBy: { addedAt: "desc" },
  });

  return NextResponse.json(items);
}

const addSchema = z.object({
  ticker:   z.string().min(1).max(20),
  name:     z.string().min(1).max(200),
  exchange: z.string().default("NSE"),
  sector:   z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = addSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const ticker = parsed.data.ticker.toUpperCase();

    const item = await prisma.watchlistItem.upsert({
      where:  { userId_ticker: { userId: session.user.id, ticker } },
      create: { userId: session.user.id, ...parsed.data, ticker },
      update: {},
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error("[/api/user/watchlist POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ticker = new URL(req.url).searchParams.get("ticker")?.toUpperCase();
  if (!ticker) {
    return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  }

  await prisma.watchlistItem.deleteMany({
    where: { userId: session.user.id, ticker },
  });

  return NextResponse.json({ success: true });
}
