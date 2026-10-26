import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.VIDEO_CONNECTOR === "1" ? { distDir: ".next-video-connector" } : {}),
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
