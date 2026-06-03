"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, X, Scan, Check, RefreshCw, AlertCircle,
  Plus, Trash2, FileText, Cpu,
} from "lucide-react";

/* ── Image preprocessing ────────────────────────────────────────────────── */

async function preprocessImage(file: File): Promise<File> {
  // PDFs skip preprocessing
  if (file.type === "application/pdf") return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Cap size at 2400px on longest side for faster upload + better OCR
      const MAX = 2400;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Sample brightness on a grid to detect dark mode
      let totalBrightness = 0;
      const step = Math.max(1, Math.floor(data.length / (4 * 2000)));
      let samples = 0;
      for (let i = 0; i < data.length; i += 4 * step) {
        totalBrightness += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        samples++;
      }
      const avgBrightness = totalBrightness / samples;
      const isDark = avgBrightness < 100;

      // Contrast factor: dark screenshots need more boost
      const contrast  = isDark ? 1.6 : 1.25;
      const brightness = isDark ? 35 : 10;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i + 1], b = data[i + 2];

        // Contrast stretch around midpoint
        r = Math.min(255, Math.max(0, (r - 128) * contrast + 128 + brightness));
        g = Math.min(255, Math.max(0, (g - 128) * contrast + 128 + brightness));
        b = Math.min(255, Math.max(0, (b - 128) * contrast + 128 + brightness));

        data[i]     = r;
        data[i + 1] = g;
        data[i + 2] = b;
      }

      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.92
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

/* ── Types ─────────────────────────────────────────────────────────────── */

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
  isLight:  boolean;
  onClose:  () => void;
  onImport: (holdings: ImportedHolding[]) => Promise<void>;
}

/* ── Constants ──────────────────────────────────────────────────────────── */

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
const MAX_MB   = 8;

const SCAN_STEPS = [
  "Reading image pixels…",
  "Detecting portfolio layout…",
  "Extracting holdings data…",
  "Matching NSE/BSE symbols…",
  "Normalising ticker codes…",
  "Parsing quantity values…",
  "Calculating average prices…",
  "Cross-referencing company names…",
  "Verifying stock symbols…",
  "Finalising extraction…",
];

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
        className="w-full bg-transparent outline-none font-mono text-[11px]"
        style={{
          textAlign: align,
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
      className="cursor-text font-mono text-[11px] transition-colors"
      style={{ color: "var(--th-text-primary)", textAlign: align }}
      title="Click to edit"
    >
      {(value !== null && value !== undefined && value !== "") ? value : "—"}
    </span>
  );
}

/* ── UploadZone ─────────────────────────────────────────────────────────── */

function UploadZone({
  onFile,
  isLight,
  error,
}: {
  onFile:  (f: File) => void;
  isLight: boolean;
  error:   string | null;
}) {
  const [dragging, setDragging] = useState(false);
  const [fileErr,  setFileErr]  = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = (f: File): string | null => {
    if (!ACCEPTED.includes(f.type)) return "Format not supported. Use JPG, PNG, WEBP or PDF.";
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
          minHeight: 240,
          background: dragging
            ? isLight ? "rgba(184,150,46,0.07)" : "rgba(255,215,0,0.05)"
            : isLight ? "rgba(0,0,0,0.015)"   : "rgba(255,255,255,0.015)",
          border: `2px dashed ${dragging ? "#FFD700" : isLight ? "rgba(0,0,0,0.16)" : "rgba(255,255,255,0.10)"}`,
          boxShadow: dragging ? "0 0 48px rgba(255,215,0,0.10) inset" : "none",
        }}
      >
        {/* Corner brackets when dragging */}
        {dragging && ["top-0 left-0 border-l-2 border-t-2","top-0 right-0 border-r-2 border-t-2","bottom-0 left-0 border-l-2 border-b-2","bottom-0 right-0 border-r-2 border-b-2"].map((cls, i) => (
          <div key={i} className={`absolute w-5 h-5 border-[#FFD700] rounded-sm ${cls}`} />
        ))}

        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300"
          style={{
            background: dragging ? "rgba(255,215,0,0.14)" : isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${dragging ? "rgba(255,215,0,0.40)" : isLight ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.07)"}`,
            boxShadow: dragging ? "0 0 24px rgba(255,215,0,0.15)" : "none",
          }}
        >
          {dragging
            ? <Scan size={28} style={{ color: "#FFD700" }} />
            : <Upload size={28} style={{ color: "var(--th-text-faint)" }} />
          }
        </div>

        <div className="text-center px-6">
          <p
            className="text-[15px] font-bold mb-1"
            style={{ color: "var(--th-text-primary)", fontFamily: "var(--font-space-grotesk,sans-serif)" }}
          >
            {dragging ? "Drop to start AI scan" : "Drop portfolio screenshot here"}
          </p>
          <p className="text-[12px] font-mono" style={{ color: "var(--th-text-muted)" }}>
            {dragging ? "Release to begin extraction" : "or click to browse files"}
          </p>
        </div>

        {/* Format badges */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {["JPG","PNG","WEBP","PDF"].map(f => (
            <span
              key={f}
              className="text-[9px] font-mono px-2.5 py-0.5 rounded-md"
              style={{
                color: "var(--th-text-faint)",
                background: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)",
                border: isLight ? "1px solid rgba(0,0,0,0.09)" : "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {f}
            </span>
          ))}
          <span className="text-[9px] font-mono" style={{ color: "var(--th-text-ultra-faint)" }}>
            max {MAX_MB} MB
          </span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ""; }}
        />
      </div>

      {/* Error */}
      {displayErr && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
          style={{ background: "rgba(255,77,77,0.08)", border: "1px solid rgba(255,77,77,0.22)" }}
        >
          <AlertCircle size={13} style={{ color: "#FF4D4D", flexShrink: 0 }} />
          <span className="text-[11px] font-mono" style={{ color: "#FF4D4D" }}>{displayErr}</span>
        </motion.div>
      )}

      {/* Supported brokers */}
      <div>
        <p
          className="text-[8.5px] font-mono uppercase tracking-[0.20em] mb-2"
          style={{ color: "var(--th-text-ultra-faint)" }}
        >
          Supported brokers
        </p>
        <div className="flex flex-wrap gap-1.5">
          {BROKERS.map(b => (
            <span
              key={b}
              className="text-[9.5px] font-mono px-2 py-0.5 rounded-lg"
              style={{
                color: "var(--th-text-faint)",
                background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)",
                border: isLight ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(255,255,255,0.06)",
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

function ScanningPhase({ file, step }: { file: File; step: number }) {
  const [preview, setPreview] = useState<string | null>(null);
  const isPDF = file.type === "application/pdf";

  useEffect(() => {
    if (isPDF) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isPDF]);

  return (
    <div className="flex flex-col items-center gap-7 py-4">
      {/* File preview with scanner beam */}
      <div className="relative w-[300px]">
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            border:     "1px solid rgba(255,215,0,0.22)",
            boxShadow:  "0 0 48px rgba(255,215,0,0.07), 0 0 0 1px rgba(255,215,0,0.08)",
          }}
        >
          {preview ? (
            <img
              src={preview}
              alt="Portfolio"
              className="w-full"
              style={{
                maxHeight: 200,
                objectFit: "cover",
                objectPosition: "top",
                filter: "brightness(0.65) saturate(0.8)",
              }}
            />
          ) : (
            <div
              className="w-full h-[160px] flex items-center justify-center"
              style={{ background: "rgba(255,215,0,0.04)" }}
            >
              <FileText size={44} style={{ color: "rgba(255,215,0,0.22)" }} />
            </div>
          )}

          {/* Scanner beam */}
          <div
            className="absolute left-0 right-0 h-[2px] pointer-events-none"
            style={{
              background: "linear-gradient(90deg, transparent 0%, #FFD700 40%, #FFF8DC 50%, #FFD700 60%, transparent 100%)",
              boxShadow:  "0 0 8px #FFD700, 0 0 16px rgba(255,215,0,0.5), 0 0 2px #fff",
              animation:  "rhtih-scan 2.2s cubic-bezier(0.4,0,0.2,1) infinite",
            }}
          />

          {/* Overlay tint */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(0deg, rgba(5,5,5,0.55) 0%, transparent 35%, rgba(5,5,5,0.15) 100%)",
            }}
          />
        </div>

        {/* Corner brackets */}
        {[
          "top-[-1px] left-[-1px] border-l-2 border-t-2 rounded-tl-xl",
          "top-[-1px] right-[-1px] border-r-2 border-t-2 rounded-tr-xl",
          "bottom-[-1px] left-[-1px] border-l-2 border-b-2 rounded-bl-xl",
          "bottom-[-1px] right-[-1px] border-r-2 border-b-2 rounded-br-xl",
        ].map((cls, i) => (
          <div
            key={i}
            className={`absolute w-5 h-5 border-[#FFD700] ${cls}`}
            style={{ animation: `rhtih-glow ${0.6 + i * 0.15}s ease-in-out infinite alternate` }}
          />
        ))}
      </div>

      {/* AI indicator */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: "rgba(255,215,0,0.08)",
              border:     "1px solid rgba(255,215,0,0.25)",
              boxShadow:  "0 0 24px rgba(255,215,0,0.10)",
            }}
          >
            <Cpu
              size={22}
              style={{ color: "#FFD700", animation: "spin 3.5s linear infinite" }}
            />
          </div>
          {/* Live dot */}
          <div
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
            style={{
              background: "#00FF9C",
              boxShadow:  "0 0 8px #00FF9C",
              animation:  "pulse 1.2s ease-in-out infinite",
            }}
          />
        </div>

        {/* Cycling step text */}
        <div className="text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={step}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.22 }}
              className="text-[13px] font-mono font-semibold mb-1"
              style={{ color: "var(--th-text-secondary)" }}
            >
              {SCAN_STEPS[step % SCAN_STEPS.length]}
            </motion.p>
          </AnimatePresence>
          <p className="text-[10px] font-mono" style={{ color: "var(--th-text-faint)" }}>
            Claude AI · Multi-agent portfolio extraction
          </p>
        </div>

        {/* Animated progress strip */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="rounded-full transition-all duration-400"
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
      </div>
    </div>
  );
}

/* ── ReviewPhase ─────────────────────────────────────────────────────────── */

function ReviewPhase({
  holdings,
  setHoldings,
  onConfirm,
  onBack,
  isLight,
  importing,
}: {
  holdings:    ScannedHolding[];
  setHoldings: (h: ScannedHolding[]) => void;
  onConfirm:   () => void;
  onBack:      () => void;
  isLight:     boolean;
  importing:   boolean;
}) {
  const update = useCallback(
    (id: string, field: keyof ScannedHolding, raw: string) => {
      setHoldings(
        holdings.map(h => {
          if (h._id !== id) return h;
          if (field === "quantity")  return { ...h, quantity:  Math.max(0, parseInt(raw)  || 0)  };
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
    <div className="flex flex-col gap-4 h-full">
      {/* Header stats row */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{ background: "rgba(255,215,0,0.09)", border: "1px solid rgba(255,215,0,0.22)" }}
          >
            <Check size={11} style={{ color: "#FFD700" }} />
            <span className="text-[11px] font-mono font-bold" style={{ color: "#FFD700" }}>
              {holdings.length} holdings detected
            </span>
          </div>
          <span className="hidden sm:block text-[10px] font-mono" style={{ color: "var(--th-text-faint)" }}>
            Click any cell to edit · Review before importing
          </span>
        </div>
        <button
          onClick={addRow}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-all"
          style={{
            color:      "var(--th-text-muted)",
            background: isLight ? "rgba(0,0,0,0.04)"  : "rgba(255,255,255,0.04)",
            border:     isLight ? "1px solid rgba(0,0,0,0.10)" : "1px solid rgba(255,255,255,0.07)",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color       = "var(--gold)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,215,0,0.30)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color       = "var(--th-text-muted)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = isLight ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.07)";
          }}
        >
          <Plus size={10} /> Add Row
        </button>
      </div>

      {/* Table */}
      <div
        className="overflow-auto rounded-xl flex-1"
        style={{
          border:     `1px solid ${isLight ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.07)"}`,
          maxHeight:  "calc(55vh - 130px)",
          minHeight:  160,
        }}
      >
        <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 580 }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
            <tr
              style={{
                background:   isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)",
                borderBottom: `1px solid ${isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)"}`,
              }}
            >
              {["#","TICKER","COMPANY","QTY","AVG PRICE","EXCH",""].map((h, i) => (
                <th
                  key={i}
                  className="text-left px-3 py-2.5 text-[8px] font-mono font-bold uppercase tracking-[0.16em]"
                  style={{ color: "var(--th-text-faint)", whiteSpace: "nowrap" }}
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
                className="group transition-colors"
                style={{ borderBottom: `1px solid ${isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.04)"}` }}
                onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = isLight ? "rgba(0,0,0,0.018)" : "rgba(255,255,255,0.018)"}
                onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}
              >
                <td className="px-3 py-2.5">
                  <span className="text-[9.5px] font-mono" style={{ color: "var(--th-text-ultra-faint)" }}>{i + 1}</span>
                </td>
                <td className="px-3 py-2.5">
                  <EditableCell
                    value={h.ticker}
                    onChange={v => update(h._id, "ticker", v.toUpperCase().trim())}
                  />
                </td>
                <td className="px-3 py-2.5" style={{ maxWidth: 160 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>
                    <EditableCell
                      value={h.company_name}
                      onChange={v => update(h._id, "company_name", v)}
                    />
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <EditableCell
                    value={h.quantity}
                    onChange={v => update(h._id, "quantity", v)}
                    type="number"
                    align="right"
                  />
                </td>
                <td className="px-3 py-2.5">
                  <EditableCell
                    value={h.avg_price !== null ? h.avg_price.toFixed(2) : ""}
                    onChange={v => update(h._id, "avg_price", v)}
                    type="number"
                    align="right"
                  />
                </td>
                <td className="px-3 py-2.5">
                  <select
                    value={h.exchange}
                    onChange={e => update(h._id, "exchange", e.target.value)}
                    className="bg-transparent font-mono text-[11px] outline-none cursor-pointer"
                    style={{ color: "var(--th-text-muted)" }}
                  >
                    <option value="NSE">NSE</option>
                    <option value="BSE">BSE</option>
                  </select>
                </td>
                <td className="px-3 py-2.5">
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

      {/* Footer buttons */}
      <div className="flex items-center justify-between pt-1 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-mono transition-all"
          style={{
            color:      "var(--th-text-muted)",
            background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)",
            border:     isLight ? "1px solid rgba(0,0,0,0.10)" : "1px solid rgba(255,255,255,0.07)",
          }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "var(--th-text-primary)"}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "var(--th-text-muted)"}
        >
          <RefreshCw size={11} /> Rescan
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
              background: valid === 0 || importing
                ? "rgba(255,215,0,0.25)"
                : "linear-gradient(135deg, #FFD700, #C9A227)",
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

/* ── PortfolioScanner (main) ─────────────────────────────────────────────── */

export function PortfolioScanner({ isLight, onClose, onImport }: PortfolioScannerProps) {
  const [phase,      setPhase]     = useState<"upload" | "scanning" | "reviewing">("upload");
  const [file,       setFile]      = useState<File | null>(null);
  const [scanStep,   setScanStep]  = useState(0);
  const [holdings,   setHoldings]  = useState<ScannedHolding[]>([]);
  const [apiError,   setApiError]  = useState<string | null>(null);
  const [debugReason, setDebugReason] = useState<string | null>(null);
  const [importing,  setImporting] = useState(false);

  /* Advance scan step every 800 ms */
  useEffect(() => {
    if (phase !== "scanning") return;
    const id = setInterval(() => setScanStep(s => s + 1), 800);
    return () => clearInterval(id);
  }, [phase]);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setPhase("scanning");
    setScanStep(0);
    setApiError(null);

    try {
      // Preprocess image: enhance contrast for dark-mode broker screenshots
      const processed = await preprocessImage(f);

      const fd = new FormData();
      fd.append("file", processed);

      const res  = await fetch("/api/portfolio/scan", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok || data.error) {
        const msg = data.error ?? "Scan failed — please try again.";
        setApiError(msg);
        setPhase("upload");
        return;
      }

      const parsed: ScannedHolding[] = (Array.isArray(data.holdings) ? data.holdings : []).map((h: Record<string, unknown>) => ({
        _id:           crypto.randomUUID(),
        ticker:        String(h.ticker        ?? ""),
        company_name:  String(h.company_name  ?? ""),
        quantity:      Math.max(0, parseInt(String(h.quantity ?? "0")) || 0),
        avg_price:     h.avg_price     != null ? parseFloat(String(h.avg_price))     : null,
        current_price: h.current_price != null ? parseFloat(String(h.current_price)) : null,
        exchange:      String(h.exchange ?? "NSE"),
        sector:        String(h.sector   ?? "Other"),
      }));

      setDebugReason(data.debug_reason ?? null);
      setHoldings(parsed);
      setPhase("reviewing");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      setApiError(`${msg} — check your connection and try again.`);
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

  const phaseLabels = ["Upload", "Scan", "Review"] as const;
  const phaseIdx    = phase === "upload" ? 0 : phase === "scanning" ? 1 : 2;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(14px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Global keyframes */}
      <style>{`
        @keyframes rhtih-scan {
          0%   { top: 0%; }
          48%  { top: calc(100% - 2px); }
          52%  { top: calc(100% - 2px); }
          100% { top: 0%; }
        }
        @keyframes rhtih-glow {
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
          maxWidth:   680,
          maxHeight:  "90vh",
          background: isLight ? "rgba(255,252,245,0.99)" : "rgba(7,7,7,0.99)",
          border:     "1px solid rgba(255,215,0,0.18)",
          boxShadow:  "0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,215,0,0.06)",
          borderRadius: 20,
          overflow:   "hidden",
        }}
      >
        {/* ── Header ── */}
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
                AI Portfolio Scanner
              </h2>
              <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--th-text-faint)" }}>
                {phase === "upload"    && "Upload broker screenshot — Zerodha, Groww, AngelOne & more"}
                {phase === "scanning"  && "Claude AI is extracting your holdings…"}
                {phase === "reviewing" && `${holdings.length} holdings detected — verify & import`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Step indicator */}
            <div className="hidden sm:flex items-center gap-1.5">
              {phaseLabels.map((label, i) => {
                const done   = i < phaseIdx;
                const active = i === phaseIdx;
                return (
                  <div key={label} className="flex items-center gap-1.5">
                    {i > 0 && (
                      <div
                        className="w-5 h-px"
                        style={{ background: done ? "rgba(255,215,0,0.45)" : "rgba(255,255,255,0.08)" }}
                      />
                    )}
                    <div className="flex items-center gap-1">
                      <div
                        className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px] font-mono font-bold"
                        style={{
                          background: done ? "#FFD700" : active ? "rgba(255,215,0,0.18)" : "rgba(255,255,255,0.05)",
                          border:     done || active ? "1px solid rgba(255,215,0,0.50)" : "1px solid rgba(255,255,255,0.10)",
                          color:      done ? "#050505" : active ? "#FFD700" : "var(--th-text-ultra-faint)",
                        }}
                      >
                        {done ? "✓" : i + 1}
                      </div>
                      <span
                        className="text-[9px] font-mono"
                        style={{ color: active ? "#FFD700" : "var(--th-text-ultra-faint)" }}
                      >
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
                <UploadZone onFile={handleFile} isLight={isLight} error={apiError} />
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
                <ScanningPhase file={file} step={scanStep} />
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
                  <div className="flex flex-col items-center gap-5 py-14 text-center">
                    <AlertCircle size={36} style={{ color: "var(--th-text-ultra-faint)" }} />
                    <div>
                      <p className="text-[14px] font-semibold mb-1.5" style={{ color: "var(--th-text-secondary)", fontFamily: "var(--font-space-grotesk,sans-serif)" }}>
                        No holdings detected
                      </p>
                      <p className="text-[11px] font-mono max-w-xs mx-auto" style={{ color: "var(--th-text-muted)" }}>
                        {debugReason ?? "The image may not contain a recognisable portfolio table. Try a full-screen, high-resolution screenshot with holdings clearly visible."}
                      </p>
                      <p className="text-[10px] font-mono mt-2 max-w-xs mx-auto" style={{ color: "var(--th-text-faint)" }}>
                        Tips: scroll to show all holdings, take screenshot at 100% zoom, avoid cropping the table.
                      </p>
                    </div>
                    <button
                      onClick={() => { setApiError(null); setDebugReason(null); setPhase("upload"); }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-mono font-bold transition-all"
                      style={{
                        background: "rgba(255,215,0,0.09)",
                        border:     "1px solid rgba(255,215,0,0.28)",
                        color:      "#FFD700",
                      }}
                    >
                      <RefreshCw size={12} /> Try Another Image
                    </button>
                  </div>
                ) : (
                  <ReviewPhase
                    holdings={holdings}
                    setHoldings={setHoldings}
                    onConfirm={handleImport}
                    onBack={() => { setApiError(null); setPhase("upload"); }}
                    isLight={isLight}
                    importing={importing}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Ambient gold glow strip at bottom */}
        <div
          className="flex-shrink-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,215,0,0.22), transparent)" }}
        />
      </motion.div>
    </motion.div>
  );
}
