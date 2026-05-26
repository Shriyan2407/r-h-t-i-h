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
  default: { color: "#F5F5F5", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,215,0,0.1)"   },
  bull:    { color: "#00FF9C", background: "rgba(0,255,156,0.07)",   border: "1px solid rgba(0,255,156,0.2)"   },
  bear:    { color: "#FF4D4D", background: "rgba(255,77,77,0.07)",   border: "1px solid rgba(255,77,77,0.2)"   },
  neutral: { color: "#FFB800", background: "rgba(255,184,0,0.07)",   border: "1px solid rgba(255,184,0,0.2)"   },
  gold:    { color: "#FFD700", background: "rgba(255,215,0,0.07)",   border: "1px solid rgba(255,215,0,0.22)"  },
  dim:     { color: "#4A4A4A", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)"},
  blue:    { color: "#38BDF8", background: "rgba(56,189,248,0.07)",  border: "1px solid rgba(56,189,248,0.2)"  },
  purple:  { color: "#C084FC", background: "rgba(192,132,252,0.07)", border: "1px solid rgba(192,132,252,0.2)" },
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
