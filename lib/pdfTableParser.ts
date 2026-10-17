import type { ParsedHolding } from "./ocrParser";
import type { ParseResult } from "./csvXlsxParser";

interface TextItem {
  text: string;
  x: number;
  y: number;
}

// Group text items into rows by y-coordinate proximity
function clusterRows(items: TextItem[], threshold = 4): TextItem[][] {
  if (items.length === 0) return [];

  // PDF coordinate system: y increases upward, so sort descending by y for top-to-bottom order
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);

  const rows: TextItem[][] = [];
  let currentRow: TextItem[] = [sorted[0]];
  let currentY = sorted[0].y;

  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i].y - currentY) <= threshold) {
      currentRow.push(sorted[i]);
    } else {
      rows.push(currentRow.sort((a, b) => a.x - b.x));
      currentRow = [sorted[i]];
      currentY = sorted[i].y;
    }
  }
  if (currentRow.length > 0) rows.push(currentRow.sort((a, b) => a.x - b.x));

  return rows;
}

// Convert clustered rows into string arrays
function rowsToStrings(rows: TextItem[][]): string[] {
  return rows
    .map(row => row.map(item => item.text.trim()).filter(Boolean).join("  "))
    .filter(Boolean);
}

// Find the header row that contains symbol + qty columns
function findHeaderRow(rows: TextItem[][]): number {
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const joined = rows[i].map(t => t.text).join(" ").toLowerCase();
    const hasSymbol = /symbol|ticker|stock|scrip|instrument|security|share/i.test(joined);
    const hasQty    = /qty|quantity|units|shares|holding/i.test(joined);
    if (hasSymbol && hasQty) return i;
  }
  return -1;
}

// Build column positions from a header row
interface ColDef { label: string; x: number }

function buildColDefs(headerRow: TextItem[]): ColDef[] {
  return headerRow
    .filter(t => t.text.trim())
    .map(t => ({ label: t.text.trim(), x: t.x }));
}

// Assign an item to the nearest column
function assignToCol(item: TextItem, cols: ColDef[]): string {
  let best = cols[0];
  let bestDist = Math.abs(item.x - best.x);
  for (const col of cols) {
    const d = Math.abs(item.x - col.x);
    if (d < bestDist) { best = col; bestDist = d; }
  }
  return best.label;
}

export async function parsePDF(file: File): Promise<ParseResult & { rawText: string }> {
  // Dynamic import so this only runs in the browser
  const pdfjsLib = await import("pdfjs-dist");

  // Point the worker at the versioned unpkg CDN build — no local bundling needed
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

  const allItems: TextItem[] = [];
  let rawText = "";

  // Extract text from all pages (cap at 15 to avoid hanging on huge PDFs)
  for (let p = 1; p <= Math.min(pdf.numPages, 15); p++) {
    const page     = await pdf.getPage(p);
    const content  = await page.getTextContent();

    for (const item of content.items) {
      if ("str" in item && item.str.trim()) {
        const tx = item.transform as number[];
        allItems.push({ text: item.str, x: tx[4], y: tx[5] });
        rawText += item.str + " ";
      }
    }
    rawText += "\n";
  }

  if (allItems.length === 0) {
    return { holdings: [], confidence: 0, detectedColumns: [], rawText: "" };
  }

  const rows   = clusterRows(allItems);
  const hdrIdx = findHeaderRow(rows);

  // ── Strategy A: structured table extraction ──────────────────────────────
  if (hdrIdx !== -1) {
    const colDefs = buildColDefs(rows[hdrIdx]);

    const dataRows: Record<string, string>[] = [];
    for (let i = hdrIdx + 1; i < rows.length; i++) {
      const row    = rows[i];
      const record: Record<string, string> = {};

      for (const item of row) {
        const col = assignToCol(item, colDefs);
        record[col] = ((record[col] ?? "") + " " + item.text).trim();
      }

      if (Object.keys(record).length > 1) dataRows.push(record);
    }

    if (dataRows.length > 0) {
      const { parseStructuredData } = await import("./csvXlsxParser");
      const result = parseStructuredData(dataRows);
      if (result.holdings.length > 0) {
        return {
          holdings:         result.holdings,
          confidence:       Math.max(result.confidence - 5, 0), // slight penalty vs direct CSV
          detectedColumns:  result.detectedColumns,
          rawText,
        };
      }
    }
  }

  // ── Strategy B: fall back to OCR-style text parsing ──────────────────────
  const lineStrings = rowsToStrings(rows);
  const { parseOCRText } = await import("./ocrParser");
  const holdings = parseOCRText(lineStrings.join("\n"));

  return {
    holdings,
    confidence:      holdings.length > 0 ? 55 : 0,
    detectedColumns: [],
    rawText,
  };
}
