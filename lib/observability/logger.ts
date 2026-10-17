/**
 * Structured JSON logger. One line per event on stdout/stderr so Vercel/any log drain can index
 * fields. Values under sensitive-looking keys are redacted before serialisation.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const SENSITIVE_KEY = /pass(word)?|secret|token|authorization|cookie|api[-_]?key|bearer|session/i;
const MAX_DEPTH = 4;

function minLevel(): LogLevel {
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env && env in ORDER) return env as LogLevel;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

export function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack?.split("\n").slice(0, 6).join("\n") };
  }
  return { message: String(err) };
}

/** Recursively redact sensitive keys; bounded depth guards against cycles. */
export function redact(value: unknown, depth = 0): unknown {
  if (value instanceof Error) return serializeError(value);
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEY.test(k) ? "[redacted]" : redact(v, depth + 1);
  }
  return out;
}

export type Sink = (level: LogLevel, line: string) => void;

const defaultSink: Sink = (level, line) => {
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
};

let sink: Sink = defaultSink;
/** Test hook. Pass null to restore the default. */
export function setLogSink(s: Sink | null) {
  sink = s ?? defaultSink;
}

function emit(level: LogLevel, event: string, fields?: Record<string, unknown>) {
  if (ORDER[level] < ORDER[minLevel()]) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...(redact(fields ?? {}) as Record<string, unknown>),
  });
  sink(level, line);
}

export const log = {
  debug: (event: string, fields?: Record<string, unknown>) => emit("debug", event, fields),
  info: (event: string, fields?: Record<string, unknown>) => emit("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => emit("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) => emit("error", event, fields),
};
