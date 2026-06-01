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
    trend === "up"   ? "var(--positive)" :
    trend === "down" ? "var(--negative)" :
    "var(--th-text-primary)";

  return (
    <div
      className={cn("flex flex-col gap-1.5 px-3 py-2.5 rounded-lg transition-all duration-200", className)}
      style={{
        background: highlight
          ? "var(--th-gold-bg)"
          : "var(--th-bg-elevated)",
        border: highlight
          ? "1px solid var(--th-border-accent)"
          : "1px solid var(--th-border-subtle)",
      }}
    >
      <span
        className="text-[9.5px] font-mono font-semibold uppercase tracking-[0.10em] leading-none"
        style={{ color: "var(--th-text-muted)" }}
      >
        {label}
      </span>
      <span
        className={cn("text-[14px] font-bold leading-tight", mono && "font-mono")}
        style={{ color: valueColor }}
      >
        {value}
      </span>
      {subValue && (
        <span className="text-[10px] font-mono font-medium" style={{ color: "var(--th-text-dim)" }}>
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
      style={{ borderBottom: "1px solid var(--th-border-subtle)" }}
    >
      <span className="text-[11.5px] font-medium" style={{ color: "var(--th-text-secondary)" }}>{label}</span>
      <span
        className={cn("text-[12px] font-mono font-semibold", valueClass)}
        style={{ color: valueClass ? undefined : "var(--th-text-primary)" }}
      >
        {value}
      </span>
    </div>
  );
}
