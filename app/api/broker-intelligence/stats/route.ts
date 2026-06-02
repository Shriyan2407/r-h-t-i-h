import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/auth/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    totalSignals,
    activeSignals,
    todayMessages,
    winSignals,
    lossSignals,
    topTickers,
    sourceStats,
  ] = await Promise.all([
    prisma.stockSignal.count(),
    prisma.stockSignal.count({ where: { isActive: true } }),
    prisma.brokerMessage.count({ where: { timestamp: { gte: since24h } } }),
    prisma.stockSignal.count({ where: { outcome: "WIN" } }),
    prisma.stockSignal.count({ where: { outcome: "LOSS" } }),

    // Top mentioned tickers (all time)
    prisma.stockSignal.groupBy({
      by:      ["ticker"],
      _count:  { ticker: true },
      orderBy: { _count: { ticker: "desc" } },
      take:    10,
    }),

    // Per-source stats
    prisma.brokerSource.findMany({
      where:   { isActive: true },
      include: {
        _count:   { select: { messages: true } },
        messages: {
          include: { signal: { select: { outcome: true } } },
          orderBy: { timestamp: "desc" },
          take:    1,
        },
      },
    }),
  ]);

  const resolved = winSignals + lossSignals;
  const hitRate  = resolved > 0 ? Math.round((winSignals / resolved) * 100) : null;

  const sources = sourceStats.map(s => {
    const allSignals = s.messages.flatMap(m => (m.signal ? [m.signal] : []));
    const wins       = allSignals.filter(sg => sg.outcome === "WIN").length;
    const losses     = allSignals.filter(sg => sg.outcome === "LOSS").length;
    const res        = wins + losses;
    return {
      id:           s.id,
      name:         s.name,
      type:         s.type,
      totalMessages: s._count.messages,
      wins,
      losses,
      hitRate: res > 0 ? Math.round((wins / res) * 100) : null,
      lastMessage: s.messages[0]?.signal ?? null,
    };
  });

  return NextResponse.json({
    totalSignals,
    activeSignals,
    todayMessages,
    winSignals,
    lossSignals,
    hitRate,
    topTickers: topTickers.map(t => ({ ticker: t.ticker, count: t._count.ticker })),
    sources,
  });
}
