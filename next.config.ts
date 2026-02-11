import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Webflow Cloud: basePath from env (e.g. /app) or empty for local dev
  basePath: process.env.BASE_URL || "",
  assetPrefix: process.env.ASSETS_PREFIX || process.env.BASE_URL || "",
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
