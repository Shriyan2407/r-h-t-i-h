export interface ParsedHolding {
  ticker:       string;
  company_name: string;
  quantity:     number;
  avg_price:    number | null;
  current_price: number | null;
  exchange:     string;
  sector:       null;
}

// ── Ticker normalisation map ────────────────────────────────────────────────

const NAME_TO_TICKER: Record<string, string> = {
  "reliance industries": "RELIANCE", "reliance": "RELIANCE", "ril": "RELIANCE",
  "hdfc bank": "HDFCBANK", "hdfcbank": "HDFCBANK", "hdfc bk": "HDFCBANK",
  "tata consultancy": "TCS", "tcs": "TCS",
  "infosys": "INFY", "infy": "INFY", "infosys ltd": "INFY",
  "icici bank": "ICICIBANK", "icici bk": "ICICIBANK",
  "tata motors": "TATAMOTORS", "tata mtr": "TATAMOTORS",
  "wipro": "WIPRO",
  "bajaj finance": "BAJFINANCE", "bajaj fin": "BAJFINANCE", "bajfin": "BAJFINANCE",
  "axis bank": "AXISBANK", "axis bk": "AXISBANK",
  "kotak bank": "KOTAKBANK", "kotak mahindra": "KOTAKBANK", "kotak bk": "KOTAKBANK",
  "state bank": "SBIN", "sbi": "SBIN",
  "maruti suzuki": "MARUTI", "maruti": "MARUTI",
  "asian paints": "ASIANPAINT", "asian pts": "ASIANPAINT",
  "hindustan unilever": "HINDUNILVR", "hul": "HINDUNILVR",
  "larsen": "LT", "l&t": "LT", "larsen & toubro": "LT",
  "hindustan aeronautics": "HAL", "hal": "HAL",
  "bharat electronics": "BEL", "bel": "BEL",
  "power grid": "POWERGRID",
  "ntpc": "NTPC",
  "ongc": "ONGC",
  "sun pharma": "SUNPHARMA", "sun pharmaceutical": "SUNPHARMA",
  "dr reddy": "DRREDDY", "dr reddys": "DRREDDY",
  "cipla": "CIPLA",
  "adani ports": "ADANIPORTS",
  "adani enterprises": "ADANIENT",
  "adani green": "ADANIGREEN",
  "adani power": "ADANIPOWER",
  "adani total gas": "ATGL",
  "irfc": "IRFC",
  "rvnl": "RVNL",
  "irctc": "IRCTC",
  "coal india": "COALINDIA",
  "itc": "ITC",
  "jsw steel": "JSWSTEEL",
  "tata steel": "TATASTEEL",
  "hindalco": "HINDALCO",
  "ultratech cement": "ULTRACEMCO",
  "shree cement": "SHREECEM",
  "nestle": "NESTLEIND", "nestle india": "NESTLEIND",
  "britannia": "BRITANNIA",
  "pidilite": "PIDILITIND",
  "berger paints": "BERGEPAINT",
  "indigo": "INDIGO", "interglobe": "INDIGO",
  "dmart": "DMART", "avenue supermarts": "DMART",
  "zomato": "ZOMATO",
  "paytm": "PAYTM",
  "nykaa": "NYKAA", "fsg": "NYKAA",
  "policybazaar": "POLICYBZR",
  "hdfc life": "HDFCLIFE",
  "sbi life": "SBILIFE",
  "bajaj allianz": "BAJAJFINSV",
  "titan": "TITAN", "titan company": "TITAN",
  "trent": "TRENT",
  "vedanta": "VEDL",
  "pg": "PGHH", "p&g": "PGHH",
  "abbott india": "ABBOTINDIA",
  "siemens": "SIEMENS",
  "abb india": "ABB",
  "bharat forge": "BHARATFORG",
  "motherson": "MOTHERSON",
  "mrf": "MRF",
  "hero motocorp": "HEROMOTOCO", "hero moto": "HEROMOTOCO",
  "bajaj auto": "BAJAJ-AUTO",
  "tvs motor": "TVSMOTOR",
  "eicher motors": "EICHERMOT",
  "mahindra": "M&M", "m&m": "M&M",
  "bosch": "BOSCHLTD",
  "godrej consumer": "GODREJCP",
  "marico": "MARICO",
  "dabur": "DABUR",
  "emami": "EMAMILTD",
  "divis labs": "DIVISLAB",
  "biocon": "BIOCON",
  "aurobindo pharma": "AUROPHARMA",
  "torrent pharma": "TORNTPHARM",
  "lupin": "LUPIN",
  "alkem labs": "ALKEM",
  "persistent": "PERSISTENT", "persistent systems": "PERSISTENT",
  "mphasis": "MPHASIS",
  "ltimindtree": "LTIM",
  "tech mahindra": "TECHM",
  "hcl tech": "HCLTECH", "hcl technologies": "HCLTECH",
  "oracle": "OFSS", "oracle financial": "OFSS",
  "coforge": "COFORGE",
  "zensar": "ZENSARTECH",
  "axis direct": "AXISBANK",
  "sbi cards": "SBICARD",
  "hdfc amc": "HDFCAMC",
  "nippon india amc": "NAM-INDIA",
  "uti amc": "UTIAMC",
  "canfin homes": "CANFINHOME",
  "aavas financiers": "AAVAS",
  "home first finance": "HOMEFIRST",
  "pfc": "PFC", "power finance": "PFC",
  "rec limited": "RECLTD", "rec": "RECLTD",
  "ireda": "IREDA",
  "nhpc": "NHPC",
  "nptc": "NTPC",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeTicker(raw: string): string {
  const upper = raw.trim().toUpperCase()
    .replace(/[-\s]*(EQ|BE|N1|IL|BL)$/, "")
    .replace(/\.NS$|\.BO$/, "")
    .trim();
  return upper;
}

function resolveCompanyName(text: string): string | null {
  const lower = text.toLowerCase().trim();
  for (const [name, ticker] of Object.entries(NAME_TO_TICKER)) {
    if (lower.includes(name)) return ticker;
  }
  return null;
}

function isLikelyTicker(s: string): boolean {
  // NSE/BSE tickers: 2-12 uppercase alphanumeric or & or -
  return /^[A-Z][A-Z0-9&-]{1,11}$/.test(s) && !/^(QTY|AVG|LTP|NET|P&L|NAV|DAY|BUY|SELL|TOTAL|HOLDINGS|PORTFOLIO|VALUE|COST|GAIN|LOSS|PROFIT|RETURN|INVEST|CUR|MKT)$/.test(s);
}

function cleanNumber(s: string): number | null {
  // Remove currency symbols, commas, spaces; handle lakh/K shorthand
  const stripped = s.replace(/[₹$,\s]/g, "").trim();
  if (!stripped || stripped === "-" || stripped === "—") return null;

  // Handle K/L shorthand
  if (/^\d+(\.\d+)?[Kk]$/.test(stripped)) return parseFloat(stripped) * 1000;
  if (/^\d+(\.\d+)?[Ll]$/.test(stripped)) return parseFloat(stripped) * 100000;

  const n = parseFloat(stripped);
  return isNaN(n) ? null : n;
}

function extractNumbers(text: string): number[] {
  // Match numbers like 1234.56, 1,234.56, ₹1234, etc.
  const matches = text.matchAll(/(?:₹\s*)?(\d{1,3}(?:,\d{2,3})*(?:\.\d+)?|\d+(?:\.\d+)?)/g);
  const results: number[] = [];
  for (const m of matches) {
    const n = cleanNumber(m[1]);
    if (n !== null && n >= 0) results.push(n);
  }
  return results;
}

// Determine which number is the quantity (positive integer, reasonable range)
function pickQuantity(nums: number[]): { qty: number; rest: number[] } | null {
  for (let i = 0; i < nums.length; i++) {
    const n = nums[i];
    if (Number.isInteger(n) && n >= 1 && n <= 999999) {
      return { qty: n, rest: [...nums.slice(0, i), ...nums.slice(i + 1)] };
    }
    // Treat fractional like 0.5 as not a quantity
  }
  // Fallback: first number rounded if close to integer
  for (let i = 0; i < nums.length; i++) {
    const n = nums[i];
    const r = Math.round(n);
    if (Math.abs(n - r) < 0.01 && r >= 1 && r <= 999999) {
      return { qty: r, rest: [...nums.slice(0, i), ...nums.slice(i + 1)] };
    }
  }
  return null;
}

// ── Main parser ───────────────────────────────────────────────────────────────

export function parseOCRText(rawText: string): ParsedHolding[] {
  // ── Step 1: Clean OCR artefacts ────────────────────────────────────────────
  const text = rawText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Remove common OCR garbage lines
    .replace(/^[=_\-*#|]{3,}.*$/gm, "")
    // Normalise thousand separators that OCR splits: "1 234" → "1234"
    .replace(/(\d) (\d{3})(?!\d)/g, "$1$2")
    // Remove zero-width spaces and other invisible chars
    .replace(/[​-‍﻿]/g, "");

  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 1);

  const holdings: ParsedHolding[] = [];
  const seen = new Set<string>();

  // ── Step 2: Try tabular format first (Zerodha/Upstox/AngelOne) ────────────
  // These have all data on one line: TICKER QTY AVG LTP VALUE P&L
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(/\s+/);
    if (parts.length < 3) continue;

    const rawTicker = normalizeTicker(parts[0].replace(/\s*EQ\s*$/, ""));
    if (!isLikelyTicker(rawTicker)) continue;

    const nums = extractNumbers(parts.slice(1).join(" "));
    if (nums.length === 0) continue;

    const qtyResult = pickQuantity(nums);
    if (!qtyResult || qtyResult.qty === 0) continue;

    const { qty, rest } = qtyResult;
    // Price-like numbers: filter out totals (very large) vs unit prices
    const prices = rest.filter(n => n > 0.5 && n < 200000);

    const avg = prices[0] ?? null;
    const ltp = prices[1] ?? null;

    const ticker = normalizeTicker(rawTicker);
    if (seen.has(ticker)) continue;
    seen.add(ticker);

    holdings.push({
      ticker,
      company_name: ticker,
      quantity:     qty,
      avg_price:    avg,
      current_price: ltp,
      exchange:     "NSE",
      sector:       null,
    });
  }

  // ── Step 3: Multi-line format (Groww) ─────────────────────────────────────
  // Pattern: company name on one line, numbers on the next 1-3 lines
  if (holdings.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Try to detect this line as a company name or ticker
      let ticker: string | null = null;
      let companyName = line;

      // Direct ticker match (all-caps word)
      const tickerMatch = line.match(/^([A-Z][A-Z0-9&-]{1,11})(?:\s+EQ|\s+BE)?(?:\s|$)/);
      if (tickerMatch && isLikelyTicker(tickerMatch[1])) {
        ticker = normalizeTicker(tickerMatch[1]);
      }

      // Company name match
      if (!ticker) {
        ticker = resolveCompanyName(line);
      }

      if (!ticker) continue;
      if (seen.has(ticker)) continue;

      // Collect number context from next 3 lines
      const contextLines = lines.slice(i + 1, i + 4);
      const contextText = contextLines.join(" ");
      const nums = extractNumbers(contextText);

      if (nums.length === 0) continue;

      const qtyResult = pickQuantity(nums);
      if (!qtyResult || qtyResult.qty === 0) continue;

      const { qty, rest } = qtyResult;
      const prices = rest.filter(n => n > 0.5 && n < 200000);

      seen.add(ticker);

      holdings.push({
        ticker,
        company_name: companyName.replace(/\s+Ltd\.?$|\s+Limited\.?$/i, "").trim(),
        quantity:     qty,
        avg_price:    prices[0] ?? null,
        current_price: prices[1] ?? null,
        exchange:     "NSE",
        sector:       null,
      });

      i += contextLines.length > 0 ? 1 : 0; // skip data lines
    }
  }

  // ── Step 4: Mixed scan — catch leftover tickers from noisy OCR ───────────
  if (holdings.length === 0) {
    // Last resort: find ALL uppercase tokens and extract nearby numbers
    const allCapsRe = /\b([A-Z][A-Z0-9&-]{2,11})\b/g;
    for (const line of lines) {
      for (const match of line.matchAll(allCapsRe)) {
        const tok = normalizeTicker(match[1]);
        if (!isLikelyTicker(tok) || seen.has(tok)) continue;

        const nums = extractNumbers(line);
        if (nums.length === 0) continue;

        const qtyResult = pickQuantity(nums);
        if (!qtyResult) continue;

        const { qty, rest } = qtyResult;
        const prices = rest.filter(n => n > 0.5 && n < 200000);

        seen.add(tok);
        holdings.push({
          ticker:        tok,
          company_name:  tok,
          quantity:      qty,
          avg_price:     prices[0] ?? null,
          current_price: prices[1] ?? null,
          exchange:      "NSE",
          sector:        null,
        });
      }
    }
  }

  // ── Step 5: Deduplicate and filter garbage ────────────────────────────────
  return holdings.filter(h => {
    if (!h.ticker || h.ticker.length < 2) return false;
    if (h.quantity <= 0) return false;
    // Filter out common non-stock uppercase words that slip through
    const NOISE = new Set(["NSE", "BSE", "MCX", "INR", "USD", "NAV", "ETF", "FD", "SIP", "MF", "AMC"]);
    if (NOISE.has(h.ticker)) return false;
    return true;
  });
}
