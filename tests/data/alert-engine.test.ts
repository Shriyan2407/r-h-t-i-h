import { describe, it, expect, vi, beforeEach } from "vitest";

/** In-memory stand-in for prisma.alertHistory so the de-duplication logic runs for real. */
type Row = { userId: string; type: string; ticker: string | null; sentAt: Date; message: string };

const m = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  prefs: [] as Array<Record<string, unknown>>,
  quote: vi.fn(),
  tgSendToUser: vi.fn(),
  sendPushToUser: vi.fn(),
}));

vi.mock("@/lib/auth/prisma", () => ({
  prisma: {
    alertPreference: { findMany: async () => m.prefs },
    alertHistory: {
      findFirst: async ({ where }: { where: { userId: string; type: string; ticker?: string; sentAt: { gte: Date } } }) =>
        (m.rows as unknown as Row[]).find(
          (r) =>
            r.userId === where.userId &&
            r.type === where.type &&
            (where.ticker === undefined || r.ticker === where.ticker) &&
            r.sentAt >= where.sentAt.gte,
        ) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        m.rows.push({ ...data, sentAt: new Date() });
        return data;
      },
    },
  },
}));
vi.mock("@/lib/services/pushService", () => ({ sendPushToUser: m.sendPushToUser }));
vi.mock("@/lib/services/newsAggregator", () => ({ getStockNews: async () => [] }));
vi.mock("@/lib/services/marketSnapshot", () => ({ getMarketSnapshot: vi.fn() }));
vi.mock("@/lib/services/telegramService", async (orig) => {
  const real = await orig<typeof import("@/lib/services/telegramService")>();
  return { ...real, tgSendToUser: m.tgSendToUser };
});
vi.mock("yahoo-finance2", () => ({
  default: class {
    quote = m.quote;
    quoteSummary = async () => {
      throw new Error("no earnings data in test");
    };
  },
}));

import {
  detectBreakout,
  detectBreakdown,
  detectVolumeSpike,
  detectMomentum,
  processMarketAlerts,
  type QuoteData,
} from "@/lib/services/alertEngine";
import { fmtMomentumAlert, fmtBreakout, fmtBreakdown } from "@/lib/services/telegramService";

const quote = (over: Partial<QuoteData> = {}): QuoteData => ({
  ticker: "TCS", price: 100, previousClose: 100, fiftyTwoWeekHigh: 120, fiftyTwoWeekLow: 80,
  volume: 1000, averageVolume: 1000, changePercent: 0, ...over,
});

describe("price-level detectors", () => {
  it("breakout fires at or within 0.2% of the 52-week high, not before", () => {
    expect(detectBreakout(quote({ price: 120 }))).toBe(true);
    expect(detectBreakout(quote({ price: 120.5 }))).toBe(true);
    expect(detectBreakout(quote({ price: 119.8 }))).toBe(true); // within 0.2%
    expect(detectBreakout(quote({ price: 119 }))).toBe(false);
  });
  it("breakdown fires at or within 0.2% of the 52-week low", () => {
    expect(detectBreakdown(quote({ price: 80 }))).toBe(true);
    expect(detectBreakdown(quote({ price: 80.15 }))).toBe(true);
    expect(detectBreakdown(quote({ price: 81 }))).toBe(false);
  });
  it("volume spike needs 3x the average and tolerates a zero average", () => {
    expect(detectVolumeSpike(quote({ volume: 3000 })).spiked).toBe(true);
    expect(detectVolumeSpike(quote({ volume: 2999 })).spiked).toBe(false);
    expect(detectVolumeSpike(quote({ volume: 5, averageVolume: 0 }))).toEqual({ spiked: false, multiple: 1 });
  });
});

describe("detectMomentum", () => {
  const heavy = { volume: 2000, averageVolume: 1000 };
  it("fires UP only for >2.5% rise, heavy volume AND upper part of the range", () => {
    expect(detectMomentum(quote({ ...heavy, changePercent: 3, price: 110 })).direction).toBe("up");
    expect(detectMomentum(quote({ ...heavy, changePercent: 2.4, price: 110 })).direction).toBeNull();
    expect(detectMomentum(quote({ changePercent: 3, price: 110 })).direction).toBeNull(); // normal volume
    expect(detectMomentum(quote({ ...heavy, changePercent: 3, price: 85 })).direction).toBeNull(); // lower range
  });
  it("fires DOWN only for >2.5% fall, heavy volume AND lower part of the range", () => {
    expect(detectMomentum(quote({ ...heavy, changePercent: -3, price: 85 })).direction).toBe("down");
    expect(detectMomentum(quote({ ...heavy, changePercent: -3, price: 115 })).direction).toBeNull();
  });
  it("reports the measured facts", () => {
    const r = detectMomentum(quote({ ...heavy, changePercent: 3, price: 110 }));
    expect(r.volumeMultiple).toBe(2);
    expect(r.rangePositionPct).toBeCloseTo(75, 5);
  });
  it("survives a degenerate 52-week range and zero average volume without NaN", () => {
    const r = detectMomentum(quote({ fiftyTwoWeekHigh: 100, fiftyTwoWeekLow: 100, averageVolume: 0, changePercent: 5 }));
    expect(r.direction).toBeNull();
    expect(Number.isFinite(r.rangePositionPct)).toBe(true);
    expect(Number.isFinite(r.volumeMultiple)).toBe(true);
  });
});

describe("alert messages state facts, never invented advice", () => {
  const momentum = fmtMomentumAlert({
    ticker: "TCS", direction: "up", price: 110, changePercent: 3.2, volumeMultiple: 2.1, rangePositionPct: 75,
  });

  it("momentum alert has no confidence, target or stop-loss", () => {
    for (const forbidden of [/confidence/i, /target/i, /stop[- ]?loss/i, /\bT1\b/, /\b(72|68)%/, /buy now/i, /act fast/i]) {
      expect(momentum).not.toMatch(forbidden);
    }
    expect(momentum).toContain("not a forecast or a recommendation");
    expect(momentum).toContain("+3.20% today");
    expect(momentum).toContain("2.1x");
  });

  it("52-week messages say 'Above' only when the level is actually exceeded", () => {
    expect(fmtBreakout("TCS", 121, 120)).toContain("Above its 52-week high");
    expect(fmtBreakout("TCS", 119.9, 120)).toContain("Within 0.2% of its 52-week high");
    expect(fmtBreakout("TCS", 119.9, 120)).not.toMatch(/Broke Above/i);
    expect(fmtBreakdown("TCS", 79, 80)).toContain("Below its 52-week low");
    expect(fmtBreakdown("TCS", 80.1, 80)).toContain("Within 0.2% of its 52-week low");
  });

  it("no longer tells users to act", () => {
    for (const msg of [fmtBreakout("X", 1, 1), fmtBreakdown("X", 1, 1)]) {
      expect(msg).not.toMatch(/act fast|consider (a )?trailing stop|exit/i);
    }
  });
});

describe("processMarketAlerts end to end (fake history, real de-duplication)", () => {
  const user = (id: string, watch: string[], over: Record<string, unknown> = {}) => ({
    userId: id,
    telegramEnabled: true, pushEnabled: false, tier: "free", watchlistOnly: true,
    breakoutAlerts: true, breakdownAlerts: true, volumeAlerts: false,
    aiBuySignals: true, aiSellSignals: true, earningsAlerts: false, macroNews: false,
    user: { watchlist: watch.map((ticker) => ({ ticker })) },
    ...over,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    m.rows.length = 0;
    m.prefs = [];
    m.tgSendToUser.mockResolvedValue({ ok: true });
    m.sendPushToUser.mockResolvedValue(undefined);
    m.quote.mockImplementation(async (sym: string) => ({
      regularMarketPrice: 120, regularMarketPreviousClose: 118,
      fiftyTwoWeekHigh: 120, fiftyTwoWeekLow: 80,
      regularMarketVolume: 1000, averageDailyVolume3Month: 1000,
      regularMarketChangePercent: 1.2, regularMarketDayHigh: 120, regularMarketDayLow: 118,
      symbol: sym,
    }));
  });

  it("alerts a watching user once, then de-duplicates the next run", async () => {
    m.prefs = [user("u1", ["TCS"])];

    const first = await processMarketAlerts();
    expect(first.breakdown.price).toBe(1);
    expect(m.tgSendToUser).toHaveBeenCalledTimes(1);
    expect(m.rows).toHaveLength(1);
    expect(m.rows[0]).toMatchObject({ userId: "u1", type: "breakout", ticker: "TCS" });

    const second = await processMarketAlerts();
    expect(second.breakdown.price).toBe(0);
    expect(m.tgSendToUser).toHaveBeenCalledTimes(1);
    expect(m.rows).toHaveLength(1);
  });

  it("respects per-user preferences and watchlists", async () => {
    m.prefs = [
      user("wants", ["TCS"]),
      user("off", ["TCS"], { breakoutAlerts: false }),
      user("other", ["INFY"]),
    ];
    m.quote.mockImplementation(async (sym: string) => ({
      regularMarketPrice: sym.startsWith("TCS") ? 120 : 90, regularMarketPreviousClose: 100,
      fiftyTwoWeekHigh: 120, fiftyTwoWeekLow: 80, regularMarketVolume: 1, averageDailyVolume3Month: 1,
      regularMarketChangePercent: 0, regularMarketDayHigh: 120, regularMarketDayLow: 90,
    }));
    await processMarketAlerts();

    const recipients = (m.rows as unknown as Row[]).map((r) => r.userId);
    expect(recipients).toEqual(["wants"]); // 'off' disabled breakouts, 'other' watches a ticker that is not near its high
  });

  it("sends momentum alerts to paid tiers only, with facts and no invented confidence", async () => {
    m.quote.mockImplementation(async () => ({
      regularMarketPrice: 110, regularMarketPreviousClose: 100,
      fiftyTwoWeekHigh: 120, fiftyTwoWeekLow: 80,
      regularMarketVolume: 3000, averageDailyVolume3Month: 1000,
      regularMarketChangePercent: 4, regularMarketDayHigh: 110, regularMarketDayLow: 100,
    }));
    m.prefs = [
      user("free", ["TCS"], { breakoutAlerts: false, breakdownAlerts: false, tier: "free" }),
      user("pro", ["TCS"], { breakoutAlerts: false, breakdownAlerts: false, tier: "pro" }),
    ];
    await processMarketAlerts();

    const rows = m.rows as unknown as Row[];
    expect(rows.map((r) => r.userId)).toEqual(["pro"]);
    expect(rows[0].type).toBe("ai_buy"); // legacy type name kept for compatibility
    const telegram = String(m.tgSendToUser.mock.calls[0][1]);
    expect(telegram).toContain("MOMENTUM ALERT");
    expect(telegram).not.toMatch(/confidence|target|stop[- ]?loss|\bAI\b buy/i);
    expect(rows[0].message).not.toMatch(/target|AI buy signal/i);
  });

  it("does nothing when nobody has alerts enabled", async () => {
    expect(await processMarketAlerts()).toEqual({ processed: 0, alerts: 0, breakdown: { price: 0, news: 0, earnings: 0 } });
    expect(m.tgSendToUser).not.toHaveBeenCalled();
  });
});
