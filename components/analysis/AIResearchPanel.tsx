"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  History,
  Target,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Zap,
  Info,
  Globe,
} from "lucide-react";
import type { AIAnalysis, Scenario } from "@/lib/types";
import { VerdictBadge, ConfidenceMeter } from "@/components/ui/VerdictBadge";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface AIResearchPanelProps {
  analysis: AIAnalysis;
}

function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  accentColor,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentColor?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid var(--th-border-card)", background: "var(--th-bg-elevated)" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 transition-colors"
        style={{ background: "transparent" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--th-bg-hover)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <div className="flex items-center gap-2.5">
          <Icon size={13} style={{ color: accentColor ?? "var(--th-text-muted)" }} />
          <span
            className="font-mono font-bold uppercase tracking-[0.12em]"
            style={{ fontSize: "12px", color: "var(--th-text-secondary)" }}
          >
            {title}
          </span>
        </div>
        {open
          ? <ChevronDown size={13} style={{ color: "var(--th-text-dim)" }} />
          : <ChevronRight size={13} style={{ color: "var(--th-text-dim)" }} />
        }
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="px-4 py-4 flex flex-col gap-3"
              style={{ borderTop: "1px solid var(--th-border-subtle)", background: "var(--th-bg-surface)" }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ScenarioCard({ scenario }: { scenario: Scenario }) {
  const colors = {
    BULL: { bg: "rgba(0,255,156,0.05)",  border: "rgba(0,255,156,0.22)",  text: "#00FF9C", label: "BULL CASE", track: "rgba(0,255,156,0.12)"  },
    BASE: { bg: "rgba(56,189,248,0.05)", border: "rgba(56,189,248,0.22)", text: "#38BDF8", label: "BASE CASE", track: "rgba(56,189,248,0.12)" },
    BEAR: { bg: "rgba(255,77,77,0.05)",  border: "rgba(255,77,77,0.22)",  text: "#FF4D4D", label: "BEAR CASE", track: "rgba(255,77,77,0.12)"  },
  };
  const c = colors[scenario.type];

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <div className="flex items-center justify-between">
        <span className="font-mono font-bold tracking-[0.12em]" style={{ fontSize: "11px", color: c.text }}>{c.label}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-mono" style={{ fontSize: "11px", fontWeight: 400, color: "var(--th-text-muted)" }}>Probability:</span>
          <span className="font-mono font-bold" style={{ fontSize: "13px", color: c.text }}>{scenario.probability}%</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          {/* Label subtle */}
          <div className="font-mono uppercase tracking-widest mb-1.5" style={{ fontSize: "9px", fontWeight: 400, color: "var(--th-text-muted)" }}>Target</div>
          {/* Number dominant */}
          <div className="font-mono font-bold" style={{ fontSize: "20px", letterSpacing: "-0.03em", color: c.text }}>₹{scenario.target_price.toFixed(0)}</div>
        </div>
        <div>
          <div className="font-mono uppercase tracking-widest mb-1.5" style={{ fontSize: "9px", fontWeight: 400, color: "var(--th-text-muted)" }}>Timeline</div>
          <div className="font-mono font-semibold" style={{ fontSize: "14px", color: "var(--th-text-secondary)" }}>{scenario.timeline}</div>
        </div>
        <div>
          <div className="font-mono uppercase tracking-widest mb-1.5" style={{ fontSize: "9px", fontWeight: 400, color: "var(--th-text-muted)" }}>Stop Below</div>
          <div className="font-mono font-bold" style={{ fontSize: "14px", color: "#FF4D4D" }}>₹{scenario.invalidation_level.toFixed(0)}</div>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {scenario.key_drivers.map((d, i) => (
          <div key={i} className="flex items-start gap-1.5 text-[12px] font-medium" style={{ color: "var(--th-text-tertiary)" }}>
            <span className="mt-0.5 flex-shrink-0 font-bold" style={{ color: c.text }}>·</span>
            {d}
          </div>
        ))}
      </div>
      <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: c.track }}>
        <div className="absolute h-full rounded-full" style={{ width: `${scenario.probability}%`, background: c.text }} />
      </div>
    </div>
  );
}

function Milestone({ year, event, impact }: { year: number; event: string; impact: "POSITIVE" | "NEGATIVE" | "NEUTRAL" }) {
  const color = impact === "POSITIVE" ? "#00FF9C" : impact === "NEGATIVE" ? "#FF4D4D" : "var(--th-text-muted)";
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ background: color }} />
        <div className="w-px flex-1 mt-1" style={{ background: "var(--th-border-subtle)" }} />
      </div>
      <div className="pb-4">
        <span className="text-[10px] font-mono font-bold" style={{ color }}>{year}</span>
        <p className="text-[12px] font-medium leading-relaxed mt-0.5" style={{ color: "var(--th-text-tertiary)" }}>{event}</p>
      </div>
    </div>
  );
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: "var(--th-bg-elevated)", border: "1px solid var(--th-border-subtle)" }}>
      <div className="text-[9px] font-mono font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: "var(--th-text-muted)" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

export function AIResearchPanel({ analysis }: AIResearchPanelProps) {
  return (
    <div className="flex flex-col gap-3 p-4">

      {/* ── Verdict Banner ── */}
      <div
        className="flex flex-col gap-3 p-5 rounded-xl"
        style={{
          background: "linear-gradient(135deg, var(--th-bg-elevated) 0%, var(--th-bg-card-solid) 100%)",
          border: "1px solid var(--th-border-accent)",
          boxShadow: "0 0 30px rgba(255,215,0,0.04)",
        }}
      >
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Brain size={14} style={{ color: "#38BDF8" }} />
            <span className="font-mono font-bold uppercase tracking-[0.14em]" style={{ fontSize: "11px", color: "var(--th-text-muted)" }}>
              AI Final Verdict
            </span>
          </div>
          <span className="font-mono" style={{ fontSize: "11px", fontWeight: 400, color: "var(--th-text-dim)" }}>
            {new Date(analysis.generated_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <VerdictBadge verdict={analysis.verdict.rating} size="lg" />
          {analysis.verdict.timeline && <Badge variant="dim">{analysis.verdict.timeline}</Badge>}
          {analysis.verdict.risk_reward && <Badge variant="blue">R/R {analysis.verdict.risk_reward.toFixed(1)}x</Badge>}
        </div>

        <ConfidenceMeter confidence={analysis.verdict.confidence} verdict={analysis.verdict.rating} />

        <p
          className="font-medium leading-relaxed"
          style={{ fontSize: "14px", fontWeight: 400, color: "var(--th-text-secondary)", borderTop: "1px solid var(--th-border-subtle)", paddingTop: "14px" }}
        >
          {analysis.verdict.investment_thesis}
        </p>

        {(analysis.verdict.entry_range || analysis.verdict.stop_loss) && (
          <div className="grid grid-cols-3 gap-2 text-center">
            {analysis.verdict.entry_range && (
              <div className="p-3 rounded-lg" style={{ background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.22)" }}>
                <div className="font-mono uppercase tracking-widest mb-1.5" style={{ fontSize: "9px", fontWeight: 400, color: "var(--th-text-dim)" }}>Entry Range</div>
                <div className="font-mono font-bold" style={{ fontSize: "14px", letterSpacing: "-0.02em", color: "#38BDF8" }}>
                  ₹{analysis.verdict.entry_range[0].toFixed(0)}–{analysis.verdict.entry_range[1].toFixed(0)}
                </div>
              </div>
            )}
            {analysis.verdict.stop_loss && (
              <div className="p-3 rounded-lg" style={{ background: "rgba(255,77,77,0.06)", border: "1px solid rgba(255,77,77,0.22)" }}>
                <div className="font-mono uppercase tracking-widest mb-1.5" style={{ fontSize: "9px", fontWeight: 400, color: "var(--th-text-dim)" }}>Stop Loss</div>
                <div className="font-mono font-bold" style={{ fontSize: "14px", letterSpacing: "-0.02em", color: "#FF4D4D" }}>₹{analysis.verdict.stop_loss.toFixed(0)}</div>
              </div>
            )}
            {analysis.verdict.target_1 && (
              <div className="p-3 rounded-lg" style={{ background: "rgba(0,255,156,0.06)", border: "1px solid rgba(0,255,156,0.22)" }}>
                <div className="font-mono uppercase tracking-widest mb-1.5" style={{ fontSize: "9px", fontWeight: 400, color: "var(--th-text-dim)" }}>Target 1 / 2</div>
                <div className="font-mono font-bold" style={{ fontSize: "14px", letterSpacing: "-0.02em", color: "#00FF9C" }}>
                  ₹{analysis.verdict.target_1.toFixed(0)}
                  {analysis.verdict.target_2 && ` / ₹${analysis.verdict.target_2.toFixed(0)}`}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Scenarios ── */}
      <Section title="Trade Scenarios" icon={Target} defaultOpen accentColor="#A78BFA">
        <div className="flex flex-col gap-3">
          {analysis.scenarios.map(s => <ScenarioCard key={s.type} scenario={s} />)}
        </div>
      </Section>

      {/* ── Business Lifecycle ── */}
      <Section title="Business Lifecycle & History" icon={History} accentColor="#FFD700">
        <div className="flex flex-col gap-2">
          <p className="text-[12.5px] font-medium leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
            {analysis.lifecycle.business_evolution}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <InfoCard label="Founded">
              <div className="text-[12px] font-mono font-semibold" style={{ color: "var(--th-text-primary)" }}>{analysis.lifecycle.founding_year}</div>
            </InfoCard>
            <InfoCard label="Management Quality">
              <div className="text-[12px] font-mono font-semibold" style={{ color: "var(--th-text-primary)" }}>{analysis.lifecycle.management_quality}</div>
            </InfoCard>
          </div>
          <InfoCard label="Competitive Moat">
            <p className="text-[12px] font-medium leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>{analysis.lifecycle.competitive_moat}</p>
          </InfoCard>
          <InfoCard label="Capital Allocation">
            <p className="text-[12px] font-medium leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>{analysis.lifecycle.capital_allocation_quality}</p>
          </InfoCard>
          {analysis.lifecycle.key_milestones?.length > 0 && (
            <div className="mt-1">
              <div className="text-[9px] font-mono font-bold uppercase tracking-widest mb-3" style={{ color: "var(--th-text-muted)" }}>
                Key Milestones
              </div>
              {analysis.lifecycle.key_milestones.map((m, i) => (
                <Milestone key={i} year={m.year} event={m.event} impact={m.impact} />
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* ── Macro & Policy ── */}
      <Section title="Macro & Policy Analysis" icon={Globe} accentColor="#38BDF8">
        <div className="flex flex-col gap-3">
          <p className="text-[12.5px] font-medium leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
            {analysis.macro.summary}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <InfoCard label="RBI Impact">
              <p className="text-[12px] font-medium leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>{analysis.macro.rbi_impact}</p>
            </InfoCard>
            <InfoCard label="Budget Impact">
              <p className="text-[12px] font-medium leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>{analysis.macro.budget_impact}</p>
            </InfoCard>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {analysis.macro.sector_tailwinds.length > 0 && (
              <div className="p-3 rounded-lg" style={{ background: "rgba(0,255,156,0.04)", border: "1px solid rgba(0,255,156,0.18)" }}>
                <div className="text-[9px] font-mono font-bold uppercase tracking-widest mb-2" style={{ color: "#00FF9C" }}>Tailwinds</div>
                {analysis.macro.sector_tailwinds.map((t, i) => (
                  <div key={i} className="flex gap-1.5 text-[11.5px] font-medium mb-1" style={{ color: "var(--th-text-tertiary)" }}>
                    <span style={{ color: "#00FF9C" }}>·</span>{t}
                  </div>
                ))}
              </div>
            )}
            {analysis.macro.sector_headwinds.length > 0 && (
              <div className="p-3 rounded-lg" style={{ background: "rgba(255,77,77,0.04)", border: "1px solid rgba(255,77,77,0.18)" }}>
                <div className="text-[9px] font-mono font-bold uppercase tracking-widest mb-2" style={{ color: "#FF4D4D" }}>Headwinds</div>
                {analysis.macro.sector_headwinds.map((h, i) => (
                  <div key={i} className="flex gap-1.5 text-[11.5px] font-medium mb-1" style={{ color: "var(--th-text-tertiary)" }}>
                    <span style={{ color: "#FF4D4D" }}>·</span>{h}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--th-border-card)" }}>
            <div className="flex" style={{ borderBottom: "1px solid var(--th-border-subtle)" }}>
              <div className="flex-1 px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: "#38BDF8" }}>
                <Info size={9} /> Facts
              </div>
              <div className="flex-1 px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: "#A78BFA", borderLeft: "1px solid var(--th-border-subtle)" }}>
                <Zap size={9} /> Interpretations
              </div>
            </div>
            <div className="flex">
              <div className="flex-1 p-3 flex flex-col gap-1.5" style={{ borderRight: "1px solid var(--th-border-subtle)" }}>
                {analysis.macro.facts_vs_interpretation.facts.map((f, i) => (
                  <div key={i} className="flex gap-1.5 text-[11.5px] font-medium" style={{ color: "var(--th-text-tertiary)" }}>
                    <span style={{ color: "#38BDF8" }}>·</span>{f}
                  </div>
                ))}
              </div>
              <div className="flex-1 p-3 flex flex-col gap-1.5">
                {analysis.macro.facts_vs_interpretation.interpretations.map((f, i) => (
                  <div key={i} className="flex gap-1.5 text-[11.5px] font-medium" style={{ color: "var(--th-text-tertiary)" }}>
                    <span style={{ color: "#A78BFA" }}>·</span>{f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Risks & Catalysts ── */}
      <Section title="Risks & Catalysts" icon={AlertTriangle} accentColor="#FB923C">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[9px] font-mono font-bold uppercase tracking-widest mb-2.5 flex items-center gap-1.5" style={{ color: "#FF4D4D" }}>
              <AlertTriangle size={9} /> Key Risks
            </div>
            {analysis.verdict.key_risks.map((r, i) => (
              <div key={i} className="flex gap-2 text-[12px] font-medium mb-2 leading-snug" style={{ color: "var(--th-text-tertiary)" }}>
                <span className="font-bold flex-shrink-0 mt-0.5" style={{ color: "#FF4D4D" }}>✕</span>{r}
              </div>
            ))}
          </div>
          <div>
            <div className="text-[9px] font-mono font-bold uppercase tracking-widest mb-2.5 flex items-center gap-1.5" style={{ color: "#00FF9C" }}>
              <CheckCircle size={9} /> Key Catalysts
            </div>
            {analysis.verdict.key_catalysts.map((c, i) => (
              <div key={i} className="flex gap-2 text-[12px] font-medium mb-2 leading-snug" style={{ color: "var(--th-text-tertiary)" }}>
                <span className="font-bold flex-shrink-0 mt-0.5" style={{ color: "#00FF9C" }}>✓</span>{c}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Disclaimer ── */}
      <div
        className="font-mono font-medium p-4 rounded-xl leading-relaxed"
        style={{ fontSize: "11px", fontWeight: 400, color: "var(--th-text-dim)", border: "1px solid var(--th-border-subtle)", background: "var(--th-bg-elevated)" }}
      >
        ⚠ This analysis is AI-generated for informational purposes only. Not investment advice.
        Past performance does not guarantee future results. Conduct independent due diligence before investing.
      </div>
    </div>
  );
}
