"use client";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { downsample, fmtInr } from "@/lib/backtest/format";
import type { EquityPoint } from "@/lib/backtest/types";

export default function EquityChart({ equity, benchmark }: { equity: EquityPoint[]; benchmark: EquityPoint[] }) {
  const bm = new Map(benchmark.map((p) => [p.date, p.equity]));
  const data = downsample(equity.map((p) => ({ date: p.date, strategy: p.equity, buyHold: bm.get(p.date) ?? null })));

  return (
    <div role="img" aria-label="Equity curve of the strategy compared with buy and hold" style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: "#909090", fontSize: 11 }} minTickGap={48} />
          <YAxis
            tick={{ fill: "#909090", fontSize: 11 }}
            width={72}
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => `${(v / 100000).toFixed(1)}L`}
          />
          <Tooltip
            contentStyle={{ background: "#111", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 8 }}
            formatter={(v) => fmtInr(typeof v === "number" ? v : null)}
          />
          <Legend />
          <Line type="monotone" dataKey="strategy" name="Strategy" stroke="#FFD700" dot={false} strokeWidth={2} isAnimationActive={false} />
          <Line type="monotone" dataKey="buyHold" name="Buy & hold" stroke="#38BDF8" dot={false} strokeWidth={1.5} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
