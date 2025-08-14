import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    // Exclude STT servers from webpack processing
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/google-server/**', '**/deepgram-server/**'],
    };

    return config;
  },
};

export default nextConfig;