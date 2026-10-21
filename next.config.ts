import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  onDemandEntries: {
    // Keep page compilation in memory for 25 seconds of inactivity
    maxInactiveAge: 25 * 1000,
    // Keep at most 2 compiled pages in the memory buffer
    pagesBufferLength: 2,
  },
  async redirects() {
    // Resumes and files were merged into Documents
    return [
      { source: "/resumes", destination: "/documents", permanent: true },
      { source: "/resumes/:path*", destination: "/documents", permanent: true },
      { source: "/files", destination: "/documents?tab=files", permanent: true },
      { source: "/files/:id/preview", destination: "/documents/files/:id", permanent: true },
    ];
  },
  experimental: {
    // Enable memory footprint optimizations in compiler
    webpackMemoryOptimizations: true,
    // Disable preloading all routes/modules into memory at startup
    preloadEntriesOnStart: false,
  },
};

export default nextConfig;
