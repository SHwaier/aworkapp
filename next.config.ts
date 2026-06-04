import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  onDemandEntries: {
    // Keep page compilation in memory for 25 seconds of inactivity
    maxInactiveAge: 25 * 1000,
    // Keep at most 2 compiled pages in the memory buffer
    pagesBufferLength: 2,
  },
  experimental: {
    // Enable memory footprint optimizations in compiler
    webpackMemoryOptimizations: true,
    // Disable preloading all routes/modules into memory at startup
    preloadEntriesOnStart: false,
  },
};

export default nextConfig;
