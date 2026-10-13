/* ═══════════════════════════════════════════════════════════════
   R.H.T.I.H — Ollama Local LLM Client
   Server-side only. Opt-in: only active when OLLAMA_BASE_URL is set
   (e.g. http://localhost:11434). When unset, no network probe is made.
   Supports Qwen 2.5, LLaMA 3.x, Mistral, Phi-3, DeepSeek-R1.
═══════════════════════════════════════════════════════════════ */

/** Read per call so tests and runtime config changes take effect. */
function ollamaBase(): string | null {
  return process.env.OLLAMA_BASE_URL?.trim() || null;
}

/*
 * IMPORTANT MODEL ORDERING:
 * DeepSeek-R1 is a REASONING model — it generates chain-of-thought tokens
 * before the answer, making it 4-8x slower than non-reasoning models on CPU.
 * Always prefer qwen2.5 / llama3.x for speed-sensitive paths.
 */
const PREFERRED = [
  "qwen2.5:7b", "qwen2.5:3b", "qwen2.5",       // Fast, excellent instruction following
  "llama3.2:3b", "llama3.1:8b", "llama3",        // Fast, solid quality
  "mistral:7b", "mistral",                        // Fast, good for JSON
  "phi3:mini", "phi3",                            // Very fast, small
  "gemma2:9b", "gemma2",
  "deepseek-r1:7b", "deepseek-r1:8b", "deepseek-r1", // Last resort — CoT overhead
];

// Fast-path: prefer smallest available model for low-latency inference
const FAST_PREFERRED = [
  "qwen2.5:3b", "llama3.2:3b", "phi3:mini", "phi3",
  "qwen2.5:7b", "llama3.1:8b", "mistral:7b", "gemma2:9b",
  "deepseek-r1:7b",
];

let _modelCache: string | null = null;
let _cacheTs = 0;
let _fastModelCache: string | null = null;
let _fastCacheTs = 0;

async function listModels(): Promise<string[]> {
  const base = ollamaBase();
  if (!base) return []; // not configured: never probe localhost from a serverless host
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 3_000);
    const res = await fetch(`${base}/api/tags`, { signal: ctrl.signal });
    if (!res.ok) return [];
    const data = await res.json() as { models?: Array<{ name: string }> };
    return (data.models ?? []).map(m => m.name);
  } catch { return []; }
}

function pickModel(names: string[], prefs: string[]): string | null {
  for (const pref of prefs) {
    const base = pref.split(":")[0];
    const hit  = names.find(n => n === pref || n.startsWith(base + ":") || n === base);
    if (hit) return hit;
  }
  return names[0] ?? null;
}

/** Returns the best available Ollama model, or null if Ollama is offline. */
export async function getOllamaModel(): Promise<string | null> {
  if (_modelCache && Date.now() - _cacheTs < 60_000) return _modelCache;
  const names = await listModels();
  if (!names.length) return null;
  _modelCache = pickModel(names, PREFERRED);
  _cacheTs = Date.now();
  return _modelCache;
}

/** Returns the fastest available small model for the compact-prompt path. */
export async function getFastOllamaModel(): Promise<string | null> {
  if (_fastModelCache && Date.now() - _fastCacheTs < 60_000) return _fastModelCache;
  const names = await listModels();
  if (!names.length) return null;
  _fastModelCache = pickModel(names, FAST_PREFERRED);
  _fastCacheTs = Date.now();
  return _fastModelCache;
}

export async function isOllamaOnline(): Promise<boolean> {
  return (await getOllamaModel()) !== null;
}

/** Standard Ollama call — full institutional prompt, num_predict 1800. */
export async function callOllama(
  prompt: string,
  system = "",
  timeoutMs = 90_000,
): Promise<string | null> {
  const model = await getOllamaModel();
  if (!model) return null;

  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    const res = await fetch(`${ollamaBase()}/api/generate`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        system,
        stream:  false,
        options: {
          temperature:   0.2,
          num_predict:   1800,   // reduced from 4000 — compact JSON fits in 1800
          top_p:         0.9,
          repeat_penalty:1.1,
          num_ctx:       4096,   // explicit context window cap
        },
      }),
      signal: ctrl.signal,
    });

    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json() as { response?: string };
    return data.response ?? null;

  } catch { return null; }
}

/**
 * Fast Ollama call — compact prompt path.
 * Uses smallest available model, minimal tokens, tight timeout.
 * Target: < 60s on 7B CPU, < 25s on 3B CPU.
 */
export async function callOllamaFast(
  prompt: string,
  system = "",
  timeoutMs = 75_000,
): Promise<string | null> {
  const model = await getFastOllamaModel();
  if (!model) return null;

  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    const res = await fetch(`${ollamaBase()}/api/generate`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        system,
        stream:  false,
        options: {
          temperature:   0.15,
          num_predict:   700,    // narrative-only output ≈ 500-650 tokens
          top_p:         0.85,
          repeat_penalty:1.0,
          num_ctx:       2048,   // small context → faster KV cache
        },
      }),
      signal: ctrl.signal,
    });

    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json() as { response?: string };
    return data.response ?? null;

  } catch { return null; }
}

/** Stream Ollama response as an async generator of token strings. */
export async function* streamOllama(
  prompt: string,
  system = "",
  timeoutMs = 120_000,
): AsyncGenerator<string> {
  const model = await getOllamaModel();
  if (!model) { yield ""; return; }

  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(`${ollamaBase()}/api/generate`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        system,
        stream:  true,
        options: { temperature: 0.2, num_predict: 1800, top_p: 0.9, num_ctx: 4096 },
      }),
      signal: ctrl.signal,
    });

    if (!res.ok || !res.body) return;
    const reader = res.body.getReader();
    const dec    = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = dec.decode(value).split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const json = JSON.parse(line) as { response?: string; done?: boolean };
          if (json.response) yield json.response;
          if (json.done) { clearTimeout(timer); return; }
        } catch { /* partial line */ }
      }
    }
  } catch { /* aborted or error */ } finally {
    clearTimeout(timer);
  }
}
