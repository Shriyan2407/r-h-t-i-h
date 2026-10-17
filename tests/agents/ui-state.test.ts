import { describe, expect, it } from "vitest";
import { applyEvent, decisionColor, initialState, splitLines, type CommitteeState } from "@/components/research/committee/state";
import { runCommittee, type CommitteeEvent } from "@/lib/agents/orchestrator";
import { loaders } from "./fixtures";

describe("committee UI state", () => {
  it("folds a real event stream into agent rows and a final result", async () => {
    const events: CommitteeEvent[] = [];
    await runCommittee("Is TCS overvalued?", loaders(), { requestId: "r", now: new Date("2026-10-17T00:00:00Z"), onEvent: (e) => events.push(e) });
    let s: CommitteeState = initialState;
    const seen: string[] = [];
    for (const e of events) {
      s = applyEvent(s, e);
      if (s.phase === "running") seen.push(s.agents.map((a) => a.status[0]).join(""));
    }
    expect(s.phase).toBe("done");
    if (s.phase !== "done") return;
    expect(s.agents.map((a) => a.id)).toEqual(["fundamental", "quant", "intelligence", "risk", "contrarian", "cio"]);
    expect(s.agents.every((a) => a.status === "success" || a.status === "partial")).toBe(true);
    expect(s.agents.find((a) => a.id === "contrarian")?.wave).toBe(2);
    // The first running snapshot has every agent pending.
    expect(seen[0]).toMatch(/^p+$/);
  });

  it("ignores agent events before a plan and keeps rows on error", () => {
    expect(applyEvent(initialState, { type: "agent_started", agent: "quant", wave: 1 })).toBe(initialState);
    const planned = applyEvent(initialState, { type: "plan", requestId: "r", intent: {} as never, plan: { waves: [["quant"], ["cio"]], blocked: null } as never, agents: [{ id: "quant", name: "Quant", reason: "x" }, { id: "cio", name: "CIO", reason: "y" }] });
    const failed = applyEvent(planned, { type: "error", requestId: "r", message: "boom" });
    expect(failed).toMatchObject({ phase: "error", message: "boom" });
    expect(failed.phase !== "idle" && failed.agents).toHaveLength(2);
  });

  it("splits NDJSON chunks and keeps a partial trailing line", () => {
    expect(splitLines('{"a":1}\n{"b":2}\n{"c"')).toEqual({ lines: ['{"a":1}', '{"b":2}'], rest: '{"c"' });
    expect(splitLines("\n\n")).toEqual({ lines: [], rest: "" });
  });

  it("colours decisions by side and leaves insufficient data neutral", () => {
    expect(decisionColor("BUY")).toBe("var(--positive)");
    expect(decisionColor("SELL")).toBe("var(--negative)");
    expect(decisionColor("HOLD")).toBe("var(--gold)");
    expect(decisionColor("INSUFFICIENT DATA")).toBe("var(--th-text-muted)");
  });
});
