import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Skip ESLint checks during build
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ✅ Skip TypeScript type errors during build
  typescript: {
    ignoreBuildErrors: true,
  },

  // other options like reactStrictMode, etc., can go here
};

export default nextConfig;