import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  experimental: {
    agentUpgrade: "security",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      { source: "/pricing", destination: "/#paths", permanent: false },
      { source: "/how-it-works", destination: "/#how", permanent: false },
      { source: "/app", destination: "/#app", permanent: false },
      { source: "/faq.html", destination: "/#faq", permanent: false },
      { source: "/about.html", destination: "/#about", permanent: false },
      { source: "/blog/index.html", destination: "/#why", permanent: false },
      { source: "/demo-v3.html", destination: "/#hero", permanent: false },
      { source: "/index-v3.html", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
