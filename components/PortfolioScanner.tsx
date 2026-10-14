"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, X, Scan, Check, RefreshCw, AlertCircle,
  Plus, Trash2, FileText, Cpu, FileSpreadsheet, Shield,
} from "lucide-react";
import type { ParsedHolding } from "@/lib/ocrParser";

/* ── Types ─────────────────────────────────────────────────────────────── */

type ExtractionSource = "ocr" | "csv" | "xlsx" | "pdf";

interface ScannedHolding {
  _id:           string;
  ticker:        string;
  company_name:  string;
  quantity:      number;
  avg_price:     number | null;
  current_price: number | null;
  exchange:      string;
  sector:        string;
}

export interface ImportedHolding {
  ticker:   string;
  name:     string;
  exchange: string;
  sector:   string;
  quantity: number;
  avgPrice: number;
  notes?:   string;
}

interface PortfolioScannerProps {
  onClose:  () => void;
  onImport: (holdings: ImportedHolding[]) => Promise<void>;
}

/* ── Constants ──────────────────────────────────────────────────────────── */

const ACCEPTED_MIME = new Set([
  "image/jpeg", "image/png", "image/webp",
  "application/pdf",
  "text/csv", "application/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

const MAX_MB = 10;

function detectFileType(f: File): ExtractionSource | null {
  const name = f.name.toLowerCase();
  if (f.type.startsWith("image/") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".webp")) return "ocr";
  if (f.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (f.type === "text/csv" || f.type === "application/csv" || name.endsWith(".csv")) return "csv";
  if (
    f.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    f.type === "application/vnd.ms-excel" ||
    name.endsWith(".xlsx") || name.endsWith(".xls")
  ) return "xlsx";
  return null;
}

const OCR_STEPS = [
  "Uploading image…",
  "Enhancing contrast…",
  "Preparing OCR engine…",
  "Initialising Tesseract…",
  "Detecting text regions…",
  "Recognising characters…",
  "Parsing table structure…",
  "Matching NSE/BSE symbols…",
  "Normalising ticker codes…",
  "Finalising extraction…",
];

const SOURCE_META: Record<ExtractionSource, { label: string; badge: string; color: string }> = {
  ocr:  { label: "Tesseract OCR · Local · No API calls",        badge: "OCR",   color: "#FFD700" },
  csv:  { label: "Direct CSV parse · No API calls",             badge: "CSV",   color: "#00FF9C" },
  xlsx: { label: "Direct Excel parse · No API calls",           badge: "Excel", color: "#00C853" },
  pdf:  { label: "PDF table extraction · No API calls",         badge: "PDF",   color: "#7B9BFF" },
};

const BROKERS = [
  "Zerodha","Groww","Upstox","AngelOne","ICICI Direct",
  "Dhan","Paytm Money","Kotak","Sharekhan","INDmoney","5paisa",
];

/* ── EditableCell ───────────────────────────────────────────────────────── */

function EditableCell({
  value,
  onChange,
  type  = "text",
  align = "left",
}: {
  value:    string | number;
  onChange: (v: string) => void;
  type?:    "text" | "number";
  align?:   "left" | "right";
}) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(String(value ?? ""));
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  useEffect(() => { setDraft(String(value ?? "")); }, [value]);

  const commit = () => { onChange(draft); setEditing(false); };

  if (editing) {
    return (
      <input
        ref={ref}
        type={type}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
        className="w-full bg-transparent outline-none font-mono"
        style={{
          textAlign: align,
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--th-text-primary)",
          borderBottom: "1px solid #FFD700",
          minWidth: 50,
        }}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className="cursor-text font-mono transition-colors"
      style={{
        fontSize: "12px",
        fontWeight: 600,
        color: "var(--th-text-primary)",
        textAlign: align,
      }}
      title="Click to edit"
    >
      {(value !== null && value !== undefined && value !== "") ? value : "—"}
    </span>
  );
}

/* ── UploadZone ─────────────────────────────────────────────────────────── */

function UploadZone({
  onFile,
  error,
}: {
  onFile:  (f: File) => void;
  error:   string | null;
}) {
  const [dragging, setDragging] = useState(false);
  const [fileErr,  setFileErr]  = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = (f: File): string | null => {
    const ft = detectFileType(f);
    if (!ft) return "Format not supported. Use JPG, PNG, WEBP, PDF, CSV, or XLSX.";
    if (f.size > MAX_MB * 1024 * 1024) return `File too large — max ${MAX_MB} MB.`;
    return null;
  };

  const pick = (f: File) => {
    const err = validate(f);
    if (err) { setFileErr(err); return; }
    setFileErr(null);
    onFile(f);
  };

  const displayErr = error ?? fileErr;

  const FORMAT_GROUPS = [
    { formats: ["JPG", "PNG", "WEBP"],          label: "Screenshots",    color: "#FFD700" },
    { formats: ["CSV", "XLSX", "XLS"],          label: "Spreadsheets",   color: "#00FF9C" },
    { formats: ["PDF"],                          label: "Statements",     color: "#7B9BFF" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Drop zone */}
      <div
        onDragEnter={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={e => { e.preventDefault(); setDragging(false); }}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault(); setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) pick(f);
        }}
        onClick={() => inputRef.current?.click()}
        className="relative flex flex-col items-center justify-center gap-5 rounded-2xl cursor-pointer transition-all duration-300 select-none"
        style={{
          minHeight: 220,
          background: dragging ? "var(--primary-muted)" : "var(--muted)",
          border: `2px dashed ${dragging ? "var(--primary)" : "var(--border)"}`,
          color: dragging ? "var(--primary)" : "var(--th-text-muted)",
        }}
      >
        {dragging && ["top-0 left-0 border-l-2 border-t-2","top-0 right-0 border-r-2 border-t-2","bottom-0 left-0 border-l-2 border-b-2","bottom-0 right-0 border-r-2 border-b-2"].map((cls, i) => (
          <div key={i} className={`absolute w-5 h-5 border-[#FFD700] rounded-sm ${cls}`} />
        ))}

        <div className="p-2.5 rounded-full mb-3" style={{ background: dragging ? "var(--primary-muted)" : "var(--muted)", border: `1px solid ${dragging ? "var(--border-accent)" : "var(--border-muted)"}` }}>
          {dragging
            ? <Scan size={28} style={{ color: "#FFD700" }} />
            : <Upload size={28} style={{ color: "var(--th-text-faint)" }} />
          }
        </div>

        <div className="text-center px-6">
          <p className="text-[15px] font-bold mb-1" style={{ color: "var(--th-text-primary)", fontFamily: "var(--font-space-grotesk,sans-serif)" }}>
            {dragging ? "Drop to extract holdings" : "Upload portfolio file"}
          </p>
          <p className="text-[12px] font-mono" style={{ color: "var(--th-text-muted)" }}>
            {dragging ? "Release to begin extraction" : "Screenshot · CSV · Excel · PDF statement"}
          </p>
        </div>

        <div className="flex flex-col items-center gap-2">
          {FORMAT_GROUPS.map(group => (
            <div key={group.label} className="flex items-center gap-2">
              <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "var(--th-text-ultra-faint)", minWidth: 68, textAlign: "right" }}>
                {group.label}
              </span>
              <div className="flex gap-1.5">
                {group.formats.map(f => (
                  <span
                    key={f}
                    className="text-[9px] font-mono px-2 py-0.5 rounded-md"
                    style={{
                      color: group.color,
                      background: `${group.color}12`,
                      border: `1px solid ${group.color}30`,
                    }}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <span className="text-[9px] font-mono mt-0.5" style={{ color: "var(--th-text-ultra-faint)" }}>
            max {MAX_MB} MB
          </span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf,.csv,.xlsx,.xls"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ""; }}
        />
      </div>

      {displayErr && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
          style={{ background: "rgba(255,77,77,0.08)", border: "1px solid rgba(255,77,77,0.22)" }}
        >
          <AlertCircle size={13} style={{ color: "#FF4D4D", flexShrink: 0, marginTop: 1 }} />
          <span className="text-[11px] font-mono" style={{ color: "#FF4D4D" }}>{displayErr}</span>
        </motion.div>
      )}

      <div>
        <p className="text-[8.5px] font-mono uppercase tracking-[0.20em] mb-2" style={{ color: "var(--th-text-ultra-faint)" }}>
          Supported brokers
        </p>
        <div className="flex flex-wrap gap-1.5">
          {BROKERS.map(b => (
            <span
              key={b}
              className="text-[9.5px] font-mono px-2 py-0.5 rounded-lg"
              style={{
                color: "var(--th-text-faint)",
                background: "var(--muted)",
                border: "1px solid var(--border-muted)",
              }}
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── ScanningPhase ──────────────────────────────────────────────────────── */

function ScanningPhase({
  file,
  step,
  ocrProgress,
  ocrStatus,
  source,
}: {
  file: File;
  step: number;
  ocrProgress: number;
  ocrStatus: string;
  source: ExtractionSource;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const isImage = source === "ocr";

  useEffect(() => {
    if (!isImage) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  const meta = SOURCE_META[source];

  return (
    <div className="flex flex-col items-center gap-7 py-4">
      <div className="relative w-[300px]">
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            border:    "1px solid rgba(255,215,0,0.22)",
            boxShadow: "0 0 48px rgba(255,215,0,0.07), 0 0 0 1px rgba(255,215,0,0.08)",
          }}
        >
          {preview ? (
            <img
              src={preview}
              alt="Portfolio"
              className="w-full"
              style={{ maxHeight: 180, objectFit: "cover", objectPosition: "top", filter: "brightness(0.65) saturate(0.8)" }}
            />
          ) : (
            <div className="w-full h-[140px] flex flex-col items-center justify-center gap-3" style={{ background: `${meta.color}08` }}>
              {source === "xlsx" || source === "csv"
                ? <FileSpreadsheet size={44} style={{ color: `${meta.color}55` }} />
                : <FileText size={44} style={{ color: `${meta.color}55` }} />
              }
              <span className="text-[10px] font-mono" style={{ color: `${meta.color}88` }}>
                {file.name}
              </span>
            </div>
          )}

          {isImage && (
            <div
              className="absolute left-0 right-0 h-[2px] pointer-events-none"
              style={{
                background: "linear-gradient(90deg, transparent 0%, #FFD700 40%, #FFF8DC 50%, #FFD700 60%, transparent 100%)",
                boxShadow:  "0 0 8px #FFD700, 0 0 16px rgba(255,215,0,0.5), 0 0 2px #fff",
                animation:  "el-scan 2.2s cubic-bezier(0.4,0,0.2,1) infinite",
              }}
            />
          )}

          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(0deg, rgba(5,5,5,0.45) 0%, transparent 40%)" }} />
        </div>

        {["top-[-1px] left-[-1px] border-l-2 border-t-2 rounded-tl-xl","top-[-1px] right-[-1px] border-r-2 border-t-2 rounded-tr-xl","bottom-[-1px] left-[-1px] border-l-2 border-b-2 rounded-bl-xl","bottom-[-1px] right-[-1px] border-r-2 border-b-2 rounded-br-xl"].map((cls, i) => (
          <div
            key={i}
            className={`absolute w-5 h-5 border-[#FFD700] ${cls}`}
            style={{ animation: `el-glow ${0.6 + i * 0.15}s ease-in-out infinite alternate` }}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-4 w-full px-4">
        <div className="relative">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.25)", boxShadow: "0 0 24px rgba(255,215,0,0.10)" }}
          >
            <Cpu size={22} style={{ color: "#FFD700", animation: "spin 3.5s linear infinite" }} />
          </div>
          <div
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
            style={{ background: "#00FF9C", boxShadow: "0 0 8px #00FF9C", animation: "pulse 1.2s ease-in-out infinite" }}
          />
        </div>

        <div className="text-center w-full">
          <AnimatePresence mode="wait">
            <motion.p
              key={ocrStatus || step}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.22 }}
              className="text-[12px] font-mono font-semibold mb-1"
              style={{ color: "var(--th-text-secondary)" }}
            >
              {ocrStatus || OCR_STEPS[step % OCR_STEPS.length]}
            </motion.p>
          </AnimatePresence>
          <p className="text-[10px] font-mono" style={{ color: "var(--th-text-faint)" }}>
            {meta.label}
          </p>
        </div>

        {ocrProgress > 0 && (
          <div className="w-full">
            <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: "rgba(255,215,0,0.12)" }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${ocrProgress}%`, background: "linear-gradient(90deg, #FFD700, #FFF8DC)", boxShadow: "0 0 8px rgba(255,215,0,0.5)" }}
              />
            </div>
            <p className="text-[9px] font-mono text-right mt-1" style={{ color: "var(--th-text-faint)" }}>
              {ocrProgress}%
            </p>
          </div>
        )}

        {ocrProgress === 0 && (
          <div className="flex items-center gap-1.5">
            {[0, 1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="rounded-full"
                style={{
                  width:      i === step % 5 ? 18 : 5,
                  height:     5,
                  background: i === step % 5 ? "#FFD700" : "rgba(255,215,0,0.18)",
                  boxShadow:  i === step % 5 ? "0 0 8px rgba(255,215,0,0.5)" : "none",
                  transition: "all 0.35s ease",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── ConfidenceBadge ─────────────────────────────────────────────────────── */

function ConfidenceBadge({ confidence, source }: { confidence: number; source: ExtractionSource }) {
  const meta = SOURCE_META[source];
  const barColor =
    confidence >= 90 ? "#00FF9C" :
    confidence >= 70 ? "#FFD700" :
    confidence >= 50 ? "#FFA500" : "#FF4D4D";

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
      style={{ background: `${barColor}10`, border: `1px solid ${barColor}28` }}
    >
      <Shield size={11} style={{ color: barColor, flexShrink: 0 }} />
      <span className="text-[10px] font-mono font-bold" style={{ color: barColor }}>
        {confidence}% confidence
      </span>
      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${meta.color}20`, color: meta.color }}>
        {meta.badge}
      </span>
    </div>
  );
}

/* ── ReviewPhase ─────────────────────────────────────────────────────────── */

function ReviewPhase({
  holdings,
  setHoldings,
  onConfirm,
  onBack,
  importing,
  confidence,
  source,
}: {
  holdings:    ScannedHolding[];
  setHoldings: (h: ScannedHolding[]) => void;
  onConfirm:   () => void;
  onBack:      () => void;
  importing:   boolean;
  confidence:  number;
  source:      ExtractionSource;
}) {
  const update = useCallback(
    (id: string, field: keyof ScannedHolding, raw: string) => {
      setHoldings(
        holdings.map(h => {
          if (h._id !== id) return h;
          if (field === "quantity")  return { ...h, quantity:  Math.max(0, parseInt(raw)  || 0) };
          if (field === "avg_price") return { ...h, avg_price: parseFloat(raw) || null };
          return { ...h, [field]: raw };
        })
      );
    },
    [holdings, setHoldings]
  );

  const addRow = () =>
    setHoldings([...holdings, {
      _id: crypto.randomUUID(), ticker: "", company_name: "",
      quantity: 0, avg_price: null, current_price: null, exchange: "NSE", sector: "Other",
    }]);

  const valid = holdings.filter(h => h.ticker && h.quantity > 0).length;

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{ background: "rgba(255,215,0,0.09)", border: "1px solid rgba(255,215,0,0.22)" }}
          >
            <Check size={11} style={{ color: "#FFD700" }} />
            <span className="text-[11px] font-mono font-bold" style={{ color: "#FFD700" }}>
              {holdings.length} holdings detected
            </span>
          </div>
          <ConfidenceBadge confidence={confidence} source={source} />
        </div>
        <button
          onClick={addRow}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-all"
          style={{
            background: "var(--muted)",
            border:     "1px solid var(--border)",
            color:      "var(--th-text-primary)",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--th-text-primary)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-muted)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--th-text-secondary)";
          }}
        >
          <Plus size={10} /> Add Row
        </button>
      </div>

      {confidence < 70 && confidence > 0 && (
        <div
          className="flex items-start gap-2 px-3 py-2 rounded-lg flex-shrink-0"
          style={{ background: "rgba(255,165,0,0.08)", border: "1px solid rgba(255,165,0,0.22)" }}
        >
          <AlertCircle size={11} style={{ color: "#FFA500", flexShrink: 0, marginTop: 1 }} />
          <p className="text-[10px] font-mono" style={{ color: "#FFA500" }}>
            Low confidence extraction — some values may be incorrect. Review each row before importing.
          </p>
        </div>
      )}

      <p className="text-[10px] font-mono flex-shrink-0" style={{ color: "var(--th-text-faint)" }}>
        Click any cell to edit · Delete rows with ✗ · Add missing rows with + Add Row
      </p>

      <div
        className="overflow-auto rounded-xl flex-1"
        style={{
          background: "var(--th-bg-card)",
          border:    "1px solid var(--border)",
          maxHeight: "calc(55vh - 160px)",
          minHeight: 140,
        }}
      >
        <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 580 }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
            <tr
              style={{
                background:   "var(--muted)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {["#","COMPANY / TICKER","QTY","AVG PRICE","EXCH",""].map((h, i) => (
                <th
                  key={i}
                  className="text-left px-4 py-3"
                  style={{
                    fontFamily: "monospace",
                    fontSize: "10px",
                    fontWeight: 500,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase" as const,
                    color: "var(--th-text-faint)",
                    whiteSpace: "nowrap" as const,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {holdings.map((h, i) => (
              <tr
                key={h._id}
                className="transition-colors group"
                style={{ borderBottom: "1px solid var(--border-muted)" }}
                onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "var(--th-bg-row)"}
                onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}
              >
                <td className="px-4 py-4">
                  <span style={{ fontFamily: "monospace", fontSize: "9.5px", fontWeight: 400, color: "var(--th-text-ultra-faint)" }}>{i + 1}</span>
                </td>
                <td className="px-4 py-4" style={{ maxWidth: 200 }}>
                  <div className="flex flex-col gap-0.5">
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 190 }}>
                      <EditableCell
                        value={h.company_name || h.ticker}
                        onChange={v => update(h._id, "company_name", v)}
                      />
                    </div>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: "10px",
                        fontWeight: 400,
                        color: "var(--th-text-muted)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {h.ticker || "—"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <EditableCell
                    value={h.quantity}
                    onChange={v => update(h._id, "quantity", v)}
                    type="number"
                    align="right"
                  />
                </td>
                <td className="px-4 py-4">
                  <EditableCell
                    value={h.avg_price !== null ? h.avg_price.toFixed(2) : ""}
                    onChange={v => update(h._id, "avg_price", v)}
                    type="number"
                    align="right"
                  />
                </td>
                <td className="px-4 py-4">
                  <select
                    value={h.exchange}
                    onChange={e => update(h._id, "exchange", e.target.value)}
                    className="bg-transparent font-mono outline-none cursor-pointer"
                    style={{ fontSize: "11px", fontWeight: 400, color: "var(--th-text-muted)" }}
                  >
                    <option value="NSE">NSE</option>
                    <option value="BSE">BSE</option>
                  </select>
                </td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => setHoldings(holdings.filter(x => x._id !== h._id))}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all"
                    style={{ color: "var(--th-text-faint)" }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.color      = "#FF4D4D";
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,77,77,0.10)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.color      = "var(--th-text-faint)";
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }}
                  >
                    <Trash2 size={11} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-1 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-mono transition-all"
          style={{
            color:      "var(--th-text-muted)",
            background: "var(--muted)",
            border:     "1px solid var(--border)",
          }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "var(--th-text-primary)"}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "var(--th-text-muted)"}
        >
          <RefreshCw size={11} /> Upload Different File
        </button>

        <div className="flex items-center gap-2">
          {valid < holdings.length && (
            <span className="text-[10px] font-mono" style={{ color: "var(--th-text-faint)" }}>
              {holdings.length - valid} incomplete row{holdings.length - valid !== 1 ? "s" : ""} will be skipped
            </span>
          )}
          <button
            onClick={onConfirm}
            disabled={valid === 0 || importing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-mono font-bold transition-all"
            style={{
              background: valid === 0 || importing ? "rgba(255,215,0,0.25)" : "linear-gradient(135deg, #FFD700, #C9A227)",
              color:     "#050505",
              boxShadow: valid > 0 && !importing ? "0 4px 20px rgba(255,215,0,0.28)" : "none",
              cursor:    valid === 0 || importing ? "not-allowed" : "pointer",
            }}
          >
            {importing
              ? <><RefreshCw size={12} style={{ animation: "spin 0.8s linear infinite" }} /> Importing…</>
              : <><Check size={12} /> Import {valid} Holding{valid !== 1 ? "s" : ""}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Error messages per source ───────────────────────────────────────────── */

const EMPTY_REASON: Record<ExtractionSource, string> = {
  ocr:  "OCR read the image but found no recognisable stock rows. Tips: take a full-screen screenshot at 100% zoom, use light mode, ensure all holdings are visible.",
  csv:  "No valid holdings found in the CSV. Check that your file has Symbol, Qty, and Average Price columns. Try exporting again from your broker.",
  xlsx: "No valid holdings found in the Excel file. Make sure the correct sheet is selected and has Symbol, Qty, and Average Price columns.",
  pdf:  "No holdings table found in the PDF. Ensure it's a portfolio/holdings statement, not a contract note or capital gains report.",
};

const PARSE_ERROR_PREFIX: Record<ExtractionSource, string> = {
  ocr:  "Screenshot scan failed",
  csv:  "CSV parse error",
  xlsx: "Excel parse error",
  pdf:  "PDF read error",
};

/* ── PortfolioScanner (main) ─────────────────────────────────────────────── */

export function PortfolioScanner({ onClose, onImport }: PortfolioScannerProps) {
  const [phase,       setPhase]       = useState<"upload" | "scanning" | "reviewing">("upload");
  const [file,        setFile]        = useState<File | null>(null);
  const [fileSource,  setFileSource]  = useState<ExtractionSource>("ocr");
  const [scanStep,    setScanStep]    = useState(0);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus,   setOcrStatus]   = useState("");
  const [holdings,    setHoldings]    = useState<ScannedHolding[]>([]);
  const [confidence,  setConfidence]  = useState(0);
  const [apiError,    setApiError]    = useState<string | null>(null);
  const [debugReason, setDebugReason] = useState<string | null>(null);
  const [importing,   setImporting]   = useState(false);

  useEffect(() => {
    if (phase !== "scanning") return;
    const id = setInterval(() => setScanStep(s => s + 1), 900);
    return () => clearInterval(id);
  }, [phase]);

  const handleFile = useCallback(async (f: File) => {
    const source = detectFileType(f);
    if (!source) return;

    setFile(f);
    setFileSource(source);
    setPhase("scanning");
    setScanStep(0);
    setOcrProgress(0);
    setOcrStatus("Starting…");
    setApiError(null);
    setDebugReason(null);

    try {
      let parsedHoldings: ParsedHolding[] = [];
      let extractionConfidence = 0;

      if (source === "csv") {
        setOcrStatus("Parsing CSV…");
        setScanStep(2);
        const { parseCSV } = await import("@/lib/csvXlsxParser");
        const result = await parseCSV(f);
        parsedHoldings = result.holdings;
        extractionConfidence = result.confidence;
        setOcrStatus(`Parsed — ${result.holdings.length} rows found`);
        setScanStep(9);
      } else if (source === "xlsx") {
        setOcrStatus("Reading Excel file…");
        setScanStep(2);
        const { parseXLSX } = await import("@/lib/csvXlsxParser");
        const result = await parseXLSX(f);
        parsedHoldings = result.holdings;
        extractionConfidence = result.confidence;
        setOcrStatus(`Parsed — ${result.holdings.length} rows found`);
        setScanStep(9);
      } else if (source === "pdf") {
        setOcrStatus("Loading PDF…");
        setScanStep(2);
        const { parsePDF } = await import("@/lib/pdfTableParser");
        setOcrStatus("Extracting text from PDF…");
        setScanStep(4);
        const result = await parsePDF(f);
        parsedHoldings = result.holdings;
        extractionConfidence = result.confidence;
        setOcrStatus(`PDF parsed — ${result.holdings.length} holdings found`);
        setScanStep(9);
      } else {
        setOcrStatus("Uploading image…");
        const fd = new FormData();
        fd.append("file", f);
        const prepRes = await fetch("/api/portfolio/scan", { method: "POST", body: fd });
        if (!prepRes.ok) {
          const err = await prepRes.json().catch(() => ({ error: "Preprocessing failed" }));
          throw new Error(err.error ?? "Preprocessing failed");
        }
        setOcrStatus("Enhancing image with Sharp…");
        const prepData = await prepRes.json();
        const preprocessedBase64: string = prepData.image;
        const mimeType: string           = prepData.mimeType ?? "image/png";
        setOcrStatus("Loading OCR engine…");
        setScanStep(3);
        const { createWorker, PSM, OEM } = await import("tesseract.js");
        const worker = await createWorker("eng", OEM.LSTM_ONLY, {
          logger: (m: { status: string; progress: number }) => {
            if (m.status === "loading tesseract core") {
              setOcrStatus("Loading Tesseract core…");
            } else if (m.status === "loading language traineddata") {
              setOcrStatus("Loading English language data…");
              setScanStep(4);
            } else if (m.status === "initializing api") {
              setOcrStatus("Initialising OCR API…");
              setScanStep(4);
            } else if (m.status === "recognizing text") {
              const pct = Math.round(m.progress * 100);
              setOcrProgress(pct);
              setOcrStatus(`Recognising text… ${pct}%`);
              setScanStep(5 + Math.floor(m.progress * 3));
            }
          },
        });
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.AUTO,
          preserve_interword_spaces: "1",
        });
        setOcrStatus("Running OCR…");
        const binaryStr = atob(preprocessedBase64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
        const imgBlob = new Blob([bytes], { type: mimeType });
        const imgUrl  = URL.createObjectURL(imgBlob);
        const { data: { text, confidence: ocrConf } } = await worker.recognize(imgUrl);
        URL.revokeObjectURL(imgUrl);
        await worker.terminate();
        setScanStep(8);
        setOcrStatus(`OCR complete (${Math.round(ocrConf)}% confidence) — parsing…`);
        extractionConfidence = Math.round(ocrConf);
        const { parseOCRText } = await import("@/lib/ocrParser");
        parsedHoldings = parseOCRText(text);
        setScanStep(9);
      }
      setConfidence(extractionConfidence);
      const scanned: ScannedHolding[] = parsedHoldings.map(h => ({
        _id:           crypto.randomUUID(),
        ticker:        h.ticker,
        company_name:  h.company_name,
        quantity:      h.quantity,
        avg_price:     h.avg_price,
        current_price: h.current_price,
        exchange:      h.exchange,
        sector:        h.sector ?? "Other",
      }));
      if (scanned.length === 0) setDebugReason(EMPTY_REASON[source]);
      setHoldings(scanned);
      setPhase("reviewing");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setApiError(`${PARSE_ERROR_PREFIX[source]}: ${msg}`);
      setPhase("upload");
    }
  }, []);

  const handleImport = useCallback(async () => {
    setImporting(true);
    const valid = holdings.filter(h => h.ticker && h.quantity > 0);
    const mapped: ImportedHolding[] = valid.map(h => ({
      ticker:   h.ticker.toUpperCase(),
      name:     h.company_name || h.ticker,
      exchange: h.exchange     || "NSE",
      sector:   h.sector       || "Other",
      quantity: h.quantity,
      avgPrice: h.avg_price ?? 0,
    }));
    await onImport(mapped);
    setImporting(false);
    onClose();
  }, [holdings, onImport, onClose]);

  const resetToUpload = useCallback(() => {
    setApiError(null);
    setDebugReason(null);
    setOcrProgress(0);
    setOcrStatus("");
    setConfidence(0);
    setPhase("upload");
  }, []);

  const phaseLabels = ["Upload", "Scan", "Review"] as const;
  const phaseIdx    = phase === "upload" ? 0 : phase === "scanning" ? 1 : 2;
  const headerSubtitle = phase === "upload" ? "Screenshot · CSV · Excel · PDF statement" : phase === "scanning" ? `Extracting holdings from ${file?.name ?? "file"}…` : `${holdings.length} holdings detected — verify before importing`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(14px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        @keyframes el-scan {
          0%   { top: 0%; }
          48%  { top: calc(100% - 2px); }
          52%  { top: calc(100% - 2px); }
          100% { top: 0%; }
        }
        @keyframes el-glow {
          from { opacity: 0.5; }
          to   { opacity: 1;   }
        }
      `}</style>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 14 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{ opacity: 0, scale: 0.95, y: 14 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="relative w-full flex flex-col"
        style={{
          maxWidth:     680,
          maxHeight:    "90vh",
          background:   "var(--th-bg-overlay)",
          borderLeft:   "1px solid var(--border)",
          boxShadow:    "0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,215,0,0.06)",
          borderRadius: 20,
          overflow:     "hidden",
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,215,0,0.10)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,215,0,0.10)", border: "1px solid rgba(255,215,0,0.28)" }}
            >
              <Scan size={16} style={{ color: "#FFD700" }} />
            </div>
            <div>
              <h2
                className="text-[15px] font-bold leading-tight"
                style={{ color: "var(--th-text-primary)", fontFamily: "var(--font-space-grotesk,sans-serif)" }}
              >
                Portfolio Scanner
              </h2>
              <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--th-text-faint)" }}>
                {headerSubtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5">
              {phaseLabels.map((label, i) => {
                const done   = i < phaseIdx;
                const active = i === phaseIdx;
                return (
                  <div key={label} className="flex items-center gap-1.5">
                    {i > 0 && (
                      <div className="w-5 h-px" style={{ background: done ? "var(--primary-muted)" : "var(--border-muted)" }} />
                    )}
                    <div className="flex items-center gap-1">
                      <div
                        className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px] font-mono font-bold"
                        style={{
                          background: done ? "var(--primary)" : active ? "var(--primary-muted)" : "var(--muted)",
                          border:     done || active ? "1px solid var(--border-accent)" : "1px solid var(--border-muted)",
                          color:      done ? "var(--background)" : active ? "var(--primary)" : "var(--th-text-muted)"
                        }}
                      >
                        {done ? "✓" : i + 1}
                      </div>
                      <span className="text-[9px] font-mono" style={{ color: active ? "#FFD700" : "var(--th-text-ultra-faint)" }}>
                        {label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: "var(--th-text-faint)" }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color      = "var(--th-text-primary)";
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color      = "var(--th-text-faint)";
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-auto px-6 py-5">
          <AnimatePresence mode="wait">
            {phase === "upload" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
              >
                <UploadZone onFile={handleFile} error={apiError} />
              </motion.div>
            )}

            {phase === "scanning" && file && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.18 }}
              >
                <ScanningPhase
                  file={file}
                  step={scanStep}
                  ocrProgress={ocrProgress}
                  ocrStatus={ocrStatus}
                  source={fileSource}
                />
              </motion.div>
            )}

            {phase === "reviewing" && (
              <motion.div
                key="reviewing"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.18 }}
                className="h-full"
              >
                {holdings.length === 0 ? (
                  <div className="flex flex-col items-center gap-5 py-12 text-center">
                    <AlertCircle size={36} style={{ color: "var(--th-text-ultra-faint)" }} />
                    <div>
                      <p
                        className="text-[14px] font-semibold mb-2"
                        style={{ color: "var(--th-text-secondary)", fontFamily: "var(--font-space-grotesk,sans-serif)" }}
                      >
                        No holdings detected
                      </p>
                      <p className="text-[11px] font-mono max-w-sm mx-auto leading-relaxed" style={{ color: "var(--th-text-muted)" }}>
                        {debugReason ?? EMPTY_REASON[fileSource]}
                      </p>
                    </div>

                    {/* Retry tips per source */}
                    {fileSource === "ocr" && (
                      <div
                        className="text-left px-4 py-3 rounded-xl max-w-sm w-full"
                        style={{ background: "rgba(255,215,0,0.05)", border: "1px solid rgba(255,215,0,0.14)" }}
                      >
                        <p className="text-[9.5px] font-mono font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(255,215,0,0.5)" }}>
                          Better results with
                        </p>
                        {["Export CSV from broker app instead","Full-screen screenshot with all holdings visible","Light mode screenshot at 100% zoom"].map(tip => (
                          <p key={tip} className="text-[10px] font-mono mb-1 flex items-start gap-1.5" style={{ color: "var(--th-text-faint)" }}>
                            <span style={{ color: "#FFD700" }}>›</span> {tip}
                          </p>
                        ))}
                      </div>
                    )}

                    {(fileSource === "csv" || fileSource === "xlsx") && (
                      <div
                        className="text-left px-4 py-3 rounded-xl max-w-sm w-full"
                        style={{ background: "rgba(0,255,156,0.05)", border: "1px solid rgba(0,255,156,0.14)" }}
                      >
                        <p className="text-[9.5px] font-mono font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(0,255,156,0.5)" }}>
                          Required columns
                        </p>
                        {["Symbol / Ticker / Stock","Qty / Quantity / Units","Avg Price / Avg Cost (optional)"].map(col => (
                          <p key={col} className="text-[10px] font-mono mb-1 flex items-start gap-1.5" style={{ color: "var(--th-text-faint)" }}>
                            <span style={{ color: "#00FF9C" }}>›</span> {col}
                          </p>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={resetToUpload}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-mono font-bold transition-all"
                      style={{
                        background: "rgba(255,215,0,0.09)",
                        border:     "1px solid rgba(255,215,0,0.28)",
                        color:      "#FFD700",
                      }}
                    >
                      <RefreshCw size={12} /> Try a Different File
                    </button>
                  </div>
                ) : (
                  <ReviewPhase
                    holdings={holdings}
                    setHoldings={setHoldings}
                    onConfirm={handleImport}
                    onBack={resetToUpload}
                    importing={importing}
                    confidence={confidence}
                    source={fileSource}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Gold strip */}
        <div
          className="flex-shrink-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,215,0,0.22), transparent)" }}
        />
      </motion.div>
    </motion.div>
  );
}
