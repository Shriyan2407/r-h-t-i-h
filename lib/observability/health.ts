export type CheckStatus = "ok" | "degraded" | "down" | "not_configured";

export interface HealthProbes {
  database: () => Promise<void>;
  yahoo: () => Promise<boolean>;
}

export interface PublicHealth {
  status: "ok" | "degraded";
  ts: string;
  checks: { database: CheckStatus };
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, rej) => {
    timer = setTimeout(() => rej(new Error("timeout")), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/** Liveness + the one dependency without which the product is unusable. No internals exposed. */
export async function publicHealth(probes: Pick<HealthProbes, "database">, timeoutMs = 3_000): Promise<PublicHealth> {
  let database: CheckStatus = "ok";
  try {
    await withTimeout(probes.database(), timeoutMs);
  } catch {
    database = "down";
  }
  return { status: database === "ok" ? "ok" : "degraded", ts: new Date().toISOString(), checks: { database } };
}

export interface DeepHealth extends PublicHealth {
  checks: { database: CheckStatus; marketData: CheckStatus; ai: CheckStatus; sharedCache: CheckStatus; rateLimit: CheckStatus };
}

export async function deepHealth(
  probes: HealthProbes,
  env: NodeJS.ProcessEnv = process.env,
  timeoutMs = 4_000,
): Promise<DeepHealth> {
  const base = await publicHealth(probes, timeoutMs);
  let marketData: CheckStatus = "ok";
  try {
    marketData = (await withTimeout(probes.yahoo(), timeoutMs)) ? "ok" : "degraded";
  } catch {
    marketData = "down";
  }
  const redis = !!(env.UPSTASH_REDIS_REST_URL?.trim() && env.UPSTASH_REDIS_REST_TOKEN?.trim());
  const checks = {
    database: base.checks.database,
    marketData,
    // Configuration only: this does not call the model. AI also works without a key (rule-based).
    ai: env.ANTHROPIC_API_KEY?.trim() || env.OLLAMA_BASE_URL?.trim() ? ("ok" as const) : ("not_configured" as const),
    sharedCache: redis ? ("ok" as const) : ("not_configured" as const),
    rateLimit: redis ? ("ok" as const) : ("not_configured" as const),
  };
  const degraded = checks.database !== "ok" || checks.marketData !== "ok";
  return { ...base, status: degraded ? "degraded" : "ok", checks };
}
