import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The admin panel is fully dynamic: every page reads the session and fresh data,
  // so Cache Components / partial prefetching are not used.
  images: {
    // Master photos are stored in Vercel Blob
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
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
