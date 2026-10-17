import { NextResponse } from "next/server";
import { getMacroIntelligence } from "@/lib/services/macro";

export async function GET() {
  try {
    const macro = await getMacroIntelligence();
    return NextResponse.json(macro, {
      headers: { "Cache-Control": "s-maxage=120, stale-while-revalidate=240" },
    });
  } catch (err) {
    const msg = (err as Error).message;
    console.error("[macro]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
