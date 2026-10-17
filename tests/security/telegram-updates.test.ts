import { describe, it, expect } from "vitest";
import {
  telegramUpdateSchema,
  parseAnalyzeCommand,
  parseStartToken,
} from "@/lib/telegram/updates";

describe("telegramUpdateSchema", () => {
  it("accepts a normal text message", () => {
    const r = telegramUpdateSchema.safeParse({
      update_id: 1,
      message: { text: "/help", chat: { id: 42 }, from: { first_name: "A" } },
    });
    expect(r.success).toBe(true);
  });
  it("rejects a message with a non-numeric chat id", () => {
    const r = telegramUpdateSchema.safeParse({ message: { text: "x", chat: { id: "42" } } });
    expect(r.success).toBe(false);
  });
  it("rejects oversized text", () => {
    const r = telegramUpdateSchema.safeParse({
      message: { text: "a".repeat(5000), chat: { id: 1 } },
    });
    expect(r.success).toBe(false);
  });
});

describe("parseAnalyzeCommand", () => {
  it.each([
    ["/analyze RELIANCE", "RELIANCE"],
    ["analyze tcs", "TCS"],
    ["/analyze M&M", "M&M"],
    ["/analyze bajaj-auto", "BAJAJ-AUTO"],
    ["INFY analysis", "INFY"],
  ])("%s -> %s", (input, expected) => {
    expect(parseAnalyzeCommand(input)).toBe(expected);
  });
  it("rejects over-long or non-ticker input", () => {
    expect(parseAnalyzeCommand("/analyze " + "A".repeat(30))).toBeNull();
    expect(parseAnalyzeCommand("/analyze ../../etc")).toBeNull();
    expect(parseAnalyzeCommand("hello")).toBeNull();
  });
});

describe("parseStartToken", () => {
  it("accepts a 32-char hex token", () => {
    const t = "a".repeat(32);
    expect(parseStartToken(`/start ${t}`)).toBe(t);
  });
  it("rejects anything else", () => {
    expect(parseStartToken("/start")).toBeNull();
    expect(parseStartToken("/start nothex")).toBeNull();
    expect(parseStartToken("/start " + "a".repeat(31))).toBeNull();
  });
});
