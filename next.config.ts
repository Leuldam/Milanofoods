import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  experimental: {
    cpus: 1,
  },

  outputFileTracingIncludes: {
    "/*": [
      "./src/generated/prisma/**/*",
      "./node_modules/@prisma/**/*",
      "./node_modules/pg/**/*",
      "./node_modules/pg-*/*",
      "./node_modules/postgres-*/*",
      "./node_modules/pgpass/**/*",
    ],
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
