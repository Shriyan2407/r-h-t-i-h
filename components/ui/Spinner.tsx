"use client";
import { cn } from "@/lib/utils";

export function Spinner({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-10 h-10" }[size];

  return (
    <div
      className={cn("rounded-full animate-spin", dims, className)}
      style={{
        border: "1.5px solid rgba(255,215,0,0.12)",
        borderTopColor: "#FFD700",
      }}
    />
  );
}

export function LoadingBlock({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <Spinner size="md" />
      <span
        className="text-[9.5px] font-mono uppercase tracking-[0.16em]"
        style={{ color: "#4A4A4A" }}
      >
        {message}
      </span>
    </div>
  );
}

export function SkeletonBox({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded skeleton", className)}
      style={{ minHeight: "12px" }}
    />
  );
}
