import { describe, expect, it } from "vitest";
import { PAGES, filterPages } from "@/components/CommandPalette";

describe("command palette page filter", () => {
  it("returns every page for an empty query", () => {
    expect(filterPages("  ")).toHaveLength(PAGES.length);
  });
  it("matches labels and keywords case-insensitively", () => {
    expect(filterPages("BACKTEST").map((p) => p.href)).toEqual(["/backtest"]);
    expect(filterPages("rejected").map((p) => p.href)).toEqual(["/models"]);
    expect(filterPages("stress").map((p) => p.href)).toEqual(["/portfolio"]);
  });
  it("every page target is an internal path (optionally with an in-page anchor)", () => {
    for (const p of PAGES) expect(p.href).toMatch(/^\/[a-z/]*(#[a-z-]+)?$/);
  });

  it("page targets are unique, so React keys and command values never collide", () => {
    expect(new Set(PAGES.map((p) => p.href)).size).toBe(PAGES.length);
  });
});
