"use client";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useWatchlistStore } from "@/store/watchlistStore";
import { cn } from "@/lib/utils";

interface WatchButtonProps {
  ticker:   string;
  name:     string;
  exchange: string;
  sector:   string;
  size?:    "sm" | "md";
  className?: string;
}

export function WatchButton({
  ticker,
  name,
  exchange,
  sector,
  size = "md",
  className,
}: WatchButtonProps) {
  // Hydration guard — localStorage only exists on client
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { toggle, isWatched } = useWatchlistStore();
  const watched = mounted ? isWatched(ticker) : false;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle({ ticker, name, exchange, sector });
  };

  const sizeClass = size === "sm" ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]";

  return (
    <button
      onClick={handleClick}
      title={watched ? "Remove from watchlist" : "Add to watchlist"}
      className={cn("flex items-center gap-1.5 font-mono rounded-lg border transition-all duration-200", sizeClass, className)}
      style={watched ? {
        color: "var(--gold)",
        background: "var(--th-border-card)",
        border: "1px solid var(--th-border-strong)",
        boxShadow: "0 0 12px rgba(255,215,0,0.12)",
      } : {
        color: "var(--th-text-muted)",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid var(--th-border-normal)",
      }}
      onMouseEnter={e => {
        if (!watched) {
          (e.currentTarget as HTMLButtonElement).style.color       = "var(--th-text-primary)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--th-border-accent)";
        }
      }}
      onMouseLeave={e => {
        if (!watched) {
          (e.currentTarget as HTMLButtonElement).style.color       = "var(--th-text-muted)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--th-border-normal)";
        }
      }}
    >
      <Star
        size={size === "sm" ? 10 : 12}
        style={{
          fill: watched ? "var(--gold)" : "none",
          color: watched ? "var(--gold)" : "currentColor",
          transition: "all 0.2s",
        }}
      />
      {watched ? "Watching" : "Watch"}
    </button>
  );
}
