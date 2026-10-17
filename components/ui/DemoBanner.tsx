import { DEMO_MODE } from "@/lib/config/demo";

/**
 * Persistent label shown only in demo mode (never in production builds).
 * Anything on screen while this is visible may be generated sample data.
 */
export function DemoBanner() {
  if (!DEMO_MODE) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        padding: "6px 14px",
        borderRadius: 999,
        background: "#FF4D4D",
        color: "#050505",
        fontFamily: "ui-monospace, monospace",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        pointerEvents: "none",
      }}
    >
      Demo data — not real market data
    </div>
  );
}
