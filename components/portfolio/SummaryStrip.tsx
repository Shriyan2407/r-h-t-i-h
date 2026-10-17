import type { Summary } from "@/features/portfolio/compute";

export const fmtInrShort = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 10_000_000) return `${sign}₹${(abs / 10_000_000).toFixed(2)}Cr`;
  if (abs >= 100_000) return `${sign}₹${(abs / 100_000).toFixed(2)}L`;
  return `${sign}₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};
const signed = (n: number | null, d = 2) => (n === null ? "n/a" : `${n >= 0 ? "+" : ""}${n.toFixed(d)}%`);
const tone = (n: number | null) => (n === null ? "var(--th-text-muted)" : n >= 0 ? "var(--positive)" : "var(--negative)");

/** Headline numbers, all computed from saved holdings and quotes (no derived "scores"). */
export function SummaryStrip({ s }: { s: Summary }) {
  const stats = [
    { label: "Value", value: fmtInrShort(s.pricedValue), sub: `Invested ${fmtInrShort(s.pricedInvested)}`, color: "var(--th-text-primary)" },
    { label: "Total P&L", value: `${s.totalPnl >= 0 ? "+" : ""}${fmtInrShort(s.totalPnl)}`, sub: signed(s.totalPnlPct), color: tone(s.totalPnl) },
    { label: "Today", value: `${s.dayPnl >= 0 ? "+" : ""}${fmtInrShort(s.dayPnl)}`, sub: signed(s.dayPnlPct), color: tone(s.dayPnl) },
    { label: "Holdings", value: String(s.holdings), sub: `${s.sectors} sectors · ${s.gainers} up / ${s.losers} down`, color: "var(--gold)" },
    { label: "Largest position", value: s.largestTicker ?? "n/a", sub: s.largestWeight === null ? "" : `${s.largestWeight.toFixed(1)}% of value`, color: "var(--th-text-primary)" },
    { label: "Effective holdings", value: s.effectiveHoldings === null ? "n/a" : s.effectiveHoldings.toFixed(1), sub: "1 / Herfindahl index", color: "var(--th-text-primary)" },
  ];
  return (
    <section aria-label="Portfolio summary" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((st) => (
        <div key={st.label} className="flex flex-col p-2.5 rounded-xl" style={{ background: "var(--th-bg-card)", border: "1px solid var(--th-border-subtle)" }}>
          <span className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: "var(--th-text-muted)" }}>{st.label}</span>
          <span className="text-[16px] font-mono font-bold" style={{ color: st.color }}>{st.value}</span>
          <span className="text-[10px] font-mono mt-0.5" style={{ color: "var(--th-text-muted)" }}>{st.sub}</span>
        </div>
      ))}
      {s.unpriced.length > 0 && (
        <p role="note" className="col-span-full text-[11px]" style={{ color: "var(--warning)", margin: 0 }}>
          No current price for {s.unpriced.join(", ")}: excluded from value and P&L until a quote is available.
        </p>
      )}
    </section>
  );
}
