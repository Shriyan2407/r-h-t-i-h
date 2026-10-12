"use client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { Verdict } from "@/lib/types";

const VERDICT_CONFIG: Record<Verdict, {
  label: string;
  color: string;
  bg: string;
  border: string;
  glow: string;
  dotColor: string;
}> = {
  "STRONG BUY": {
    label: "STRONG BUY",
    color: "var(--success)",
    bg:    "var(--success-muted)",
    border:"var(--success)",
    glow:  "0 0 20px var(--success-muted)",
    dotColor: "var(--success)",
  },
  BUY: {
    label: "BUY",
    color: "var(--success)",
    bg:    "var(--success-muted)",
    border:"var(--success)",
    glow:  "0 0 16px var(--success-muted)",
    dotColor: "var(--success)",
  },
  HOLD: {
    label: "HOLD",
    color: "var(--warning)",
    bg:    "var(--warning-muted)",
    border:"var(--warning)",
    glow:  "0 0 16px var(--warning-muted)",
    dotColor: "var(--warning)",
  },
  SELL: {
    label: "SELL",
    color: "var(--danger)",
    bg:    "var(--danger-muted)",
    border:"var(--danger)",
    glow:  "0 0 16px var(--danger-muted)",
    dotColor: "var(--danger)",
  },
  "STRONG SELL": {
    label: "STRONG SELL",
    color: "var(--danger)",
    bg:    "var(--danger-muted)",
    border:"var(--danger)",
    glow:  "0 0 20px var(--danger-muted)",
    dotColor: "var(--danger)",
  },
};

interface VerdictBadgeProps {
  verdict: Verdict;
  size?: "sm" | "md" | "lg";
  showDot?: boolean;
  className?: string;
}

export function VerdictBadge({
  verdict,
  size = "md",
  showDot = true,
  className,
}: VerdictBadgeProps) {
  const cfg = VERDICT_CONFIG[verdict];
  if (!cfg) return null;

  const sizeStyles = {
    sm: { padding: "3px 10px",  fontSize: "10px", gap: "5px",  dotSize: 6  },
    md: { padding: "5px 13px",  fontSize: "12px", gap: "6px",  dotSize: 7  },
    lg: { padding: "7px 18px",  fontSize: "15px", gap: "8px",  dotSize: 9  },
  }[size];

  return (
    <span
      className={cn("inline-flex items-center font-mono font-bold uppercase tracking-wider rounded-md", className)}
      style={{
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        boxShadow: cfg.glow,
        padding: sizeStyles.padding,
        fontSize: sizeStyles.fontSize,
        gap: sizeStyles.gap,
      }}
    >
      {showDot && (
        <span
          className="rounded-full flex-shrink-0 animate-live-dot"
          style={{
            width:  sizeStyles.dotSize,
            height: sizeStyles.dotSize,
            background: cfg.dotColor,
          }}
        />
      )}
      {cfg.label}
    </span>
  );
}

interface ConfidenceMeterProps {
  confidence: number;
  verdict: Verdict;
}

export function ConfidenceMeter({ confidence, verdict }: ConfidenceMeterProps) {
  const cfg = VERDICT_CONFIG[verdict];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "11px",
            fontWeight: 400,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--th-text-muted)",
          }}
        >
          AI Confidence
        </span>
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "15px",
            fontWeight: 700,
            color: cfg?.color ?? "var(--th-text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          {confidence}%
        </span>
      </div>

      {/* Bar track */}
      <div
        className="w-full h-1.5 rounded-full overflow-hidden"
        style={{ background: "var(--border-muted)" }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${confidence}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full"
          style={{
            background: cfg?.color ?? "var(--primary)",
            boxShadow: cfg?.glow,
          }}
        />
      </div>

      {/* Segment dots */}
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-sm transition-all duration-300"
            style={{
              background: i < Math.round(confidence / 10)
                ? cfg?.color ?? "var(--primary)"
                : "var(--border-muted)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
