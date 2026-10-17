/** Client-safe live helpers (no server-only imports): used by the risk panel in the browser. */

/**
 * "Price change -> signal": today's move relative to the model's expected daily move.
 * |ratio| >= 2 is flagged as unusual. Null when either input is missing.
 */
export function moveVsForecast(changePct: number | null | undefined, forecastDailyVol: number | null | undefined) {
  if (changePct == null || forecastDailyVol == null || !(forecastDailyVol > 0) || !Number.isFinite(changePct)) return null;
  const ratio = changePct / 100 / forecastDailyVol;
  return { ratio, unusual: Math.abs(ratio) >= 2 };
}
