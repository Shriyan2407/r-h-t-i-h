import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Integration tests run against a REAL PostgreSQL database.
 *
 *   TEST_DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/scratch npm run test:integration
 *
 * The URL is copied into DATABASE_URL for the test process only. The database must be a
 * scratch database with the migrations applied (`prisma migrate deploy`); tests create and
 * remove their own rows (emails prefixed "it-"), but never point this at real data.
 */
const testUrl = process.env.TEST_DATABASE_URL;

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    env: testUrl ? { DATABASE_URL: testUrl } : {},
    // One database, shared state: run files sequentially.
    fileParallelism: false,
    testTimeout: 30_000,
    server: { deps: { inline: [/next-auth/, /@auth\/core/] } },
  },
});
