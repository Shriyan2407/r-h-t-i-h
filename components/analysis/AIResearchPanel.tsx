"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  History,
  BarChart2,
  TrendingUp,
  Globe,
  Newspaper,
  Target,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Zap,
  Info,
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
  accent,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accent?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-[#30363d] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#161b22] hover:bg-[#1c2128] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon size={13} className={accent ?? "text-[#8b949e]"} />
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#e6edf3] font-semibold">
            {title}
          </span>
        </div>
        {open ? (
          <ChevronDown size={13} className="text-[#484f58]" />
        ) : (
          <ChevronRight size={13} className="text-[#484f58]" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 py-4 bg-[#0d1117] border-t border-[#30363d] flex flex-col gap-3">
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
    BULL: { bg: "rgba(0,255,136,0.06)", border: "rgba(0,255,136,0.25)", text: "#00ff88", label: "BULL CASE" },
    BASE: { bg: "rgba(0,170,255,0.06)", border: "rgba(0,170,255,0.25)", text: "#00aaff", label: "BASE CASE" },
    BEAR: { bg: "rgba(255,68,102,0.06)", border: "rgba(255,68,102,0.25)", text: "#ff4466", label: "BEAR CASE" },
  };
  const c = colors[scenario.type];

  return (
    <div
      className="rounded-xl border p-3 flex flex-col gap-2"
      style={{ background: c.bg, borderColor: c.border }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono font-bold" style={{ color: c.text }}>
          {c.label}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-[#8b949e]">Probability:</span>
          <span className="text-[10px] font-mono font-bold" style={{ color: c.text }}>
            {scenario.probability}%
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[9px] font-mono text-[#484f58] mb-0.5">Target</div>
          <div className="text-base font-mono font-bold" style={{ color: c.text }}>
            ₹{scenario.target_price.toFixed(0)}
          </div>
        </div>
        <div>
          <div className="text-[9px] font-mono text-[#484f58] mb-0.5">Timeline</div>
          <div className="text-xs font-mono text-[#e6edf3]">{scenario.timeline}</div>
        </div>
        <div>
          <div className="text-[9px] font-mono text-[#484f58] mb-0.5">Stop Below</div>
          <div className="text-xs font-mono text-[#ff4466]">₹{scenario.invalidation_level.toFixed(0)}</div>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {scenario.key_drivers.map((d, i) => (
          <div key={i} className="flex items-start gap-1.5 text-[11px]" style={{ color: c.text }}>
            <span className="mt-0.5 flex-shrink-0">·</span>
            <span className="opacity-80">{d}</span>
          </div>
        ))}
      </div>
      {/* Probability bar */}
      <div className="relative h-1 bg-[#21262d] rounded-full overflow-hidden">
        <div
          className="absolute h-full rounded-full transition-all"
          style={{ width: `${scenario.probability}%`, background: c.text }}
        />
      </div>
    </div>
  );
}

function Milestone({
  year,
  event,
  impact,
}: {
  year: number;
  event: string;
  impact: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
}) {
  const color =
    impact === "POSITIVE" ? "#00ff88" : impact === "NEGATIVE" ? "#ff4466" : "#8b949e";
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
          style={{ background: color }}
        />
        <div className="w-px flex-1 mt-1" style={{ background: `${color}30` }} />
      </div>
      <div className="pb-4">
        <span className="text-[10px] font-mono font-bold" style={{ color }}>
          {year}
        </span>
        <p className="text-xs text-[#8b949e] mt-0.5">{event}</p>
      </div>
    </div>
  );
}

export function AIResearchPanel({ analysis }: AIResearchPanelProps) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Verdict Banner */}
      <div className="flex flex-col gap-3 p-4 bg-[#161b22] border border-[#30363d] rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain size={14} className="text-[#00aaff]" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#8b949e]">
              AI Final Verdict
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#484f58]">
            {new Date(analysis.generated_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <VerdictBadge verdict={analysis.verdict.rating} size="lg" />
          {analysis.verdict.timeline && (
            <Badge variant="dim">{analysis.verdict.timeline}</Badge>
          )}
          {analysis.verdict.risk_reward && (
            <Badge variant="blue">R/R {analysis.verdict.risk_reward.toFixed(1)}x</Badge>
          )}
        </div>
        <ConfidenceMeter
          confidence={analysis.verdict.confidence}
          verdict={analysis.verdict.rating}
        />
        <p className="text-xs text-[#8b949e] leading-relaxed border-t border-[#21262d] pt-3">
          {analysis.verdict.investment_thesis}
        </p>
        {/* Entry / SL / Target */}
        {(analysis.verdict.entry_range || analysis.verdict.stop_loss) && (
          <div className="grid grid-cols-3 gap-2 text-center mt-1">
            {analysis.verdict.entry_range && (
              <div className="p-2 bg-[rgba(0,170,255,0.06)] border border-[rgba(0,170,255,0.2)] rounded-lg">
                <div className="text-[9px] font-mono text-[#484f58] mb-0.5">Entry Range</div>
                <div className="text-xs font-mono text-[#00aaff]">
                  ₹{analysis.verdict.entry_range[0].toFixed(0)}–{analysis.verdict.entry_range[1].toFixed(0)}
                </div>
              </div>
            )}
            {analysis.verdict.stop_loss && (
              <div className="p-2 bg-[rgba(255,68,102,0.06)] border border-[rgba(255,68,102,0.2)] rounded-lg">
                <div className="text-[9px] font-mono text-[#484f58] mb-0.5">Stop Loss</div>
                <div className="text-xs font-mono text-[#ff4466]">₹{analysis.verdict.stop_loss.toFixed(0)}</div>
              </div>
            )}
            {analysis.verdict.target_1 && (
              <div className="p-2 bg-[rgba(0,255,136,0.06)] border border-[rgba(0,255,136,0.2)] rounded-lg">
                <div className="text-[9px] font-mono text-[#484f58] mb-0.5">Target 1 / 2</div>
                <div className="text-xs font-mono text-[#00ff88]">
                  ₹{analysis.verdict.target_1.toFixed(0)}
                  {analysis.verdict.target_2 && ` / ₹${analysis.verdict.target_2.toFixed(0)}`}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scenarios */}
      <Section title="Trade Scenarios" icon={Target} defaultOpen={true} accent="text-[#aa88ff]">
        <div className="flex flex-col gap-3">
          {analysis.scenarios.map(s => (
            <ScenarioCard key={s.type} scenario={s} />
          ))}
        </div>
      </Section>

      {/* Historical Lifecycle */}
      <Section title="Business Lifecycle & History" icon={History} accent="text-[#ffcc00]">
        <div className="flex flex-col gap-2">
          <p className="text-xs text-[#8b949e] leading-relaxed">{analysis.lifecycle.business_evolution}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-[#161b22] border border-[#30363d] rounded-lg">
              <div className="text-[9px] font-mono text-[#484f58] mb-0.5">Founded</div>
              <div className="text-xs font-mono text-[#e6edf3]">{analysis.lifecycle.founding_year}</div>
            </div>
            <div className="p-2 bg-[#161b22] border border-[#30363d] rounded-lg">
              <div className="text-[9px] font-mono text-[#484f58] mb-0.5">Management Quality</div>
              <div className="text-xs font-mono text-[#e6edf3]">{analysis.lifecycle.management_quality}</div>
            </div>
          </div>
          <div className="p-2 bg-[#161b22] border border-[#30363d] rounded-lg">
            <div className="text-[9px] font-mono text-[#484f58] mb-1">Competitive Moat</div>
            <div className="text-xs text-[#8b949e]">{analysis.lifecycle.competitive_moat}</div>
          </div>
          <div className="p-2 bg-[#161b22] border border-[#30363d] rounded-lg">
            <div className="text-[9px] font-mono text-[#484f58] mb-1">Capital Allocation</div>
            <div className="text-xs text-[#8b949e]">{analysis.lifecycle.capital_allocation_quality}</div>
          </div>
          {analysis.lifecycle.key_milestones?.length > 0 && (
            <div className="mt-2">
              <div className="text-[9px] font-mono text-[#484f58] mb-3 uppercase tracking-widest">Key Milestones</div>
              {analysis.lifecycle.key_milestones.map((m, i) => (
                <Milestone key={i} year={m.year} event={m.event} impact={m.impact} />
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* Macro & Policy */}
      <Section title="Macro & Policy Analysis" icon={Globe} accent="text-[#00aaff]">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-[#8b949e] leading-relaxed">{analysis.macro.summary}</p>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-[#161b22] border border-[#30363d] rounded-lg">
              <div className="text-[9px] font-mono text-[#484f58] mb-1">RBI Impact</div>
              <div className="text-xs text-[#8b949e]">{analysis.macro.rbi_impact}</div>
            </div>
            <div className="p-2 bg-[#161b22] border border-[#30363d] rounded-lg">
              <div className="text-[9px] font-mono text-[#484f58] mb-1">Budget Impact</div>
              <div className="text-xs text-[#8b949e]">{analysis.macro.budget_impact}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {analysis.macro.sector_tailwinds.length > 0 && (
              <div className="p-2 bg-[rgba(0,255,136,0.04)] border border-[rgba(0,255,136,0.2)] rounded-lg">
                <div className="text-[9px] font-mono text-[#00ff88] mb-1">Tailwinds</div>
                {analysis.macro.sector_tailwinds.map((t, i) => (
                  <div key={i} className="text-[11px] text-[#8b949e] flex gap-1"><span className="text-[#00ff88]">·</span>{t}</div>
                ))}
              </div>
            )}
            {analysis.macro.sector_headwinds.length > 0 && (
              <div className="p-2 bg-[rgba(255,68,102,0.04)] border border-[rgba(255,68,102,0.2)] rounded-lg">
                <div className="text-[9px] font-mono text-[#ff4466] mb-1">Headwinds</div>
                {analysis.macro.sector_headwinds.map((h, i) => (
                  <div key={i} className="text-[11px] text-[#8b949e] flex gap-1"><span className="text-[#ff4466]">·</span>{h}</div>
                ))}
              </div>
            )}
          </div>

          {/* Facts vs Interpretation */}
          <div className="border border-[#30363d] rounded-lg overflow-hidden">
            <div className="flex border-b border-[#30363d]">
              <div className="flex-1 px-3 py-1.5 text-[9px] font-mono uppercase tracking-wider text-[#00aaff] flex items-center gap-1">
                <Info size={9} /> Facts
              </div>
              <div className="flex-1 px-3 py-1.5 text-[9px] font-mono uppercase tracking-wider text-[#aa88ff] border-l border-[#30363d] flex items-center gap-1">
                <Zap size={9} /> Interpretations
              </div>
            </div>
            <div className="flex">
              <div className="flex-1 p-3 flex flex-col gap-1 border-r border-[#30363d]">
                {analysis.macro.facts_vs_interpretation.facts.map((f, i) => (
                  <div key={i} className="text-[11px] text-[#8b949e] flex gap-1"><span className="text-[#00aaff]">·</span>{f}</div>
                ))}
              </div>
              <div className="flex-1 p-3 flex flex-col gap-1">
                {analysis.macro.facts_vs_interpretation.interpretations.map((f, i) => (
                  <div key={i} className="text-[11px] text-[#8b949e] flex gap-1"><span className="text-[#aa88ff]">·</span>{f}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Risks & Catalysts */}
      <Section title="Risks & Catalysts" icon={AlertTriangle} accent="text-[#ff8844]">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[9px] font-mono uppercase tracking-widest text-[#ff4466] mb-2 flex items-center gap-1">
              <AlertTriangle size={9} /> Key Risks
            </div>
            {analysis.verdict.key_risks.map((r, i) => (
              <div key={i} className="flex gap-1.5 text-[11px] text-[#8b949e] mb-1.5">
                <span className="text-[#ff4466] flex-shrink-0 mt-0.5">✕</span>
                {r}
              </div>
            ))}
          </div>
          <div>
            <div className="text-[9px] font-mono uppercase tracking-widest text-[#00ff88] mb-2 flex items-center gap-1">
              <CheckCircle size={9} /> Key Catalysts
            </div>
            {analysis.verdict.key_catalysts.map((c, i) => (
              <div key={i} className="flex gap-1.5 text-[11px] text-[#8b949e] mb-1.5">
                <span className="text-[#00ff88] flex-shrink-0 mt-0.5">✓</span>
                {c}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Disclaimer */}
      <div className="text-[10px] text-[#484f58] font-mono p-3 border border-[#21262d] rounded-lg leading-relaxed">
        ⚠ This analysis is AI-generated for informational purposes only. Not investment advice.
        Past performance does not guarantee future results. Conduct independent due diligence before investing.
      </div>
    </div>
  );
}
