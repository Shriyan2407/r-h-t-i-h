import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth/auth";
import { prisma }       from "@/lib/auth/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const portfolio = await prisma.portfolio.findUnique({
      where:   { userId: session.user.id },
      include: { holdings: { orderBy: { addedAt: "desc" } } },
    });

    const rows = portfolio?.holdings ?? [];
    return NextResponse.json({
      holdings: rows.map((h: typeof rows[number]) => ({
        id:       h.id,
        ticker:   h.ticker,
        name:     h.name,
        exchange: h.exchange,
        sector:   h.sector ?? "Other",
        quantity: h.quantity,
        avgPrice: h.avgPrice,
        notes:    h.notes ?? undefined,
        addedAt:  h.addedAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { ticker, name, exchange, sector, quantity, avgPrice, notes } = body;

    if (!ticker || !name || quantity == null || avgPrice == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get or create portfolio
    let portfolio = await prisma.portfolio.findUnique({
      where: { userId: session.user.id },
    });
    if (!portfolio) {
      portfolio = await prisma.portfolio.create({
        data: { userId: session.user.id },
      });
    }

    const holding = await prisma.portfolioHolding.upsert({
      where:  { portfolioId_ticker: { portfolioId: portfolio.id, ticker: ticker.toUpperCase() } },
      update: { quantity, avgPrice, notes: notes ?? null, updatedAt: new Date() },
      create: {
        portfolioId: portfolio.id,
        ticker:      ticker.toUpperCase(),
        name,
        exchange:    exchange ?? "NSE",
        sector:      sector   ?? "Other",
        quantity,
        avgPrice,
        notes:       notes ?? null,
      },
    });

    return NextResponse.json({ id: holding.id });
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
