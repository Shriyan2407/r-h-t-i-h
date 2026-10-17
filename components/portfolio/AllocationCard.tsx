import type { SectorSlice } from "@/features/portfolio/compute";
import { sectorColor } from "@/features/portfolio/sectors";

function Donut({ slices }: { slices: readonly SectorSlice[] }) {
  const R = 52, C = 70, circ = 2 * Math.PI * R;
  // Cumulative start fraction of each slice, computed up front (no mutation during render).
  const starts = slices.map((_, i) => slices.slice(0, i).reduce((a, s) => a + s.weight / 100, 0));
  return (
    <svg width="140" height="140" role="img" aria-label={`Sector allocation: ${slices.map((s) => `${s.sector} ${s.weight.toFixed(0)}%`).join(", ")}`}>
      <circle cx={C} cy={C} r={R} fill="none" stroke="var(--th-border-card)" strokeWidth="16" />
      {slices.map((s, i) => {
        const frac = s.weight / 100;
        return (
          <circle key={s.sector} cx={C} cy={C} r={R} fill="none" stroke={sectorColor(s.sector)} strokeWidth="14"
            strokeDasharray={`${frac * circ} ${circ - frac * circ}`} strokeDashoffset={circ * (1 - starts[i]) - circ * 0.25} />
        );
      })}
      <text x={C} y={C - 4} textAnchor="middle" fill="var(--th-text-primary)" fontSize="15" fontWeight="bold" fontFamily="monospace">{slices.length}</text>
      <text x={C} y={C + 12} textAnchor="middle" fill="var(--th-text-muted)" fontSize="8" fontFamily="monospace">SECTORS</text>
    </svg>
  );
}

export function AllocationCard({ slices, notes }: { slices: readonly SectorSlice[]; notes: readonly string[] }) {
  return (
    <section aria-labelledby="alloc-h" className="rounded-xl p-4" style={{ background: "var(--th-bg-card)", border: "1px solid var(--th-border-card)" }}>
      <h2 id="alloc-h" className="text-[11px] font-mono uppercase tracking-[0.14em] mb-3" style={{ color: "var(--th-text-muted)" }}>Allocation by sector</h2>
      {slices.length === 0 ? (
        <p className="text-[12px]" style={{ color: "var(--th-text-muted)" }}>Waiting for prices.</p>
      ) : (
        <>
          <div className="flex justify-center mb-3"><Donut slices={slices} /></div>
          <ul className="space-y-1.5" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {slices.map((s) => (
              <li key={s.sector} className="flex items-center gap-2 text-[11px] font-mono">
                <span aria-hidden className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sectorColor(s.sector) }} />
                <span className="flex-1 truncate">{s.sector}</span>
                <span style={{ color: s.pnlPct === null ? "var(--th-text-muted)" : s.pnlPct >= 0 ? "var(--positive)" : "var(--negative)" }}>
                  {s.pnlPct === null ? "" : `${s.pnlPct >= 0 ? "+" : ""}${s.pnlPct.toFixed(1)}%`}
                </span>
                <span className="w-12 text-right">{s.weight.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {notes.length > 0 && (
        <ul className="mt-3 pt-2.5 space-y-1 text-[11px]" style={{ listStyle: "none", padding: 0, borderTop: "1px solid var(--th-border-subtle)", color: "var(--th-text-muted)" }}>
          {notes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}
    </section>
  );
}
