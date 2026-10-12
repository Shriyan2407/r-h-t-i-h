import type { ParsedHolding } from "./ocrParser";

// ── Column alias map ──────────────────────────────────────────────────────────
// Each key is an internal field name; values are lower-cased header aliases.
// Broker formats handled: Zerodha, Groww, Upstox, AngelOne, Dhan, ICICI, Paytm Money

const COL_ALIASES: Record<string, string[]> = {
  symbol: [
    "symbol", "ticker", "stock", "scrip", "instrument", "stock name",
    "company", "security", "tradingsymbol", "trading symbol", "name",
    "script", "security name", "share name", "stock/fund", "equity",
    "holding", "company name",
  ],
  quantity: [
    "qty", "quantity", "shares", "units", "net qty", "holdings",
    "no. of shares", "no of shares", "net quantity", "bal qty",
    "balance qty", "available qty", "closing qty", "total qty",
    "net holding", "total units", "holding qty",
  ],
  avg_price: [
    "avg", "avg price", "avg. price", "avg cost", "avg. cost",
    "average price", "average cost", "buy price", "avg buy price",
    "nav", "avg nav", "average buy price", "cost price", "purchase price",
    "avg purchase price", "average nav", "average buy nav",
    "avg. purchase price", "average purchase price", "avg(₹)", "avg price (₹)",
    "buy avg", "average price (₹)", "purchase avg",
  ],
  current_price: [
    "ltp", "current price", "last price", "market price", "cmp",
    "current nav", "live price", "close price", "mkt price", "market rate",
    "last traded price", "current market price", "latest price",
    "present price", "ltp (₹)", "cmp (₹)",
  ],
  pnl: [
    "p&l", "pnl", "profit/loss", "gain/loss", "unrealised p&l",
    "unrealized p&l", "net p&l", "gain loss", "profit & loss",
    "profit and loss", "net gain/loss", "net profit/loss",
    "unrealised gain/loss", "total p&l",
  ],
  current_value: [
    "current value", "market value", "mkt val", "cur val",
    "present value", "current val", "market val", "current amount",
    "mkt value", "portfolio value",
  ],
  invested_value: [
    "invested value", "invested amount", "investment", "cost value",
    "total cost", "buy value", "total investment", "amount invested",
    "purchase value", "cost amount",
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .trim()
    .replace(/[₹()%*#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function matchColumn(header: string): string | null {
  const norm = normalizeHeader(header);
  if (!norm) return null;
  for (const [field, aliases] of Object.entries(COL_ALIASES)) {
    for (const alias of aliases) {
      if (norm === alias || norm.startsWith(alias + " ") || norm.endsWith(" " + alias)) {
        return field;
      }
    }
  }
  // Fuzzy: if the header contains an alias as a whole word
  for (const [field, aliases] of Object.entries(COL_ALIASES)) {
    for (const alias of aliases) {
      if (norm.includes(alias)) return field;
    }
  }
  return null;
}

function parseNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const s = String(val).replace(/[₹,\s]/g, "").trim();
  if (!s || s === "-" || s === "—" || s === "N/A" || s === "n/a") return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function normalizeTicker(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[-\s]*(EQ|BE|N1|IL|BL)$/i, "")
    .replace(/\.NS$|\.BO$/i, "")
    .replace(/\s+/g, "")
    .trim();
}

function isValidTicker(t: string): boolean {
  if (!t || t.length < 2 || t.length > 15) return false;
  const NOISE = new Set([
    "SYMBOL", "TICKER", "TOTAL", "GRAND", "NSE", "BSE", "MCX",
    "ISIN", "NULL", "NA", "NIL", "SUM",
  ]);
  return !NOISE.has(t);
}

// ── Core structured-data parser ───────────────────────────────────────────────

export interface ParseResult {
  holdings: ParsedHolding[];
  confidence: number;
  detectedColumns: string[];
}

export function parseStructuredData(rows: Record<string, unknown>[]): ParseResult {
  if (rows.length === 0) return { holdings: [], confidence: 0, detectedColumns: [] };

  // Skip header-like rows at the top
  let dataRows = rows;
  const firstKey = Object.keys(rows[0])[0];
  if (firstKey && String(rows[0][firstKey]).toLowerCase() === normalizeHeader(firstKey)) {
    dataRows = rows.slice(1);
  }

  const headers = Object.keys(rows[0]);
  const colMap: Record<string, string> = {}; // field → original header key

  for (const h of headers) {
    const field = matchColumn(h);
    if (field && !colMap[field]) colMap[field] = h;
  }

  const detectedColumns = Object.keys(colMap);

  if (!colMap.symbol) {
    return { holdings: [], confidence: 0, detectedColumns };
  }

  const holdings: ParsedHolding[] = [];

  for (const row of dataRows) {
    const rawSymbol = String(row[colMap.symbol] ?? "").trim();
    if (!rawSymbol) continue;

    const ticker = normalizeTicker(rawSymbol);
    if (!isValidTicker(ticker)) continue;

    // Try to get quantity
    const qty = colMap.quantity ? parseNumber(row[colMap.quantity]) : null;
    if (!qty || qty <= 0) continue;

    const avgPrice = colMap.avg_price ? parseNumber(row[colMap.avg_price]) : null;
    const currentPrice = colMap.current_price ? parseNumber(row[colMap.current_price]) : null;

    holdings.push({
      ticker,
      company_name: ticker,
      quantity: Math.round(qty),
      avg_price: avgPrice,
      current_price: currentPrice,
      exchange: "NSE",
      sector: null,
    });
  }

  // Confidence based on how many key fields were detected
  const keyFields = ["symbol", "quantity", "avg_price", "current_price"];
  const matched = keyFields.filter(f => colMap[f]).length;
  const confidence = matched >= 3 ? 98 : matched === 2 ? 88 : matched === 1 ? 65 : 0;

  return { holdings, confidence, detectedColumns };
}

// ── CSV parser ────────────────────────────────────────────────────────────────

export async function parseCSV(file: File): Promise<ParseResult> {
  const Papa = (await import("papaparse")).default;
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (result) => {
        try {
          resolve(parseStructuredData(result.data));
        } catch (e) {
          reject(e);
        }
      },
      error: (err: Error) => reject(new Error(err.message)),
    });
  });
}

// ── XLSX parser ───────────────────────────────────────────────────────────────

export async function parseXLSX(file: File): Promise<ParseResult> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  // Try each sheet; return from the first one that yields holdings
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false, // force everything to strings first
    });
    if (rows.length === 0) continue;

    // Some sheets have the real header on row 2-3 (summary rows above)
    // Try progressively skipping leading rows until we get a hit
    for (let skip = 0; skip < Math.min(5, rows.length); skip++) {
      const sliced = rows.slice(skip);
      const result = parseStructuredData(sliced);
      if (result.holdings.length > 0) return result;
    }
  }

  return { holdings: [], confidence: 0, detectedColumns: [] };
}
