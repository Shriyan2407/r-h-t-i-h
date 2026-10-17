"use client";
import { useCallback, useEffect, useReducer, useRef } from "react";
import type { CommitteeEvent } from "@/lib/agents/orchestrator";
import { applyEvent, initialState, splitLines, type CommitteeState } from "./state";

type Action = { kind: "event"; e: CommitteeEvent } | { kind: "reset" } | { kind: "fail"; message: string };

function reducer(s: CommitteeState, a: Action): CommitteeState {
  if (a.kind === "reset") return initialState;
  if (a.kind === "fail") return { phase: "error", agents: s.phase === "idle" ? [] : s.agents, message: a.message };
  return applyEvent(s, a.e);
}

/** Runs the committee through the streaming API and folds the real progress events into UI state. */
export function useCommittee() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const run = useCallback(async (query: string, narrative: "template" | "llm" = "template") => {
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    dispatch({ kind: "reset" });
    try {
      const res = await fetch("/api/agents/committee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, stream: true, narrative }),
        signal: ctl.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        dispatch({ kind: "fail", message: res.status === 401 ? "Please sign in to use the investment committee." : res.status === 429 ? "You have reached the hourly limit for committee runs. Try again later." : body.error ?? "The committee could not run." });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { lines, rest } = splitLines(buffer);
        buffer = rest;
        for (const line of lines) {
          try { dispatch({ kind: "event", e: JSON.parse(line) as CommitteeEvent }); } catch { /* ignore a malformed line */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") dispatch({ kind: "fail", message: "Network error: the committee could not be reached." });
    }
  }, []);

  return { state, run };
}
