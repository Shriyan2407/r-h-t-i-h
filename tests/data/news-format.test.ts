import { describe, expect, it } from "vitest";
import { detectCategory, extractTickers, feedStats, timeAgo } from "@/lib/news/format";
import type { NewsItem } from "@/lib/services/newsAggregator";

const item = (title: string, sentiment: NewsItem["sentiment"], ageHours = 1): NewsItem => ({
  title, summary: "", url: "https://x", source: "Feed", publishedAt: "2026-10-12T00:00:00Z", ageHours, relevance: 0.5, sentiment,
});

describe("news formatting", () => {
  it("formats ages", () => {
    expect(timeAgo(0.01)).toBe("just now");
    expect(timeAgo(0.5)).toBe("30 min ago");
    expect(timeAgo(30)).toBe("1d ago");
  });

  it("detects coarse topics", () => {
    expect(detectCategory("Infosys Q2 results beat estimates")).toBe("Earnings");
    expect(detectCategory("RBI holds repo rate")).toBe("Macro");
    expect(detectCategory("SEBI penalty on broker")).toBe("Regulatory");
  });

  it("extracts tickers on word boundaries only", () => {
    expect(extractTickers("Reliance and Infosys lead gains")).toEqual(["RELIANCE", "INFY"]);
    expect(extractTickers("Markets fall by half a percent")).toEqual([]); // no 'hal'/'sbi' substring hits
    expect(extractTickers("L&T wins order")).toEqual(["LT"]);
  });

  it("feed stats are plain counts of the given articles", () => {
    const s = feedStats([item("Reliance rallies", "positive", 2), item("TCS slips", "negative", 0.5), item("Nifty flat", "neutral", 3)]);
    expect(s.total).toBe(3);
    expect(s.sentiment).toEqual({ positive: 1, negative: 1, neutral: 1 });
    expect(s.newestAgeHours).toBe(0.5);
    expect(s.tickers.map((t) => t.ticker).sort()).toEqual(["RELIANCE", "TCS"]);
    expect(feedStats([]).newestAgeHours).toBeNull();
  });
});
