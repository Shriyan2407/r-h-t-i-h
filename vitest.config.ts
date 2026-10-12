import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "lib/**/*.test.ts"],
    globals: false,
    // next-auth imports "next/server" without the .js extension, which Node's strict ESM
    // resolver rejects. Inlining lets Vite resolve it like the Next.js bundler does.
    server: { deps: { inline: [/next-auth/, /@auth\/core/] } },
  },
});
