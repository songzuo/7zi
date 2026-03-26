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
    // Remove unnecessary polyfills by configuring SWC minification
    swcMinify: true,
  },

  experimental: {
    // Optimize package imports for tree-shaking
    optimizePackageImports: [
      'next-intl', '@sentry/nextjs', 'zustand', 'web-vitals', 'lucide-react',
      'three', '@react-three/fiber', '@react-three/drei',
    ],
    // Optimize CSS imports
    optimizeCss: true,
  },

  // ExcelJS should be server-side only and dynamically imported
  serverExternalPackages: ['sharp', 'better-sqlite3', 'jose', 'uuid', 'exceljs'],

  webpack: (config, { isServer, dev }) => {
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['@/'] = __dirname + '/src';

    if (!isServer && !dev) {
      config.optimization = config.optimization || {};
      // Performance budget configuration
      config.performance = {
        maxEntrypointSize: 300000, // 300 KB
        maxAssetSize: 250000,        // 250 KB
        hints: 'warning',
      };

      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          'three-libs': {
            test: /[\\/]node_modules[\\/](three|@react-three\/fiber|@react-three\/drei|@react-three\/postprocessing)[\\/]/,
            name: 'three-libs',
            priority: 60,
            reuseExistingChunk: true,
            enforce: true,
            minSize: 30000,
            maxSize: 300000, // Reduced from 500KB to 300KB
          },
          'chart-libs': {
            test: /[\\/]node_modules[\\/](recharts|chart\.js|react-chartjs-2|d3|vis-network|vis-data|@visx)[\\/]/,
            name: 'chart-libs',
            priority: 50,
            reuseExistingChunk: true,
            enforce: true,
            minSize: 30000,
            maxSize: 200000, // Reduced from 300KB to 200KB
          },
          'realtime-libs': {
            test: /[\\/]node_modules[\\/](socket\.io-client|@socket\.io|engine\.io-client|eventemitter3)[\\/]/,
            name: 'realtime-libs',
            priority: 45,
            reuseExistingChunk: true,
            enforce: true,
            minSize: 30000,
          },
          'ui-libs': {
            test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|framer-motion|class-variance-authority|clsx|tailwind-merge)[\\/]/,
            name: 'ui-libs',
            priority: 40,
            reuseExistingChunk: true,
            enforce: true,
            minSize: 20000,
          },
          'framework': {
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|next)[\\/]/,
            name: 'framework',
            priority: 35,
            reuseExistingChunk: true,
            minSize: 100000,
            maxSize: 400000, // Reduced to merge framework chunks
          },
          'vendor-utils': {
            test: /[\\/]node_modules[\\/](zustand|immer|uuid|date-fns|lodash|lodash-es)[\\/]/,
            name: 'vendor-utils',
            priority: 30,
            reuseExistingChunk: true,
            minSize: 20000,
          },
          'forms-libs': {
            test: /[\\/]node_modules[\\/](zod|react-hook-form|@hookform)[\\/]/,
            name: 'forms-libs',
            priority: 25,
            reuseExistingChunk: true,
            minSize: 20000,
          },
          'excel-libs': {
            test: /[\\/]node_modules[\\/](exceljs)[\\/]/,
            name: 'excel-libs',
            priority: 20,
            reuseExistingChunk: true,
            enforce: true,
            minSize: 50000,
          },
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            minChunks: 2,
            reuseExistingChunk: true,
            minSize: 30000,
          },
          common: {
            minChunks: 3,
            priority: 5,
            reuseExistingChunk: true,
            minSize: 20000,
          },
        },
        maxInitialRequests: 25,
        maxAsyncRequests: 30,
        minSize: 15000, // Reduced from 20000
        maxSize: 200000, // Reduced from 244KB
        minChunks: 1,
        enforceSizeThreshold: 30000, // Reduced from 50000
      };
      // More aggressive tree-shaking
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false; // More strict side effects checking
      config.optimization.providedExports = true;
      config.optimization.concatenateModules = true; // Scope hoisting for better minification
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
