"use client";
import Link from "next/link";
import { getRelatedIntelligence } from "@/lib/search/searchEngine";
import { useTheme } from "@/lib/context/ThemeContext";

interface Props {
  ticker: string;
}

export function RelatedIntelligence({ ticker }: Props) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const related = getRelatedIntelligence(ticker);

  const hasPeers   = related.peers.length > 0;
  const hasThemes  = related.themes.length > 0;
  const hasSector  = related.sector !== null;
  const hasAlso    = related.alsoSearched.length > 0;

  if (!hasPeers && !hasThemes && !hasSector) return null;

  return (
    <div
      className="max-w-[1600px] mx-auto w-full px-4 sm:px-6 py-4"
    >
      <div
        className="rounded-xl p-4"
        style={{
          background: "var(--th-bg-elevated)",
          border: "1px solid var(--th-border-card)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className="text-[10px] font-mono uppercase tracking-[0.18em]"
            style={{ color: "var(--th-text-faint)" }}
          >
            ◈ Related Intelligence
          </span>
          <div
            className="flex-1 h-px"
            style={{ background: "var(--th-border-subtle)" }}
          />
        </div>

        <div className="flex flex-wrap gap-6">

          {/* Peer Stocks */}
          {hasPeers && (
            <div className="flex flex-col gap-2 min-w-0">
              <span
                className="text-[9px] font-mono uppercase tracking-widest"
                style={{ color: "var(--th-text-ultra-faint)" }}
              >
                Peer Stocks
              </span>
              <div className="flex flex-wrap gap-1.5">
                {related.peers.map(peer => (
                  <Link
                    key={peer}
                    href={`/stock/${peer}`}
                    className="px-3 py-1 rounded-lg text-[11px] font-mono font-medium transition-all duration-150"
                    style={{
                      background: "var(--th-border-card)",
                      border: "1px solid var(--th-border-subtle)",
                      color: "var(--th-text-secondary)",
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.borderColor = "var(--gold-border-soft)";
                      el.style.color       = "var(--gold)";
                      el.style.background  = "var(--th-gold-bg)";
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.borderColor = "var(--th-border-subtle)";
                      el.style.color       = "var(--th-text-secondary)";
                      el.style.background  = "var(--th-border-card)";
                    }}
                  >
                    {peer}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Sector */}
          {hasSector && (
            <div className="flex flex-col gap-2">
              <span
                className="text-[9px] font-mono uppercase tracking-widest"
                style={{ color: "var(--th-text-ultra-faint)" }}
              >
                Sector
              </span>
              <Link
                href={`/stock/${related.sector!.id}`}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-mono transition-all duration-150 w-fit"
                style={{
                  background: "var(--th-border-card)",
                  border: "1px solid var(--th-border-subtle)",
                  color: "var(--th-text-secondary)",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.borderColor = "var(--gold-border-soft)";
                  el.style.color       = "var(--gold)";
                  el.style.background  = "var(--th-gold-bg)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.borderColor = "var(--th-border-subtle)";
                  el.style.color       = "var(--th-text-secondary)";
                  el.style.background  = "var(--th-border-card)";
                }}
              >
                <span>{related.sector!.icon}</span>
                <span>{related.sector!.name}</span>
              </Link>
            </div>
          )}

          {/* Themes */}
          {hasThemes && (
            <div className="flex flex-col gap-2">
              <span
                className="text-[9px] font-mono uppercase tracking-widest"
                style={{ color: "var(--th-text-ultra-faint)" }}
              >
                Themes
              </span>
              <div className="flex flex-wrap gap-1.5">
                {related.themes.map(theme => (
                  <span
                    key={theme.id}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-mono"
                    style={{
                      background: "var(--th-gold-bg)",
                      border: "1px solid var(--th-border-accent)",
                      color: "var(--gold)",
                    }}
                  >
                    ◈ {theme.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Also searched */}
          {hasAlso && (
            <div className="flex flex-col gap-2">
              <span
                className="text-[9px] font-mono uppercase tracking-widest"
                style={{ color: "var(--th-text-ultra-faint)" }}
              >
                Also Searched
              </span>
              <div className="flex flex-wrap gap-1.5">
                {related.alsoSearched.map(q => (
                  <Link
                    key={q}
                    href="/"
                    className="px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all duration-150"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--th-border-subtle)",
                      color: "var(--th-text-faint)",
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.color       = "var(--th-text-secondary)";
                      el.style.borderColor = "var(--th-border-card)";
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.color       = "var(--th-text-faint)";
                      el.style.borderColor = "var(--th-border-subtle)";
                    }}
                  >
                    ↗ {q}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
