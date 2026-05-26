"use client";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label:      string;
  value:      string | number;
  subValue?:  string;
  trend?:     "up" | "down" | "neutral";
  highlight?: boolean;
  className?: string;
  mono?:      boolean;
}

export function MetricCard({
  label,
  value,
  subValue,
  trend,
  highlight,
  className,
  mono = true,
}: MetricCardProps) {
  const valueColor =
    trend === "up"   ? "#00FF9C" :
    trend === "down" ? "#FF4D4D" :
    "#F5F5F5";

  return (
    <div
      className={cn("flex flex-col gap-1.5 px-3 py-2.5 rounded-lg transition-all duration-200", className)}
      style={{
        background: highlight
          ? "rgba(255,215,0,0.04)"
          : "rgba(14,14,14,0.9)",
        border: highlight
          ? "1px solid rgba(255,215,0,0.22)"
          : "1px solid rgba(255,215,0,0.07)",
      }}
    >
      <span
        className="text-[9px] font-mono uppercase tracking-[0.12em] leading-none"
        style={{ color: "#4A4A4A" }}
      >
        {label}
      </span>
      <span
        className={cn("text-[13px] font-semibold leading-tight", mono && "font-mono")}
        style={{ color: valueColor }}
      >
        {value}
      </span>
      {subValue && (
        <span className="text-[9px] font-mono" style={{ color: "#3A3A3A" }}>
          {subValue}
        </span>
      )}
    </div>
  );
}

interface MetricRowProps {
  label:       string;
  value:       string | number;
  valueClass?: string;
  tooltip?:    string;
}

export function MetricRow({ label, value, valueClass }: MetricRowProps) {
  return (
    <div
      className="flex justify-between items-center py-2"
      style={{ borderBottom: "1px solid rgba(255,215,0,0.04)" }}
    >
      <span className="text-[11px]" style={{ color: "#6A6A6A" }}>{label}</span>
      <span
        className={cn("text-[11px] font-mono font-medium", valueClass)}
        style={{ color: valueClass ? undefined : "#F5F5F5" }}
      >
        {value}
      </span>
    </div>
  );
}
