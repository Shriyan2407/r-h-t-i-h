import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";

const MODEL      = "claude-sonnet-4-6";
const MAX_TOKENS = 4096;

const PROMPT_V1 = `You are an expert at reading Indian broker screenshots and extracting stock holdings.

SUPPORTED BROKERS & THEIR COLUMN LAYOUTS:
- Groww (dark/light): Stock name | Qty | Avg cost | Current val | Returns (₹/%) | Day change
- Zerodha Kite: Instrument | Qty | Avg cost | LTP | Cur val | P&L | Day chg %
- Upstox: Scrip | Qty | Buy avg | LTP | Mkt value | P&L | Day P&L
- AngelOne: Symbol | Qty | Avg price | LTP | Mkt value | P&L | % P&L
- ICICI Direct: Scrip name | Qty | Avg cost | LTP | Cur value | Gain/Loss
- Dhan: Stock | Qty | Buy avg | LTP | Day P&L | Overall P&L
- Paytm Money: Company | Units | Avg price | Current price | Gain
- INDmoney: Stock | Shares | Buy price | Market price | Total gain
- 5paisa: Symbol | Qty | Avg rate | LTP | Cur val | P&L

TASK: Extract EVERY stock row visible. Even if dark/blurry, extract all.

IMPORTANT RULES:
1. Extract ALL stock/equity rows — do not skip any
2. Skip: mutual funds, ETFs, cash balance, "Total"/"Summary" rows, header rows
3. For each stock, extract: ticker, company name, quantity, avg buy price, current/LTP price
4. Normalize tickers to standard NSE symbols (see below)
5. Return ONLY a raw JSON array — no markdown, no code blocks, no explanation

TICKER NORMALIZATION (display name → NSE symbol):
Reliance / RIL / Reliance Ind → RELIANCE
HDFC Bank / HDB / HDFCB → HDFCBANK
Tata Consultancy / TCS → TCS
Infosys / Infy → INFY
ICICI Bank → ICICIBANK
Tata Motors → TATAMOTORS
Wipro → WIPRO
Bajaj Finance / BajFin → BAJFINANCE
Axis Bank → AXISBANK
Kotak Bank / Kotak Mahindra → KOTAKBANK
SBI / State Bank → SBIN
Maruti Suzuki / Maruti → MARUTI
Asian Paints → ASIANPAINT
HUL / Hindustan Unilever → HINDUNILVR
L&T / Larsen → LT
HAL / Hindustan Aeronautics → HAL
BEL / Bharat Electronics → BEL
IRFC → IRFC
RVNL → RVNL
IRCTC → IRCTC
Adani Ports → ADANIPORTS
Adani Enterprises → ADANIENT
Adani Green → ADANIGREEN
Adani Power → ADANIPOWER
Adani Total Gas → ATGL
For all others: remove suffixes -EQ, -BE, -N1, .NS, .BO then UPPERCASE

NUMBER PARSING:
- Strip ₹, $, commas, spaces → pure float
- "1,234.56" → 1234.56
- "1.2K" → 1200, "1.5L" → 150000
- "—", "N/A", blank → null
- Quantity is always a positive integer (no decimals)

OUTPUT FORMAT — return ONLY this JSON array, nothing else:
[
  {
    "ticker": "NSE_SYMBOL",
    "company_name": "Company Name as shown",
    "quantity": 10,
    "avg_price": 1234.50,
    "current_price": 1456.75,
    "exchange": "NSE",
    "sector": null
  }
]`;

const PROMPT_V2 = `You are reading a broker portfolio screenshot from an Indian stock trading app.

Your ONLY job: list every stock/share holding you can see.

Look carefully at ALL rows — even if the text is small, partially visible, or on a dark background.

For EACH stock row, extract:
1. Stock symbol or company name (normalize to NSE ticker if possible)
2. Number of shares/units held
3. Average buy price per share (if visible)
4. Current/LTP price per share (if visible)

Ignore: mutual funds, gold, ETFs, cash, totals, headers.

Return ONLY a JSON array like this (no markdown, no code fences):
[{"ticker":"RELIANCE","company_name":"Reliance Industries","quantity":5,"avg_price":2400.00,"current_price":2650.00,"exchange":"NSE","sector":null}]

If you cannot determine a value, use null. Do NOT leave any visible stock out.`;

function extractJSON(text: string): unknown[] | null {
  // Try direct parse first
  const trimmed = text.trim();
  if (trimmed.startsWith("[")) {
    try { return JSON.parse(trimmed); } catch { /* fall through */ }
  }

  // Strip markdown code fences
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch { /* fall through */ }
  }

  // Find largest JSON array in the text
  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try { return JSON.parse(arrayMatch[0]); } catch { /* fall through */ }
  }

  // Try to find and fix truncated JSON (common with long portfolios)
  const bracketOpen = trimmed.lastIndexOf("[");
  if (bracketOpen !== -1) {
    let partial = trimmed.slice(bracketOpen);
    // Count open objects and close them
    let depth = 0;
    let lastValidEnd = 0;
    for (let i = 0; i < partial.length; i++) {
      if (partial[i] === "{") depth++;
      if (partial[i] === "}") { depth--; if (depth === 0) lastValidEnd = i + 1; }
    }
    if (lastValidEnd > 0) {
      const fixedStr = partial.slice(0, lastValidEnd) + "]";
      try { return JSON.parse(fixedStr); } catch { /* fall through */ }
    }
  }

  return null;
}

function validateAndClean(raw: unknown[]): Record<string, unknown>[] {
  const seen = new Set<string>();
  return raw
    .filter((h): h is Record<string, unknown> => typeof h === "object" && h !== null)
    .filter(h => {
      const ticker = String(h.ticker ?? "").trim().toUpperCase();
      if (!ticker || ticker === "NULL" || ticker === "N/A" || ticker === "UNKNOWN") return false;
      // Remove obvious non-stocks
      if (/^(NIFTY|SENSEX|TOTAL|CASH|LIQUID|GOLD|SILVER)/i.test(ticker)) return false;
      // Dedup by ticker
      if (seen.has(ticker)) return false;
      seen.add(ticker);
      return true;
    })
    .map(h => ({
      ...h,
      ticker:   String(h.ticker ?? "").trim().toUpperCase(),
      quantity: Math.max(0, parseInt(String(h.quantity ?? "0")) || 0),
      avg_price:
        h.avg_price != null && String(h.avg_price) !== ""
          ? parseFloat(String(h.avg_price).replace(/[₹,$\s]/g, "").replace(/,/g, "")) || null
          : null,
      current_price:
        h.current_price != null && String(h.current_price) !== ""
          ? parseFloat(String(h.current_price).replace(/[₹,$\s]/g, "").replace(/,/g, "")) || null
          : null,
      exchange: String(h.exchange ?? "NSE").toUpperCase() === "BSE" ? "BSE" : "NSE",
      sector:   h.sector ?? null,
    }))
    .filter(h => h.quantity > 0);
}

async function callClaude(
  base64: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf",
  prompt: string,
  isPDF: boolean
): Promise<string> {
  const headers: Record<string, string> = {
    "x-api-key":         process.env.ANTHROPIC_API_KEY ?? "",
    "anthropic-version": "2023-06-01",
    "content-type":      "application/json",
  };
  if (isPDF) headers["anthropic-beta"] = "pdfs-2024-09-25";

  const content = isPDF
    ? [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
        { type: "text", text: prompt },
      ]
    : [
        { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
        { type: "text", text: prompt },
      ];

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method:  "POST",
    headers,
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: MAX_TOKENS,
      messages:   [{ role: "user", content }],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Anthropic API error: ${resp.status} ${errText}`);
  }

  const result = await resp.json();
  return (result.content?.[0]?.text ?? "") as string;
}

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

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
    }

    const bytes   = await file.arrayBuffer();
    const base64  = Buffer.from(bytes).toString("base64");
    const mime    = file.type;
    const isPDF   = mime === "application/pdf";
    const validImgs = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const mediaType = (validImgs.includes(mime) ? mime : "image/jpeg") as
      "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    // Pass 1 — detailed broker-aware prompt
    let rawText = await callClaude(base64, isPDF ? "application/pdf" : mediaType, PROMPT_V1, isPDF);
    let parsed  = extractJSON(rawText);

    // Pass 2 — simpler fallback prompt if pass 1 returned nothing
    if (!parsed || parsed.length === 0) {
      rawText = await callClaude(base64, isPDF ? "application/pdf" : mediaType, PROMPT_V2, isPDF);
      parsed  = extractJSON(rawText);
    }

    if (!parsed || parsed.length === 0) {
      return NextResponse.json({
        holdings:     [],
        debug_reason: "AI could not find any stock rows in this image. Try a clearer screenshot.",
      });
    }

    const holdings = validateAndClean(parsed as unknown[]);

    return NextResponse.json({ holdings, count: holdings.length });
  } catch (err) {
    console.error("[portfolio/scan]", err);
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: `Scan failed: ${msg}` }, { status: 500 });
  }
}
