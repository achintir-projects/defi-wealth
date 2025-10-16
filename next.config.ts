import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Don't ignore build errors to catch issues early
    ignoreBuildErrors: false,
  },
  // 禁用 Next.js 热重载，由 nodemon 处理重编译
  reactStrictMode: false,
  // Remove standalone output for Netlify compatibility
  experimental: {
    serverActions: {},
  },
  images: {
    domains: ['assets.coingecko.com'],
  },
  // Add headers to allow embedding
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' *",
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Less restrictive webpack configuration for development
      config.watchOptions = {
        ignored: /node_modules/,
      };
    }
    return config;
  },
  eslint: {
    // Don't ignore ESLint errors during builds
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
