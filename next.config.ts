import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["yahoo-finance2", "@anthropic-ai/sdk"],

  // Allow longer serverless function execution for AI calls (Vercel Pro: up to 300s)
  // maxDuration is set per-route via `export const maxDuration = 60`
};

export default nextConfig;
