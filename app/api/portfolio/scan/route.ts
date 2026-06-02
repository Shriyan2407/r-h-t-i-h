import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";

const MODEL = "claude-sonnet-4-6";

const PROMPT = `You are an expert financial data extractor for Indian stock market portfolios.

Analyze this portfolio screenshot from an Indian broker (Zerodha, Groww, Upstox, AngelOne, ICICI Direct, Dhan, Paytm Money, Kotak, Sharekhan, INDmoney, 5paisa, or similar) and extract ALL visible stock holdings.

Return ONLY a valid JSON array — no markdown, no code fences, no prose. Just the raw JSON array.

Each element must follow this exact schema:
{
  "ticker": "NSE/BSE symbol in UPPERCASE",
  "company_name": "Full company name as printed",
  "quantity": <positive integer>,
  "avg_price": <number or null>,
  "current_price": <number or null>,
  "exchange": "NSE" or "BSE",
  "sector": "<sector string or null>"
}

Ticker normalization — convert abbreviated/display names to standard NSE symbols:
- Reliance Industries / Reliance Ind / RIL / RELIND → RELIANCE
- HDFC Bank / HDFC Bk / HDB / HDFCB → HDFCBANK
- Tata Consultancy Services / TCS Ltd → TCS
- Infosys Ltd / INFY Ltd → INFY
- ICICI Bank Ltd → ICICIBANK
- Tata Motors Ltd / TATAMTR → TATAMOTORS
- Wipro Ltd → WIPRO
- Bajaj Finance / Bajaj Fin → BAJFINANCE
- Axis Bank / Axis Bk → AXISBANK
- Kotak Mahindra Bank / Kotak Bk → KOTAKBANK
- State Bank of India / SBI → SBIN
- Maruti Suzuki / Maruti → MARUTI
- Asian Paints / Asian Pts → ASIANPAINT
- Hindustan Unilever / HUL → HINDUNILVR
- Larsen & Toubro / L&T → LT
- Hindustan Aeronautics / HAL → HAL
- Bharat Electronics / BEL → BEL
- For all others: remove suffixes -EQ, -BE, -N1, .NS, .BO and convert to UPPERCASE

Number parsing rules:
- Strip ₹, $, commas, spaces from prices → pure float
- Quantity is always a positive integer
- If a value shows "—", "N/A", or is blank → set to null
- avg_price is the average buy/cost price per share
- current_price is the live/LTP price if visible

Skip these rows completely: cash/liquid balance, mutual fund units, ETFs, NIFTY/SENSEX index rows, "Total" summary rows, header rows, footer rows, empty rows.

Return ONLY the JSON array, nothing else. No explanation.`;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 8 MB)" }, { status: 400 });
    }

    const bytes     = await file.arrayBuffer();
    const base64    = Buffer.from(bytes).toString("base64");
    const mime      = file.type;
    const isPDF     = mime === "application/pdf";
    const validImgs = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const mediaType = (validImgs.includes(mime) ? mime : "image/jpeg") as
      "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    const content = isPDF
      ? [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
          { type: "text", text: PROMPT },
        ]
      : [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: PROMPT },
        ];

    const headers: Record<string, string> = {
      "x-api-key":         process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
      "content-type":      "application/json",
    };
    if (isPDF) headers["anthropic-beta"] = "pdfs-2024-09-25";

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 2048,
        messages:   [{ role: "user", content }],
      }),
    });

    if (!resp.ok) {
      console.error("[portfolio/scan] Anthropic error:", await resp.text());
      return NextResponse.json({ error: "AI extraction failed — please try again" }, { status: 500 });
    }

    const result  = await resp.json();
    const rawText = (result.content?.[0]?.text ?? "") as string;

    // Extract JSON array — strip any accidental markdown fences
    const match = rawText.match(/\[[\s\S]*\]/);
    if (!match) {
      return NextResponse.json({ holdings: [] });
    }

    let holdings: unknown[];
    try {
      holdings = JSON.parse(match[0]);
    } catch {
      return NextResponse.json({ holdings: [] });
    }

    return NextResponse.json({ holdings });
  } catch (err) {
    console.error("[portfolio/scan]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
