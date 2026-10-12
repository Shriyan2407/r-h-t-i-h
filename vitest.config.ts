import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "lib/**/*.test.ts"],
    // Needs a real database; run via `npm run test:integration` (vitest.integration.config.ts).
    exclude: ["tests/integration/**", "node_modules/**"],
    globals: false,
    // next-auth imports "next/server" without the .js extension, which Node's strict ESM
    // resolver rejects. Inlining lets Vite resolve it like the Next.js bundler does.
    server: { deps: { inline: [/next-auth/, /@auth\/core/] } },
  },
});
