import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingExcludes: {
    "/*": ["./data/runtime/**/*", "./mobile/releases/**/*"],
  },
  allowedDevOrigins: ["127.0.0.1", "192.168.100.10"],
  devIndicators: false,
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "1mb" } },
  async headers() {
    return [
      {
        source: "/vendor/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
