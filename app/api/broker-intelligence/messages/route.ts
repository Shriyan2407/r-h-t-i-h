import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/auth/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url      = new URL(req.url);
  const sourceId = url.searchParams.get("sourceId") ?? undefined;
  const limit    = Math.min(parseInt(url.searchParams.get("limit") ?? "30"), 100);
  const offset   = parseInt(url.searchParams.get("offset") ?? "0");

  const messages = await prisma.brokerMessage.findMany({
    where:   sourceId ? { sourceId } : {},
    orderBy: { timestamp: "desc" },
    take:    limit,
    skip:    offset,
    include: {
      source: { select: { name: true, type: true } },
      signal: true,
    },
  });

  return NextResponse.json(messages);
}
