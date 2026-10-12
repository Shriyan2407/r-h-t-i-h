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
      className={cn("flex flex-col gap-2 px-4 py-3 rounded-xl transition-all duration-200", className)}
      style={{
        background: highlight
          ? "var(--th-gold-bg)"
          : "var(--th-bg-elevated)",
        border: highlight
          ? "1px solid var(--th-border-accent)"
          : "1px solid var(--th-border-subtle)",
      }}
    >
      {/* Label — subtle, uppercase, smallest */}
      <span
        className="leading-none uppercase tracking-[0.08em]"
        style={{
          fontFamily: "monospace",
          fontSize: "10px",
          fontWeight: 400,
          color: "var(--th-text-muted)",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </span>

      {/* Value — dominant number */}
      <span
        className={cn("leading-tight", mono && "font-mono")}
        style={{
          fontSize: "16px",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: valueColor,
        }}
      >
        {value}
      </span>

      {/* Sub-value — dim metadata */}
      {subValue && (
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "11px",
            fontWeight: 400,
            color: "var(--th-text-dim)",
          }}
        >
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
      className="flex justify-between items-center py-2.5"
      style={{ borderBottom: "1px solid var(--th-border-subtle)" }}
    >
      {/* Label — always muted */}
      <span
        style={{
          fontSize: "12px",
          fontWeight: 400,
          color: "var(--th-text-muted)",
        }}
      >
        {label}
      </span>

      {/* Value — always dominant */}
      <span
        className={cn("font-mono", valueClass)}
        style={{
          fontSize: "13px",
          fontWeight: 700,
          letterSpacing: "-0.01em",
          color: valueClass ? undefined : "var(--th-text-primary)",
        }}
      >
        {value}
      </span>
    </div>
  );
}
