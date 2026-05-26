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
        color: "#FFD700",
        background: "rgba(255,215,0,0.08)",
        border: "1px solid rgba(255,215,0,0.35)",
        boxShadow: "0 0 12px rgba(255,215,0,0.12)",
      } : {
        color: "#6A6A6A",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,215,0,0.1)",
      }}
      onMouseEnter={e => {
        if (!watched) {
          (e.currentTarget as HTMLButtonElement).style.color       = "#F5F5F5";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,215,0,0.25)";
        }
      }}
      onMouseLeave={e => {
        if (!watched) {
          (e.currentTarget as HTMLButtonElement).style.color       = "#6A6A6A";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,215,0,0.1)";
        }
      }}
    >
      <Star
        size={size === "sm" ? 10 : 12}
        style={{
          fill: watched ? "#FFD700" : "none",
          color: watched ? "#FFD700" : "currentColor",
          transition: "all 0.2s",
        }}
      />
      {watched ? "Watching" : "Watch"}
    </button>
  );
}
