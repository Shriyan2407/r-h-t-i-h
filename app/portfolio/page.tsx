"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence } from "framer-motion";
import { PieChart, Plus, RefreshCw, Scan } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { MarketTicker } from "@/components/MarketTicker";
import { PortfolioScanner, type ImportedHolding } from "@/components/PortfolioScanner";
import { HoldingModal } from "@/components/portfolio/HoldingModal";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { SummaryStrip } from "@/components/portfolio/SummaryStrip";
import { AllocationCard } from "@/components/portfolio/AllocationCard";
import { PerformanceCard } from "@/components/portfolio/PerformanceCard";
import { usePortfolioStore, type PortfolioHolding } from "@/store/portfolioStore";
import { usePortfolioQuotes } from "@/features/portfolio/usePortfolioQuotes";
import { concentrationNotes, sectorAllocation, summarize, toHoldingViews } from "@/features/portfolio/compute";
import { classifyTicker } from "@/lib/sectorMap";

// Loaded on demand: the risk view is only needed once the user asks for an analysis.
const PortfolioRiskPanel = dynamic(() => import("@/components/portfolio/PortfolioRiskPanel"), { ssr: false });

/** Missing or generic sectors are classified from the ticker/name map (as before). */
function withSector(h: PortfolioHolding): PortfolioHolding {
  const raw = h.sector?.trim() ?? "";
  return !raw || /^(other|unknown)$/i.test(raw) ? { ...h, sector: classifyTicker(h.ticker, h.name) } : h;
}

const btn: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, fontSize: 11, fontFamily: "monospace", cursor: "pointer" };

export default function PortfolioPage() {
  const { holdings, add, update, remove, sync } = usePortfolioStore();
  const [mounted, setMounted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [editing, setEditing] = useState<PortfolioHolding | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration guard for the persisted store
    setMounted(true);
    void sync();
  }, [sync]);

  const classified = useMemo(() => holdings.map(withSector), [holdings]);
  const { quotes, loading, refresh, liveStatus } = usePortfolioQuotes(classified.map((h) => h.ticker));
  const views = useMemo(() => toHoldingViews(classified, quotes), [classified, quotes]);
  const summary = useMemo(() => summarize(views), [views]);
  const slices = useMemo(() => sectorAllocation(views), [views]);
  const notes = useMemo(() => concentrationNotes(summary, slices), [summary, slices]);
  const holdingsKey = useMemo(() => classified.map((h) => `${h.ticker}:${h.quantity}`).sort().join(","), [classified]);

  const isEmpty = !mounted || holdings.length === 0;
  const openAdd = () => { setEditing(null); setShowModal(true); };

  return (
    <div className="min-h-screen" style={{ background: "var(--th-bg-page)" }}>
      <Navbar />
      <MarketTicker />

      <header className="px-4 sm:px-6 py-3" style={{ background: "var(--th-bg-elevated)", borderBottom: "1px solid var(--th-border-subtle)" }}>
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-bold" style={{ fontSize: "clamp(18px,2.5vw,24px)", margin: 0 }}>Portfolio</h1>
            <p className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)", margin: "2px 0 0" }}>
              {holdings.length} holdings · prices {liveStatus === "live" ? "updating (delayed)" : "from latest quotes"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => void refresh()} disabled={loading} aria-busy={loading} style={{ ...btn, background: "var(--th-border-subtle)", border: "1px solid var(--th-border-card)", color: "var(--th-text-muted)" }}>
              <RefreshCw size={11} className={loading ? "animate-spin motion-reduce:animate-none" : ""} /> Refresh
            </button>
            <button onClick={() => setShowScanner(true)} style={{ ...btn, color: "var(--gold)", background: "var(--th-gold-bg)", border: "1px solid var(--th-border-accent)" }}>
              <Scan size={11} /> Import
            </button>
            <button onClick={openAdd} style={{ ...btn, fontWeight: 700, color: "#050505", background: "var(--primary)", border: 0 }}>
              <Plus size={11} /> Add holding
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 grid gap-4">
        {isEmpty ? (
          <section className="flex flex-col items-center justify-center py-24 gap-5 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "var(--th-gold-bg-mid)", border: "1px solid var(--th-border-accent)" }}>
              <PieChart size={30} style={{ color: "var(--gold)" }} aria-hidden />
            </div>
            <div>
              <h2 className="text-[18px] font-bold" style={{ margin: 0 }}>Your portfolio is empty</h2>
              <p className="text-[13px]" style={{ color: "var(--th-text-muted)", margin: "6px 0 0" }}>Add holdings, or import a CSV, Excel, PDF or broker screenshot.</p>
            </div>
            <div className="flex gap-3 flex-wrap justify-center">
              <button onClick={() => setShowScanner(true)} style={{ ...btn, padding: "10px 18px", fontSize: 12, color: "var(--gold)", background: "var(--th-gold-bg)", border: "1px solid var(--th-border-accent)" }}><Scan size={13} /> Import</button>
              <button onClick={openAdd} style={{ ...btn, padding: "10px 18px", fontSize: 12, fontWeight: 700, color: "#050505", background: "var(--primary)", border: 0 }}><Plus size={13} /> Add manually</button>
            </div>
          </section>
        ) : (
          <>
            <SummaryStrip s={summary} />
            <PortfolioRiskPanel />
            <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4">
              <AllocationCard slices={slices} notes={notes} />
              <div className="grid gap-4 min-w-0">
                <HoldingsTable views={views} onEdit={(id) => { setEditing(holdings.find((h) => h.id === id) ?? null); setShowModal(true); }} onRemove={(id) => void remove(id)} />
                <PerformanceCard holdingsKey={holdingsKey} />
              </div>
            </div>
            <p className="text-[11px]" style={{ color: "var(--th-text-muted)", margin: 0 }}>
              EquityLens · Quotes from Yahoo Finance and may be delayed · Not investment advice.
            </p>
          </>
        )}
      </main>

      <AnimatePresence>
        {showModal && (
          <HoldingModal
            initial={editing ?? undefined}
            onClose={() => { setShowModal(false); setEditing(null); }}
            onSubmit={(h) => {
              if (editing) void update(editing.id, { quantity: h.quantity, avgPrice: h.avgPrice, notes: h.notes });
              else void add(h);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showScanner && (
          <PortfolioScanner
            onClose={() => setShowScanner(false)}
            onImport={async (imported: ImportedHolding[]) => {
              for (const h of imported) await add(h);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
