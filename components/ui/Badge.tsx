"use client";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "bull" | "bear" | "neutral" | "gold" | "dim" | "blue" | "purple";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: BadgeVariant;
  size?: "sm" | "md";
}

const VARIANT_STYLES: Record<BadgeVariant, React.CSSProperties> = {
  default: { color: "var(--th-text-primary)", background: "var(--border-muted)", border: "1px solid var(--border)"   },
  bull:    { color: "var(--success)",         background: "var(--success-muted)", border: "1px solid var(--success-faint)"   },
  bear:    { color: "var(--danger)",          background: "var(--danger-muted)",  border: "1px solid var(--danger-faint)"   },
  neutral: { color: "var(--warning)",         background: "var(--warning-muted)", border: "1px solid var(--warning-faint)"   },
  gold:    { color: "var(--primary)",         background: "var(--primary-muted)", border: "1px solid var(--border-accent)"  },
  dim:     { color: "var(--th-text-muted)",   background: "var(--bg-accent-faint)", border: "1px solid var(--border-muted)"},
  blue:    { color: "var(--info, #38BDF8)",   background: "var(--info-muted, rgba(56,189,248,0.07))", border: "1px solid var(--info-faint, rgba(56,189,248,0.2))"  },
  purple:  { color: "var(--purple, #C084FC)", background: "var(--purple-muted, rgba(192,132,252,0.07))", border: "1px solid var(--purple-faint, rgba(192,132,252,0.2))" },
};

export function Badge({ children, className, variant = "default", size = "sm" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-mono font-medium rounded uppercase tracking-wider",
        size === "sm" ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5",
        className
      )}
      style={VARIANT_STYLES[variant]}
    >
      {children}
    </span>
  );
}
