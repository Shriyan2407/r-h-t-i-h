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
    color: "#00FF9C",
    bg:    "rgba(0,255,156,0.09)",
    border:"rgba(0,255,156,0.28)",
    glow:  "0 0 20px rgba(0,255,156,0.2)",
    dotColor: "#00FF9C",
  },
  BUY: {
    label: "BUY",
    color: "#34D399",
    bg:    "rgba(52,211,153,0.08)",
    border:"rgba(52,211,153,0.22)",
    glow:  "0 0 16px rgba(52,211,153,0.15)",
    dotColor: "#34D399",
  },
  HOLD: {
    label: "HOLD",
    color: "#FFB800",
    bg:    "rgba(255,184,0,0.08)",
    border:"rgba(255,184,0,0.22)",
    glow:  "0 0 16px rgba(255,184,0,0.15)",
    dotColor: "#FFB800",
  },
  SELL: {
    label: "SELL",
    color: "#FF7A00",
    bg:    "rgba(255,122,0,0.08)",
    border:"rgba(255,122,0,0.22)",
    glow:  "0 0 16px rgba(255,122,0,0.15)",
    dotColor: "#FF7A00",
  },
  "STRONG SELL": {
    label: "STRONG SELL",
    color: "#FF4D4D",
    bg:    "rgba(255,77,77,0.09)",
    border:"rgba(255,77,77,0.28)",
    glow:  "0 0 20px rgba(255,77,77,0.2)",
    dotColor: "#FF4D4D",
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
    sm: { padding: "2px 8px",  fontSize: "9px",  gap: "4px",  dotSize: 6  },
    md: { padding: "4px 12px", fontSize: "11px", gap: "6px",  dotSize: 7  },
    lg: { padding: "6px 16px", fontSize: "13px", gap: "8px",  dotSize: 8  },
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
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span
          className="text-[9.5px] font-mono font-semibold uppercase tracking-[0.10em]"
          style={{ color: "var(--th-text-muted)" }}
        >
          AI Confidence
        </span>
        <span
          className="text-[13px] font-mono font-bold"
          style={{ color: cfg?.color ?? "var(--th-text-primary)" }}
        >
          {confidence}%
        </span>
      </div>

      {/* Bar track */}
      <div
        className="w-full h-1.5 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.05)" }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${confidence}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${cfg?.color}88, ${cfg?.color})`,
            boxShadow: `0 0 8px ${cfg?.color}50`,
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
                ? cfg?.color ?? "#FFD700"
                : "rgba(255,255,255,0.04)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
