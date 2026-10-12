import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { consumeEmailVerificationToken } from "@/lib/auth/tokens";
import { enforceRateLimit, POLICIES } from "@/lib/ratelimit/guard";

const schema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/, "Invalid token") });

/**
 * Verification is a POST (not a GET link handler) so mail scanners and link
 * previewers that prefetch URLs cannot consume the single-use token. The emailed
 * link opens a page that submits this request.
 */
export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, POLICIES.verifyEmail);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "This verification link is invalid." }, { status: 400 });
  }

  const email = await consumeEmailVerificationToken(parsed.data.token);
  if (!email) {
    return NextResponse.json(
      { error: "This verification link is invalid or has expired." },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}
