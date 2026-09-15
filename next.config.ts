import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static — no server, no API routes. Drops straight onto Cloudflare Pages.
  output: "export",
  images: { unoptimized: true },
  // onnxruntime-node ships native .node binaries; the browser build must never see it.
  turbopack: {
    resolveAlias: { "onnxruntime-node": { browser: "./lib/empty.ts" } },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-node": false,
    };
    return config;
  },
};

export default nextConfig;
