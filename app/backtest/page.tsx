import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { BacktestWorkbench } from "@/components/backtest/BacktestWorkbench";

export const metadata: Metadata = {
  title: "Backtest",
  description: "Test a simple rule against NSE/BSE price history, after fees and slippage.",
};

export default function BacktestPage() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "96px 16px 64px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 6px" }}>Backtest</h1>
        <p style={{ color: "var(--muted-foreground)", margin: "0 0 28px", maxWidth: 680 }}>
          See how a simple, rule-based strategy would have behaved on historical daily prices. Signals are filled at the next day&apos;s
          open and charged fees and slippage. This is a historical simulation, not a forecast or investment advice.
        </p>
        <BacktestWorkbench />
      </main>
    </>
  );
}
