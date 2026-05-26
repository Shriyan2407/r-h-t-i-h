import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (value >= 1_00_00_00_000) return `₹${(value / 1_00_00_00_000).toFixed(2)}L Cr`;
    if (value >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(2)} Cr`;
    if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(2)} L`;
    if (value >= 1_000) return `₹${(value / 1_000).toFixed(2)} K`;
    return `₹${value.toFixed(2)}`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatMarketCap(crores: number): string {
  if (crores >= 1_00_000) return `₹${(crores / 1_00_000).toFixed(2)}L Cr`;
  if (crores >= 1_000) return `₹${(crores / 1_000).toFixed(2)}K Cr`;
  return `₹${crores.toFixed(0)} Cr`;
}

export function formatPercent(value: number, withSign = true): string {
  const sign = withSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatVolume(value: number): string {
  if (value >= 1_00_00_000) return `${(value / 1_00_00_000).toFixed(2)} Cr`;
  if (value >= 1_00_000) return `${(value / 1_00_000).toFixed(2)} L`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function getPriceColor(change: number): string {
  if (change > 0) return "bull";
  if (change < 0) return "bear";
  return "neutral-val";
}

export function getVerdictClass(verdict: string): string {
  const map: Record<string, string> = {
    "STRONG BUY": "badge-strong-buy",
    "BUY": "badge-buy",
    "HOLD": "badge-hold",
    "SELL": "badge-sell",
    "STRONG SELL": "badge-strong-sell",
  };
  return map[verdict.toUpperCase()] ?? "badge-hold";
}

export function getSectorColor(sector: string): string {
  const colors: Record<string, string> = {
    "Technology": "#00aaff",
    "Banking": "#aa88ff",
    "Pharma": "#00ff88",
    "Auto": "#ffcc00",
    "FMCG": "#ff8844",
    "Energy": "#ff4466",
    "Infrastructure": "#44ffcc",
    "Metals": "#ff88aa",
  };
  return colors[sector] ?? "#8b949e";
}

export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}
