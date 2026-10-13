import { afterEach, describe, expect, it, vi } from "vitest";

describe("Ollama client is opt-in", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("makes no network call when OLLAMA_BASE_URL is unset", async () => {
    vi.stubEnv("OLLAMA_BASE_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { getOllamaModel, callOllama, isOllamaOnline } = await import("@/lib/ai/ollamaClient");

    expect(await getOllamaModel()).toBeNull();
    expect(await callOllama("hi")).toBeNull();
    expect(await isOllamaOnline()).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("probes the configured host when set", async () => {
    vi.stubEnv("OLLAMA_BASE_URL", "http://ollama.internal:11434");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: "qwen2.5:7b" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { getOllamaModel } = await import("@/lib/ai/ollamaClient");

    expect(await getOllamaModel()).toBe("qwen2.5:7b");
    expect(fetchMock.mock.calls[0][0]).toBe("http://ollama.internal:11434/api/tags");
  });
});
