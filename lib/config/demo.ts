/**
 * Demo mode: replaces failed API calls with generated sample data so the UI can be
 * developed and demonstrated without network access.
 *
 * It is enabled ONLY when both hold:
 *   - NEXT_PUBLIC_DEMO_MODE=true, and
 *   - the build is NOT a production build.
 *
 * `process.env.NODE_ENV` is inlined at build time, so in production this constant is the
 * literal `false` and the sample-data code is eliminated from the bundle. Real users can
 * therefore never be shown generated numbers as if they were market data. When demo mode
 * is on, <DemoBanner /> labels every page "DEMO DATA".
 */
export const DEMO_MODE: boolean =
  process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_DEMO_MODE === "true";
