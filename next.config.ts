import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";
import bundleAnalyzer from '@next/bundle-analyzer';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
  analyzerMode: 'static',
});

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'github.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'va.vercel-scripts.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  compress: true,
  reactStrictMode: true,
  poweredByHeader: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  experimental: {
    optimizePackageImports: [
      'next-intl',
      '@sentry/nextjs',
      'zustand',
      'web-vitals',
      'lucide-react',
    ],
  },
  serverExternalPackages: ['sharp', 'better-sqlite3', 'jose', 'uuid'],
  webpack: (config, { isServer, dev }) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['@'] = __dirname + '/src';

    if (!dev) {
      config.performance = {
        maxEntrypointSize: 512000,
        maxAssetSize: 512000,
        hints: process.env.NODE_ENV === 'production' ? 'warning' : false,
      };
    }

    return config;
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
