import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicitly enable Gzip & Brotli compression for HTML, CSS, JS & JSON API responses
  compress: true,
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
