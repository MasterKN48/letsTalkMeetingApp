import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true, // Enable Cache Components (includes PPR)
  experimental: {
    viewTransition: true, // Enable View Transitions API
  },
};

export default nextConfig;
