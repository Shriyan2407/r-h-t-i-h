import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx", "lib/**/*.test.ts"],
    // Needs a real database; run via `npm run test:integration` (vitest.integration.config.ts).
    exclude: ["tests/integration/**", "node_modules/**"],
    globals: false,
    // Several tests dynamically import whole Next route modules (yahoo-finance2, prisma, ...). Cold, in
    // parallel workers, that can exceed the 5 s default; the tests themselves are fast once loaded.
    testTimeout: 20_000,
    // next-auth imports "next/server" without the .js extension, which Node's strict ESM
    // resolver rejects. Inlining lets Vite resolve it like the Next.js bundler does.
    server: { deps: { inline: [/next-auth/, /@auth\/core/] } },
  },
});
