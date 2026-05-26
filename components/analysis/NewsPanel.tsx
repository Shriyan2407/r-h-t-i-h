"use client";
import { ExternalLink, Signal, VolumeX } from "lucide-react";
import type { NewsItem } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface NewsPanelProps {
  news: NewsItem[];
  sentimentSummary?: string;
  overallSentiment?: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED";
}

function SentimentDot({ sentiment }: { sentiment: NewsItem["sentiment"] }) {
  const colors = {
    POSITIVE: "bg-[#00ff88]",
    NEGATIVE: "bg-[#ff4466]",
    NEUTRAL: "bg-[#8b949e]",
  };
  return <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1", colors[sentiment])} />;
}

export function NewsPanel({ news, sentimentSummary, overallSentiment }: NewsPanelProps) {
  const signals = news.filter(n => n.signal_type === "SIGNAL");
  const noise = news.filter(n => n.signal_type === "NOISE");

  const sentimentColor = {
    POSITIVE: "text-[#00ff88]",
    NEGATIVE: "text-[#ff4466]",
    NEUTRAL: "text-[#8b949e]",
    MIXED: "text-[#ffcc00]",
  };

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Sentiment Summary */}
      {sentimentSummary && (
        <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-xl flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#8b949e]">
              AI Sentiment Assessment
            </span>
            {overallSentiment && (
              <span className={cn("text-[10px] font-mono font-bold", sentimentColor[overallSentiment])}>
                {overallSentiment}
              </span>
            )}
          </div>
          <p className="text-xs text-[#8b949e] leading-relaxed">{sentimentSummary}</p>
        </div>
      )}

      {/* Signal news */}
      {signals.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-[#00aaff]">
            <Signal size={10} />
            Signal ({signals.length})
          </div>
          <div className="flex flex-col gap-2">
            {signals.map(item => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Noise news */}
      {noise.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-[#484f58]">
            <VolumeX size={10} />
            Noise — filtered ({noise.length})
          </div>
          <div className="flex flex-col gap-1">
            {noise.map(item => (
              <div
                key={item.id}
                className="px-3 py-2 bg-[#161b22] border border-[#21262d] rounded-lg flex items-start gap-2 opacity-60"
              >
                <SentimentDot sentiment={item.sentiment} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-[#8b949e] line-clamp-1">{item.headline}</p>
                  <span className="text-[10px] font-mono text-[#484f58]">
                    {item.source} · {timeAgo(item.published_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {news.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-[#484f58]">
          <Newspaper size={28} className="mb-2 opacity-40" />
          <span className="text-xs font-mono">No recent news found</span>
        </div>
      )}
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const sentimentConfig = {
    POSITIVE: { badge: "bull" as const, border: "rgba(0,255,136,0.15)" },
    NEGATIVE: { badge: "bear" as const, border: "rgba(255,68,102,0.15)" },
    NEUTRAL: { badge: "dim" as const, border: "rgba(48,54,61,0.5)" },
  };
  const cfg = sentimentConfig[item.sentiment];

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col gap-2 p-3 bg-[#161b22] rounded-xl border transition-all duration-200 hover:bg-[#1c2128] group"
      style={{ borderColor: cfg.border }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-[#e6edf3] leading-relaxed group-hover:text-white transition-colors">
          {item.headline}
        </p>
        <ExternalLink size={11} className="text-[#484f58] flex-shrink-0 mt-0.5 group-hover:text-[#8b949e]" />
      </div>
      {item.summary && (
        <p className="text-[11px] text-[#8b949e] leading-relaxed line-clamp-2">{item.summary}</p>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#484f58]">{item.source}</span>
          <span className="text-[10px] font-mono text-[#484f58]">·</span>
          <span className="text-[10px] font-mono text-[#484f58]">{timeAgo(item.published_at)}</span>
        </div>
        <Badge variant={cfg.badge}>{item.sentiment}</Badge>
      </div>
    </a>
  );
}

function Newspaper({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
    </svg>
  );
}
