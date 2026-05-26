"use client";
import { AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import type { FundamentalData, FundamentalRedFlag } from "@/lib/types";
import { MetricRow } from "@/components/ui/MetricCard";
import { cn } from "@/lib/utils";

interface FundamentalsPanelProps {
  data: FundamentalData;
  redFlags?: FundamentalRedFlag[];
  summary?: string;
  strengths?: string[];
  valuationAssessment?: string;
}

function val(v: number | null, suffix = "", prefix = ""): string {
  if (v === null || v === undefined) return "N/A";
  return `${prefix}${v.toFixed(2)}${suffix}`;
}

function pct(v: number | null): string {
  if (v === null) return "N/A";
  return `${v.toFixed(1)}%`;
}

function RedFlagItem({ flag }: { flag: FundamentalRedFlag }) {
  const colors: Record<string, string> = {
    HIGH: "text-[#ff4466] border-[rgba(255,68,102,0.3)] bg-[rgba(255,68,102,0.05)]",
    MEDIUM: "text-[#ff8844] border-[rgba(255,136,68,0.3)] bg-[rgba(255,136,68,0.05)]",
    LOW: "text-[#ffcc00] border-[rgba(255,204,0,0.3)] bg-[rgba(255,204,0,0.05)]",
  };

  return (
    <div className={cn("flex items-start gap-2 px-3 py-2 rounded-lg border text-xs", colors[flag.severity])}>
      <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
      <div>
        <span className="font-mono font-semibold text-[9px] uppercase tracking-wider block mb-0.5">
          {flag.category} · {flag.severity} RISK
        </span>
        {flag.flag}
      </div>
    </div>
  );
}

function PromoterBar({ value, pledged }: { value: number | null; pledged: number | null }) {
  if (value === null) return <span className="text-xs text-[#484f58]">N/A</span>;
  const good = value >= 50;
  const pledgeConcern = pledged !== null && pledged > 10;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[11px] font-mono">
        <span className={good ? "text-[#00ff88]" : "text-[#ffcc00]"}>{value.toFixed(1)}%</span>
        {pledged !== null && (
          <span className={pledgeConcern ? "text-[#ff4466]" : "text-[#8b949e]"}>
            Pledged: {pledged.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="relative h-2 bg-[#21262d] rounded-full overflow-hidden">
        <div
          className="absolute h-full rounded-full"
          style={{
            width: `${value}%`,
            background: good ? "#00ff88" : "#ffcc00",
          }}
        />
        {pledged !== null && pledged > 0 && (
          <div
            className="absolute h-full rounded-full bg-[#ff4466] opacity-60"
            style={{ width: `${Math.min(pledged, value)}%` }}
          />
        )}
      </div>
    </div>
  );
}

export function FundamentalsPanel({
  data,
  redFlags = [],
  summary,
  strengths = [],
  valuationAssessment,
}: FundamentalsPanelProps) {
  return (
    <div className="flex flex-col gap-5 p-4">
      {/* AI Summary */}
      {summary && (
        <div className="px-4 py-3 bg-[#161b22] border border-[#30363d] rounded-xl text-sm text-[#8b949e] leading-relaxed">
          {summary}
        </div>
      )}

      {/* Red Flags */}
      {redFlags.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#ff4466] flex items-center gap-1">
            <AlertTriangle size={10} /> Red Flags ({redFlags.length})
          </span>
          <div className="flex flex-col gap-1.5">
            {redFlags.map((f, i) => (
              <RedFlagItem key={i} flag={f} />
            ))}
          </div>
        </div>
      )}

      {/* Strengths */}
      {strengths.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#00ff88] flex items-center gap-1">
            <CheckCircle size={10} /> Strengths
          </span>
          <div className="flex flex-col gap-1.5">
            {strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg border border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.04)] text-xs text-[#00ff88]">
                <CheckCircle size={11} className="mt-0.5 flex-shrink-0" />
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Valuation */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#8b949e]">Valuation</span>
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 flex flex-col gap-0">
          <MetricRow
            label="P/E Ratio"
            value={val(data.pe_ratio, "x")}
            valueClass={data.pe_ratio && data.sector_pe && data.pe_ratio > data.sector_pe * 1.2 ? "text-[#ffcc00]" : "text-[#e6edf3]"}
          />
          <MetricRow label="Sector P/E" value={val(data.sector_pe, "x")} valueClass="text-[#8b949e]" />
          <MetricRow label="P/B Ratio" value={val(data.pb_ratio, "x")} />
          <MetricRow label="P/S Ratio" value={val(data.ps_ratio, "x")} />
          <MetricRow label="EV/EBITDA" value={val(data.ev_ebitda, "x")} />
        </div>
        {valuationAssessment && (
          <div className="text-xs text-[#8b949e] px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-lg">
            {valuationAssessment}
          </div>
        )}
      </div>

      {/* Profitability */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#8b949e]">Profitability</span>
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3">
          <MetricRow label="ROE" value={pct(data.roe)} valueClass={data.roe && data.roe >= 15 ? "text-[#00ff88]" : data.roe && data.roe < 10 ? "text-[#ff4466]" : "text-[#ffcc00]"} />
          <MetricRow label="ROCE" value={pct(data.roce)} />
          <MetricRow label="Net Margin" value={pct(data.net_margin)} valueClass={data.net_margin && data.net_margin >= 10 ? "text-[#00ff88]" : "text-[#e6edf3]"} />
          <MetricRow label="Operating Margin" value={pct(data.operating_margin)} />
          <MetricRow label="Gross Margin" value={pct(data.gross_margin)} />
        </div>
      </div>

      {/* Growth */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#8b949e] flex items-center gap-1">
          <TrendingUp size={10} /> Growth
        </span>
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3">
          <MetricRow label="Revenue Growth YoY" value={pct(data.revenue_growth_yoy)} valueClass={data.revenue_growth_yoy && data.revenue_growth_yoy > 0 ? "text-[#00ff88]" : "text-[#ff4466]"} />
          <MetricRow label="Profit Growth YoY" value={pct(data.profit_growth_yoy)} valueClass={data.profit_growth_yoy && data.profit_growth_yoy > 0 ? "text-[#00ff88]" : "text-[#ff4466]"} />
          <MetricRow label="EPS Growth (3Y CAGR)" value={pct(data.eps_growth_3yr)} valueClass={data.eps_growth_3yr && data.eps_growth_3yr > 10 ? "text-[#00ff88]" : "text-[#e6edf3]"} />
        </div>
      </div>

      {/* Financial Health */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#8b949e]">Financial Health</span>
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3">
          <MetricRow label="Debt/Equity" value={val(data.debt_to_equity, "x")} valueClass={data.debt_to_equity !== null && data.debt_to_equity > 1 ? "text-[#ff4466]" : "text-[#00ff88]"} />
          <MetricRow label="Current Ratio" value={val(data.current_ratio, "x")} valueClass={data.current_ratio !== null && data.current_ratio >= 1.5 ? "text-[#00ff88]" : "text-[#ffcc00]"} />
          <MetricRow label="Interest Coverage" value={val(data.interest_coverage, "x")} valueClass={data.interest_coverage !== null && data.interest_coverage > 3 ? "text-[#00ff88]" : "text-[#ff4466]"} />
          <MetricRow label="Free Cash Flow" value={data.free_cash_flow !== null ? `₹${(data.free_cash_flow / 1e7).toFixed(1)} Cr` : "N/A"} valueClass={data.free_cash_flow !== null && data.free_cash_flow > 0 ? "text-[#00ff88]" : "text-[#ff4466]"} />
        </div>
      </div>

      {/* Ownership */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#8b949e]">Shareholding</span>
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 flex flex-col gap-2">
          <div>
            <div className="flex justify-between text-[10px] font-mono text-[#8b949e] mb-1">
              <span>Promoter Holding</span>
            </div>
            <PromoterBar value={data.promoter_holding} pledged={data.pledged_shares} />
          </div>
          <MetricRow label="FII Holding" value={pct(data.fii_holding)} />
          <MetricRow label="DII Holding" value={pct(data.dii_holding)} />
          <MetricRow
            label="Pledged Shares"
            value={pct(data.pledged_shares)}
            valueClass={data.pledged_shares !== null && data.pledged_shares > 20 ? "text-[#ff4466]" : data.pledged_shares !== null && data.pledged_shares > 5 ? "text-[#ffcc00]" : "text-[#00ff88]"}
          />
        </div>
      </div>
    </div>
  );
}
