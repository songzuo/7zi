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
  // Docker 部署使用 standalone 输出模式
  output: 'standalone',

  // 图片优化配置
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
      'next-intl', '@sentry/nextjs', 'zustand', 'web-vitals', 'lucide-react',
      'three', '@react-three/fiber', '@react-three/drei', 'xlsx',
    ],
  },

  serverExternalPackages: ['sharp', 'better-sqlite3', 'jose', 'uuid'],

  webpack: (config, { isServer, dev }) => {
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['@/'] = __dirname + '/src';

    if (!isServer && !dev) {
      config.optimization = config.optimization || {};
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          'three-libs': {
            test: /[\\/]node_modules[\\/](three|@react-three\/fiber|@react-three\/drei|@react-three\/postprocessing)[\\/]/,
            name: 'three-libs',
            priority: 60,
            reuseExistingChunk: true,
            enforce: true,
            minSize: 50000,
            maxSize: 500000,
          },
          'chart-libs': {
            test: /[\\/]node_modules[\\/](recharts|chart\.js|react-chartjs-2|d3|vis-network|vis-data|@visx)[\\/]/,
            name: 'chart-libs',
            priority: 50,
            reuseExistingChunk: true,
            enforce: true,
            minSize: 50000,
            maxSize: 300000,
          },
          'realtime-libs': {
            test: /[\\/]node_modules[\\/](socket\.io-client|@socket\.io|engine\.io-client|eventemitter3)[\\/]/,
            name: 'realtime-libs',
            priority: 45,
            reuseExistingChunk: true,
            enforce: true,
            minSize: 50000,
          },
          'ui-libs': {
            test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|framer-motion|class-variance-authority|clsx|tailwind-merge)[\\/]/,
            name: 'ui-libs',
            priority: 40,
            reuseExistingChunk: true,
            enforce: true,
            minSize: 30000,
          },
          framework: {
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|next)[\\/]/,
            name: 'framework',
            priority: 35,
            reuseExistingChunk: true,
            minSize: 100000,
            maxSize: 500000,
          },
          'vendor-utils': {
            test: /[\\/]node_modules[\\/](zustand|immer|uuid|date-fns|lodash|lodash-es)[\\/]/,
            name: 'vendor-utils',
            priority: 30,
            reuseExistingChunk: true,
            minSize: 30000,
          },
          'forms-libs': {
            test: /[\\/]node_modules[\\/](zod|react-hook-form|@hookform)[\\/]/,
            name: 'forms-libs',
            priority: 25,
            reuseExistingChunk: true,
            minSize: 20000,
          },
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            minChunks: 2,
            reuseExistingChunk: true,
            minSize: 50000,
          },
          common: {
            minChunks: 3,
            priority: 5,
            reuseExistingChunk: true,
            minSize: 30000,
          },
        },
        maxInitialRequests: 25,
        maxAsyncRequests: 30,
        minSize: 20000,
        maxSize: 244000,
        minChunks: 1,
        enforceSizeThreshold: 50000,
      };
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
      config.optimization.providedExports = true;
      config.optimization.usedExports = true;
      config.optimization.sideEffects = true;
    }

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

  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        ],
      },
      {
        source: '/:path*.{png,jpg,jpeg,webp,avif,svg,ico}',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
