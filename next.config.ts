import type { NextConfig } from "next";
import { securityHeaders } from "./lib/security/headers";

const nextConfig: NextConfig = {
  serverExternalPackages: ["yahoo-finance2", "@anthropic-ai/sdk"],

  // Self-contained server for the Docker image (Dockerfile sets NEXT_OUTPUT=standalone). Vercel builds are unaffected.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,

  // Don't advertise the framework/version on every response.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders({ production: process.env.NODE_ENV === "production" }),
      },
    ];
  },

  // Allow longer serverless function execution for AI calls (Vercel Pro: up to 300s)
  // maxDuration is set per-route via `export const maxDuration = 60`
};

export default nextConfig;
