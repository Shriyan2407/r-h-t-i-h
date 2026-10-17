"use client";
import { Fragment, useState } from "react";
import { ChevronDown, ChevronUp, Edit3, Trash2 } from "lucide-react";
import Link from "next/link";
import { sortViews, type HoldingView, type SortKey } from "@/features/portfolio/compute";
import { sectorColor } from "@/features/portfolio/sectors";

const num = (n: number | null, d = 2) => (n === null ? "n/a" : n.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d }));
const tone = (n: number | null) => (n === null ? "var(--th-text-muted)" : n >= 0 ? "var(--positive)" : "var(--negative)");
const th: React.CSSProperties = { padding: "8px 12px", fontSize: 10, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--th-text-muted)", fontWeight: 600, whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "9px 12px", fontSize: 12, fontFamily: "monospace", whiteSpace: "nowrap" };

function Heatmap({ views }: { views: readonly HoldingView[] }) {
  const priced = views.filter((v) => v.allocationPct !== null && v.pnlPct !== null).sort((a, b) => b.allocationPct! - a.allocationPct!);
  return (
    <div role="list" aria-label="Holdings map: tile size is weight, colour is P&L" style={{ display: "flex", flexWrap: "wrap", gap: 3, padding: 12 }}>
      {priced.map((v) => {
        const mag = Math.min(Math.abs(v.pnlPct!) / 30, 1);
        const pos = v.pnlPct! >= 0;
        return (
          <Link role="listitem" key={v.ticker} href={`/stock/${v.ticker}`}
            style={{ flex: `${Math.max(v.allocationPct!, 5)} 0 ${Math.max(56, v.allocationPct! * 3.2)}px`, minHeight: 66, borderRadius: 7, padding: "7px 6px",
              background: pos ? `hsla(155, ${35 + mag * 55}%, ${22 + mag * 18}%, 0.9)` : `hsla(5, ${40 + mag * 55}%, ${22 + mag * 12}%, 0.9)`, color: "#fff",
              display: "flex", flexDirection: "column", justifyContent: "space-between", textDecoration: "none" }}>
            <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700 }}>{v.ticker}</span>
            <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700 }}>{pos ? "+" : ""}{v.pnlPct!.toFixed(1)}%</span>
            <span style={{ fontSize: 10, fontFamily: "monospace", opacity: 0.85 }}>{v.allocationPct!.toFixed(0)}% weight</span>
          </Link>
        );
      })}
    </div>
  );
}

function SortTh({ k, sortBy, dir, onSort, children }: { k: SortKey; sortBy: SortKey; dir: "asc" | "desc"; onSort: (k: SortKey) => void; children: React.ReactNode }) {
  return (
    <th scope="col" style={{ ...th, textAlign: "right" }} aria-sort={sortBy === k ? (dir === "desc" ? "descending" : "ascending") : "none"}>
      <button onClick={() => onSort(k)} style={{ background: "none", border: 0, color: "inherit", font: "inherit", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 2 }}>
        {children}{sortBy === k && (dir === "desc" ? <ChevronDown size={10} /> : <ChevronUp size={10} />)}
      </button>
    </th>
  );
}

export function HoldingsTable({ views, onEdit, onRemove }: { views: readonly HoldingView[]; onEdit: (id: string) => void; onRemove: (id: string) => void }) {
  const [sortBy, setSortBy] = useState<SortKey>("value");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [filter, setFilter] = useState<"all" | "gainers" | "losers">("all");
  const [mode, setMode] = useState<"table" | "map">("table");
  const [open, setOpen] = useState<string | null>(null);

  const filtered = views.filter((v) => filter === "all" || (filter === "gainers" ? (v.pnl ?? 0) > 0 : (v.pnl ?? 0) < 0));
  const rows = sortViews(filtered, sortBy, dir);
  const sort = (k: SortKey) => {
    if (k === sortBy) setDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortBy(k); setDir("desc"); }
  };
  const chip = (active: boolean): React.CSSProperties => ({ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontFamily: "monospace", textTransform: "uppercase", cursor: "pointer",
    background: active ? "var(--th-gold-bg-mid)" : "transparent", border: `1px solid ${active ? "var(--th-border-accent)" : "transparent"}`, color: active ? "var(--gold)" : "var(--th-text-muted)" });

  return (
    <section aria-labelledby="hold-h" className="rounded-xl overflow-hidden" style={{ background: "var(--th-bg-card)", border: "1px solid var(--th-border-card)" }}>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--th-border-subtle)" }}>
        <h2 id="hold-h" className="text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--th-text-muted)", margin: 0 }}>Holdings ({rows.length})</h2>
        <div role="group" aria-label="View" className="flex gap-1 ml-2">
          {(["table", "map"] as const).map((m) => <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)} style={chip(mode === m)}>{m}</button>)}
        </div>
        <div role="group" aria-label="Filter" className="flex gap-1 ml-auto">
          {(["all", "gainers", "losers"] as const).map((f) => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)} style={chip(filter === f)}>{f}</button>)}
        </div>
      </div>
      {mode === "map" ? <Heatmap views={rows} /> : (
        <div className="overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--th-border-subtle)" }}>
                <th scope="col" style={{ ...th, textAlign: "left" }}>Stock</th>
                <th scope="col" style={{ ...th, textAlign: "right" }}>Qty</th>
                <th scope="col" style={{ ...th, textAlign: "right" }}>Avg cost</th>
                <th scope="col" style={{ ...th, textAlign: "right" }}>Price</th>
                <SortTh k="change" sortBy={sortBy} dir={dir} onSort={sort}>Today</SortTh>
                <SortTh k="pnl" sortBy={sortBy} dir={dir} onSort={sort}>P&L</SortTh>
                <SortTh k="value" sortBy={sortBy} dir={dir} onSort={sort}>Value</SortTh>
                <SortTh k="alloc" sortBy={sortBy} dir={dir} onSort={sort}>Weight</SortTh>
                <th scope="col" style={th}><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <Fragment key={v.ticker}>
                  <tr style={{ borderBottom: "1px solid var(--th-border-subtle)" }}>
                    <td style={td}>
                      <button onClick={() => setOpen(open === v.ticker ? null : v.ticker)} aria-expanded={open === v.ticker} aria-controls={`det-${v.ticker}`}
                        style={{ background: "none", border: 0, color: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: 0, font: "inherit" }}>
                        <span aria-hidden style={{ width: 8, height: 8, borderRadius: 4, background: sectorColor(v.sector || "Other") }} />
                        <span style={{ textAlign: "left" }}>
                          <span style={{ display: "block", fontWeight: 700 }}>{v.ticker}</span>
                          <span style={{ display: "block", fontSize: 10, color: "var(--th-text-muted)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>{v.name}</span>
                        </span>
                      </button>
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>{v.quantity.toLocaleString("en-IN")}</td>
                    <td style={{ ...td, textAlign: "right", color: "var(--th-text-muted)" }}>₹{num(v.avgPrice)}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{v.price === null ? <span style={{ color: "var(--warning)" }}>unavailable</span> : `₹${num(v.price)}`}</td>
                    <td style={{ ...td, textAlign: "right", color: tone(v.changePct) }}>{v.changePct === null ? "n/a" : `${v.changePct >= 0 ? "+" : ""}${v.changePct.toFixed(2)}%`}</td>
                    <td style={{ ...td, textAlign: "right", color: tone(v.pnl) }}>
                      {v.pnl === null ? "n/a" : <>{v.pnl >= 0 ? "+" : "-"}₹{num(Math.abs(v.pnl), 0)}<span style={{ display: "block", fontSize: 10 }}>{v.pnlPct! >= 0 ? "+" : ""}{v.pnlPct!.toFixed(2)}%</span></>}
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>{v.currentValue === null ? "n/a" : `₹${num(v.currentValue, 0)}`}</td>
                    <td style={{ ...td, textAlign: "right" }}>{v.allocationPct === null ? "n/a" : `${v.allocationPct.toFixed(1)}%`}</td>
                    <td style={td}>
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => onEdit(v.id)} aria-label={`Edit ${v.ticker}`} className="p-1.5 rounded-lg" style={{ background: "none", border: 0, color: "var(--th-text-muted)", cursor: "pointer" }}><Edit3 size={12} /></button>
                        <button onClick={() => { if (window.confirm(`Remove ${v.ticker} from your portfolio?`)) onRemove(v.id); }} aria-label={`Remove ${v.ticker}`} className="p-1.5 rounded-lg" style={{ background: "none", border: 0, color: "var(--th-text-muted)", cursor: "pointer" }}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                  {open === v.ticker && (
                    <tr id={`det-${v.ticker}`} style={{ background: "var(--th-gold-bg)" }}>
                      <td colSpan={9} style={{ padding: "10px 16px", fontSize: 12 }}>
                        <div className="flex flex-wrap gap-6">
                          <span>Invested <b>₹{num(v.investedValue, 0)}</b></span>
                          <span>Today <b style={{ color: tone(v.dayPnl) }}>{v.dayPnl === null ? "n/a" : `${v.dayPnl >= 0 ? "+" : "-"}₹${num(Math.abs(v.dayPnl), 0)}`}</b></span>
                          <span>Sector <b>{v.sector || "Other"}</b></span>
                          <Link href={`/stock/${v.ticker}`} style={{ color: "var(--gold)" }}>Open {v.ticker} →</Link>
                          <Link href={`/research?t=${v.ticker}`} style={{ color: "var(--gold)" }}>Why is it moving? →</Link>
                        </div>
                        {v.notes && <p style={{ margin: "8px 0 0", color: "var(--th-text-dim)" }}>{v.notes}</p>}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
