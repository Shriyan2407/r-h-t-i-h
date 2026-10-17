import { rsi, sma } from "./indicators";
import type { Bar, Position, Strategy } from "./types";

export const buyAndHold: Strategy = {
  id: "buy_and_hold",
  label: "Buy and hold",
  warmup: 0,
  positions: (bars) => bars.map(() => 1 as Position),
};

export function smaCrossover(fast = 20, slow = 50): Strategy {
  if (!(fast < slow)) throw new Error("fast period must be shorter than slow period");
  return {
    id: `sma_cross_${fast}_${slow}`,
    label: `SMA crossover (${fast}/${slow})`,
    warmup: slow,
    positions(bars: readonly Bar[]) {
      const closes = bars.map((b) => b.close);
      const f = sma(closes, fast);
      const s = sma(closes, slow);
      return closes.map((_, i) => (Number.isNaN(s[i]) ? 0 : f[i] > s[i] ? 1 : 0) as Position);
    },
  };
}

/** Long when RSI drops below `entry`; flat when it rises above `exit`. Stateful but causal. */
export function rsiMeanReversion(period = 14, entry = 30, exit = 55): Strategy {
  return {
    id: `rsi_mr_${period}_${entry}_${exit}`,
    label: `RSI mean reversion (${period}, buy<${entry}, sell>${exit})`,
    warmup: period + 1,
    positions(bars: readonly Bar[]) {
      const r = rsi(bars.map((b) => b.close), period);
      let pos: Position = 0;
      return r.map((v) => {
        if (!Number.isNaN(v)) {
          if (pos === 0 && v < entry) pos = 1;
          else if (pos === 1 && v > exit) pos = 0;
        }
        return pos;
      });
    },
  };
}

export const STRATEGY_IDS = ["buy_and_hold", "sma_crossover", "rsi_mean_reversion"] as const;
export type StrategyId = (typeof STRATEGY_IDS)[number];

export function strategyFromId(id: StrategyId): Strategy {
  switch (id) {
    case "buy_and_hold":
      return buyAndHold;
    case "sma_crossover":
      return smaCrossover();
    case "rsi_mean_reversion":
      return rsiMeanReversion();
  }
}
