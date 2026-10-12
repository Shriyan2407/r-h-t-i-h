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

interface SignalStrengthMeterProps {
  /** 0-100 agreement of the rule-based indicator signals. */
  signalStrength: number;
  /** Calibrated probability 0-1, or null when no validated model exists. */
  probability: number | null;
  verdict: Verdict;
}

/**
 * Shows how strongly the rule-based signals agree - explicitly NOT a probability of
 * success. The probability row says "unavailable" until a calibrated model exists, so
 * the interface never displays an invented confidence figure.
 */
export function SignalStrengthMeter({ signalStrength, probability, verdict }: SignalStrengthMeterProps) {
  const cfg = VERDICT_CONFIG[verdict];
  const value = Math.max(0, Math.min(100, Math.round(signalStrength)));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span
          title="How strongly the rule-based indicators agree with each other. It is not the probability that the call is right."
          style={{
            fontFamily: "monospace",
            fontSize: "11px",
            fontWeight: 400,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--th-text-muted)",
          }}
        >
          Signal strength
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
          {value}/100
        </span>
      </div>

      {/* Bar track */}
      <div
        className="w-full h-1.5 rounded-full overflow-hidden"
        style={{ background: "var(--border-muted)" }}
        role="meter"
        aria-label="Signal strength"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full"
          style={{
            background: cfg?.color ?? "var(--primary)",
            boxShadow: cfg?.glow,
          }}
        />
      </div>

      <p className="text-[10px] font-mono leading-snug" style={{ color: "var(--th-text-faint)" }}>
        {probability === null
          ? "Confidence unavailable: indicator agreement is not a probability, and no validated model backs this call."
          : `Model probability: ${Math.round(probability * 100)}%`}
      </p>
    </div>
  );
}
