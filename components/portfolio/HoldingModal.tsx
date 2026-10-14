"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, X } from "lucide-react";
import { TickerSearchInput, SelectedStockChip } from "@/components/TickerSearch";
import type { PortfolioHolding } from "@/store/portfolioStore";
import type { SearchResult as ApiSearchResult } from "@/lib/types";
import { SECTORS_LIST } from "@/features/portfolio/sectors";

/** Add / edit a holding. Moved unchanged from app/portfolio/page.tsx. */
export function HoldingModal({
  onClose, onSubmit, initial,
}: {
  onClose:  () => void;
  onSubmit: (h: Omit<PortfolioHolding, "id" | "addedAt">) => void;
  initial?: PortfolioHolding;
}) {
  const [selected, setSelected] = useState<ApiSearchResult | null>(null);
  const [form, setForm] = useState({
    ticker:   initial?.ticker   ?? "",
    name:     initial?.name     ?? "",
    exchange: initial?.exchange ?? "NSE",
    sector:   initial?.sector   ?? "",
    quantity: initial?.quantity?.toString() ?? "",
    avgPrice: initial?.avgPrice?.toString() ?? "",
    notes:    initial?.notes    ?? "",
  });

  const handleSelect = (r: ApiSearchResult) => {
    setSelected(r);
    setForm(f => ({
      ...f,
      ticker:   r.ticker,
      name:     r.company_name,
      exchange: r.exchange ?? "NSE",
      sector:   (r.sector && r.sector !== "Unknown") ? r.sector : f.sector,
      avgPrice: r.current_price != null ? r.current_price.toFixed(2) : f.avgPrice,
    }));
  };

  const handleClear = () => {
    setSelected(null);
    setForm(f => ({ ...f, ticker: "", name: "", sector: "", avgPrice: "" }));
  };

  const handleSubmit = () => {
    const qty = parseFloat(form.quantity);
    const avg = parseFloat(form.avgPrice);
    if (!form.ticker || !form.name || isNaN(qty) || isNaN(avg) || qty <= 0 || avg <= 0) return;
    onSubmit({
      ticker:   form.ticker,
      name:     form.name,
      exchange: form.exchange,
      sector:   form.sector || "Other",
      quantity: qty,
      avgPrice: avg,
      notes:    form.notes || undefined,
    });
    onClose();
  };

  const isReady = !!initial || selected !== null;

  const inputStyle: React.CSSProperties = {
    background:   "var(--th-bg-secondary)",
    border:       `1px solid var(--th-border-card)`,
    borderRadius: "8px",
    padding:      "8px 12px",
    fontSize:     "12px",
    fontFamily:   "var(--font-mono, monospace)",
    color:        "var(--th-text-primary)",
    width:        "100%",
    outline:      "none",
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <motion.div
        initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 12 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="w-full max-w-md rounded-2xl p-6 overflow-y-auto"
        style={{
          background:  "var(--th-bg-card)",
          border:      "1px solid var(--th-border-accent)",
          boxShadow:   "0 24px 80px rgba(0,0,0,0.8)",
          maxHeight:   "92vh",
        }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "var(--th-gold-bg-mid)", border: "1px solid var(--th-border-accent)" }}>
              <Wallet size={12} style={{ color: "var(--gold)" }} />
            </div>
            <span className="text-[13px] font-semibold" style={{ color: "var(--th-text-primary)" }}>
              {initial ? "Edit Position" : "Add Holding"}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--th-text-faint)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--th-text-primary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--th-text-faint)")}>
            <X size={14} />
          </button>
        </div>

        {/* Stock selection area */}
        <div className="mb-4">
          <label className="block text-[9px] font-mono uppercase tracking-widest mb-1.5"
            style={{ color: "var(--th-text-faint)" }}>
            {initial ? "Position" : selected ? "Selected Stock" : "Search Stock"}
          </label>

          {initial ? (
            /* Edit mode: static read-only chip */
            <div className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "var(--th-bg-secondary)", border: "1px solid var(--th-border-card)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[9px] font-bold"
                style={{ background: "var(--th-gold-bg-mid)", border: "1px solid var(--th-border-accent)", color: "var(--gold)" }}>
                {initial.ticker.slice(0, 3)}
              </div>
              <div>
                <div className="text-[12px] font-mono font-bold" style={{ color: "var(--gold)" }}>{initial.ticker}</div>
                <div className="text-[10px]" style={{ color: "var(--th-text-muted)" }}>{initial.name}</div>
                <div className="text-[9px]" style={{ color: "var(--th-text-faint)" }}>{initial.exchange}</div>
              </div>
            </div>
          ) : selected ? (
            <SelectedStockChip stock={selected} onClear={handleClear} />
          ) : (
            <>
              <TickerSearchInput onSelect={handleSelect} />
              <p className="text-[9px] mt-2" style={{ color: "var(--th-text-faint)" }}>
                Type a ticker (REL, TCS) or company name · Arrow keys to navigate · Enter to select
              </p>
            </>
          )}
        </div>

        {/* Rest of form — shown only after selection (or always in edit mode) */}
        {isReady && (
          <>
            {/* Sector */}
            <div className="mb-3">
              <label className="block text-[9px] font-mono uppercase tracking-widest mb-1.5"
                style={{ color: "var(--th-text-faint)" }}>Sector</label>
              <select style={inputStyle}
                value={form.sector}
                onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}>
                <option value="">Select...</option>
                {SECTORS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Qty + Avg Price */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[9px] font-mono uppercase tracking-widest mb-1.5"
                  style={{ color: "var(--th-text-faint)" }}>Qty (Shares)</label>
                <input style={inputStyle} type="number" min="0" placeholder="e.g. 50"
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[9px] font-mono uppercase tracking-widest mb-1.5"
                  style={{ color: "var(--th-text-faint)" }}>
                  Avg Price (₹)
                  {selected?.current_price && (
                    <span className="ml-1" style={{ color: "var(--gold)", fontSize: "7px" }}>● CMP auto-filled</span>
                  )}
                </label>
                <input style={inputStyle} type="number" min="0" placeholder="e.g. 2450.00"
                  value={form.avgPrice}
                  onChange={e => setForm(f => ({ ...f, avgPrice: e.target.value }))} />
              </div>
            </div>

            {/* Notes */}
            <div className="mb-5">
              <label className="block text-[9px] font-mono uppercase tracking-widest mb-1.5"
                style={{ color: "var(--th-text-faint)" }}>Notes (optional)</label>
              <textarea style={{ ...inputStyle, resize: "none", height: "56px" }}
                placeholder="Investment thesis, target price, alerts..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div className="flex gap-2">
              <button onClick={onClose}
                className="flex-1 py-2 rounded-xl text-[12px] font-mono transition-all"
                style={{ background: "var(--th-border-subtle)", border: "1px solid var(--th-border-card)", color: "var(--th-text-muted)" }}>
                Cancel
              </button>
              <button onClick={handleSubmit}
                className="flex-1 py-2 rounded-xl text-[12px] font-mono font-bold transition-all"
                style={{
                  background: "linear-gradient(135deg, #FFD700, #C9A227)",
                  color:      "#050505",
                  boxShadow:  "0 4px 20px rgba(255,215,0,0.3)",
                }}>
                {initial ? "Update Position" : "Add to Portfolio"}
              </button>
            </div>
          </>
        )}

        {/* Cancel only — shown before stock is selected in add mode */}
        {!isReady && (
          <div className="mt-2">
            <button onClick={onClose}
              className="w-full py-2 rounded-xl text-[12px] font-mono transition-all"
              style={{ background: "var(--th-border-subtle)", border: "1px solid var(--th-border-card)", color: "var(--th-text-muted)" }}>
              Cancel
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
