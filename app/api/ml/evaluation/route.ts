import { NextResponse } from "next/server";
import { evaluationSummary } from "@/lib/ml/evaluation";

/** GET /api/ml/evaluation - registry and recorded walk-forward evidence for every model, including rejected ones. */
export async function GET() {
  return NextResponse.json(evaluationSummary(), { headers: { "Cache-Control": "private, max-age=300" } });
}
