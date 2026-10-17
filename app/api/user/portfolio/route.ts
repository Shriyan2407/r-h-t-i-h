import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth/auth";
import { prisma }       from "@/lib/auth/prisma";
import { holdingCreateSchema, MAX_HOLDINGS_PER_PORTFOLIO } from "@/lib/validation/portfolio";

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
        // Decimal columns: return JSON numbers (a Decimal would serialise as a string and break the client).
        quantity: Number(h.quantity),
        avgPrice: Number(h.avgPrice),
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

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = holdingCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid holding" },
      { status: 400 },
    );
  }
  const { ticker, name, exchange, sector, quantity, avgPrice, notes } = parsed.data;

  try {
    // Get or create portfolio
    const portfolio =
      (await prisma.portfolio.findUnique({ where: { userId: session.user.id } })) ??
      (await prisma.portfolio.create({ data: { userId: session.user.id } }));

    const existing = await prisma.portfolioHolding.findUnique({
      where: { portfolioId_ticker: { portfolioId: portfolio.id, ticker } },
      select: { id: true },
    });
    if (!existing) {
      const count = await prisma.portfolioHolding.count({ where: { portfolioId: portfolio.id } });
      if (count >= MAX_HOLDINGS_PER_PORTFOLIO) {
        return NextResponse.json(
          { error: `A portfolio can hold at most ${MAX_HOLDINGS_PER_PORTFOLIO} positions` },
          { status: 409 },
        );
      }
    }

    const holding = await prisma.portfolioHolding.upsert({
      where:  { portfolioId_ticker: { portfolioId: portfolio.id, ticker } },
      update: { quantity, avgPrice, notes: notes ?? null },
      create: {
        portfolioId: portfolio.id,
        ticker,
        name,
        exchange,
        sector:      sector ?? "Other",
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
