import { describe, it, expect } from "vitest";
import { escapeHtml } from "@/lib/security/html";
import {
  fmtNewsAlert,
  fmtConnected,
  fmtStockAnalysis,
  fmtBreakout,
  fmtDailyBriefing,
} from "@/lib/services/telegramService";

const PAYLOAD = '<a href="https://evil.test">click</a> & <b>x</b>';

describe("escapeHtml", () => {
  it("escapes the characters Telegram HTML treats as markup", () => {
    expect(escapeHtml("<&>\"")).toBe("&lt;&amp;&gt;&quot;");
  });
  it("tolerates null and undefined", () => {
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(null)).toBe("");
  });
});

describe("telegram formatters never emit attacker-controlled markup", () => {
  it("news alert", () => {
    const msg = fmtNewsAlert("TCS", {
      title: PAYLOAD,
      summary: PAYLOAD,
      url: "https://x.test",
      source: PAYLOAD,
      sentiment: "positive",
    });
    expect(msg).not.toContain("<a href");
    expect(msg).toContain("&lt;a href=&quot;https://evil.test&quot;&gt;");
  });
  it("connected message escapes the first name", () => {
    expect(fmtConnected(PAYLOAD)).not.toContain("<a href");
  });
  it("stock analysis escapes verdict and summary", () => {
    const msg = fmtStockAnalysis("INFY", {
      price: 100,
      verdict: PAYLOAD,
      confidence: 70,
      summary: PAYLOAD,
      riskLevel: PAYLOAD,
      newsSentiment: PAYLOAD,
    });
    expect(msg).not.toContain("<a href");
  });
  it("ticker is escaped everywhere", () => {
    expect(fmtBreakout(PAYLOAD, 10, 9)).not.toContain("<a href");
  });
  it("briefing escapes free-text fields", () => {
    const msg = fmtDailyBriefing({
      date: PAYLOAD,
      nifty: { price: 1, change: 0 },
      banknifty: { price: 1, change: 0 },
      topGainers: [{ ticker: PAYLOAD, change: 1 }],
      topLosers: [],
      aiPicks: [{ ticker: PAYLOAD, verdict: PAYLOAD, note: PAYLOAD }],
      fii: PAYLOAD,
      dii: PAYLOAD,
      usdinr: PAYLOAD,
      riskLevel: 5,
      outlook: PAYLOAD,
    });
    expect(msg).not.toContain("<a href");
  });
});
