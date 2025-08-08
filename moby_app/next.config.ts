import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    // Exclude stt-server from webpack processing
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/stt-server/**'],
    };

    return config;
  },
};

export default nextConfig;