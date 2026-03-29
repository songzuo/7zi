/**
 * Next.js 16 + Webpack 生产环境配置
 *
 * Bundle 性能优化版本
 *
 * @version 1.4.0
 * @date 2026-03-29
 */

import type { NextConfig } from 'next';
import path from 'path';

// ============================================
// 环境配置
// ============================================
const isProduction = process.env.NODE_ENV === 'production';
const isAnalyze = process.env.ANALYZE === 'true';

// ============================================
// Chunk 大小限制配置
// ============================================
const CHUNK_LIMITS = {
  // 最大入口点大小 (300KB)
  maxEntrypointSize: 300 * 1024,
  // 最大资源大小 (250KB)
  maxAssetSize: 250 * 1024,
  // 最大异步 chunk 大小 (200KB)
  maxAsyncChunkSize: 200 * 1024,
  // 最小 chunk 大小 (15KB)
  minChunkSize: 15 * 1024,
};

// ============================================
// Next.js 配置
// ============================================
const nextConfig: NextConfig = {
  // ============================================
  // 基础配置
  // ============================================
  reactStrictMode: true,
  poweredByHeader: false,

  // Docker 部署使用 standalone 输出模式
  output: 'standalone',

  // ============================================
  // React Compiler 配置
  // ============================================
  // 启用 React Compiler 进行自动优化
  // 使用 annotation 模式，仅在组件添加 'use memo' 时优化
  reactCompiler: {
    compilationMode: 'annotation',
  },

  // TypeScript 构建选项
  typescript: {
    ignoreBuildErrors: false,
  },

  // ============================================
  // 生产环境优化
  // ============================================
  compress: true,
  generateEtags: true,
  productionBrowserSourceMaps: false,

  // ============================================
  // 图片优化
  // ============================================
  images: {
    // 启用现代图片格式
    formats: ['image/avif', 'image/webp'],

    // 图片尺寸配置（响应式）
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    // 最小缓存时间（30天）
    minimumCacheTTL: 60 * 60 * 24 * 30,

    // 远程图片域名白名单
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],

    // 安全配置
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",

    // 启用图片优化
    unoptimized: false,
  },

  // ============================================
  // 编译器选项 (SWC)
  // ============================================
  compiler: {
    // 生产环境移除 console.log，保留 error 和 warn
    removeConsole: isProduction
      ? {
          exclude: ['error', 'warn', 'info'],
        }
      : false,
  },

  // ============================================
  // 实验性选项
  // ============================================
  experimental: {
    // 包导入优化 - 改善 tree-shaking
    optimizePackageImports: [
      'lucide-react',
      'zustand',
      'web-vitals',
      'date-fns',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'recharts',
      'zod',
      'react-i18next',
      'i18next',
      'clsx',
      'tailwind-merge',
    ],

    // CSS 优化
    optimizeCss: true,
  },

  // ============================================
  // 服务端外部包
  // ============================================
  serverExternalPackages: [
    'jose',
    'better-sqlite3',
    'sharp',
    'uuid',
  ],

  // ============================================
  // Turbopack 配置（禁用以使用 Webpack）
  // ============================================
  turbopack: {}, // 空配置，让 Next.js 使用 Webpack

  // ============================================
  // Webpack 配置（生产环境优化）
  // ============================================
  webpack: (config: any, { isServer, dev }: any) => {
    // 路径别名配置
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['@'] = path.join(__dirname, 'src');

    // 模块解析优化
    config.resolve.extensions = ['.tsx', '.ts', '.js', '.json'];
    config.resolve.modules = ['node_modules'];

    // Tree-shaking 优化
    config.optimization = config.optimization || {};
    config.optimization.usedExports = true;
    config.optimization.sideEffects = true;
    config.optimization.providedExports = true;
    config.optimization.concatenateModules = true;

    if (!isServer && !dev) {
      // 性能预算配置
      config.performance = {
        maxEntrypointSize: CHUNK_LIMITS.maxEntrypointSize,
        maxAssetSize: CHUNK_LIMITS.maxAssetSize,
        hints: 'warning',
      };

      // 代码分包策略 - 优化版
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // Three.js 核心库（最大优先级）
          'three-core': {
            test: /[\\/]node_modules[\\/]three[\\/]/,
            name: 'three-core',
            priority: 70,
            reuseExistingChunk: true,
            enforce: true,
            minSize: CHUNK_LIMITS.minChunkSize,
            maxSize: 250 * 1024, // 限制大小
          },
          // React Three Fiber 相关
          'react-three': {
            test: /[\\/]node_modules[\\/]@react-three[\\/]/,
            name: 'react-three',
            priority: 65,
            reuseExistingChunk: true,
            enforce: true,
            minSize: CHUNK_LIMITS.minChunkSize,
            maxSize: 150 * 1024,
          },
          // 图表库
          'chart-libs': {
            test: /[\\/]node_modules[\\/](recharts|d3|@visx)[\\/]/,
            name: 'chart-libs',
            priority: 50,
            reuseExistingChunk: true,
            enforce: true,
            minSize: CHUNK_LIMITS.minChunkSize,
            maxSize: CHUNK_LIMITS.maxAsyncChunkSize,
          },
          // 实时通信库
          'realtime-libs': {
            test: /[\\/]node_modules[\\/](socket\.io|engine\.io)[\\/]/,
            name: 'realtime-libs',
            priority: 45,
            reuseExistingChunk: true,
            enforce: true,
            minSize: CHUNK_LIMITS.minChunkSize,
            maxSize: 80 * 1024,
          },
          // Radix UI 组件（独立分割）
          'radix-ui': {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'radix-ui',
            priority: 42,
            reuseExistingChunk: true,
            enforce: true,
            minSize: 15 * 1024,
            maxSize: 100 * 1024,
          },
          // Lucide 图标（独立分割）
          'lucide-icons': {
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            name: 'lucide-icons',
            priority: 41,
            reuseExistingChunk: true,
            enforce: true,
            minSize: 15 * 1024,
            maxSize: 80 * 1024,
          },
          // Framer Motion 动画
          'framer-motion': {
            test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
            name: 'framer-motion',
            priority: 40,
            reuseExistingChunk: true,
            enforce: true,
            minSize: 20 * 1024,
            maxSize: 100 * 1024,
          },
          // 框架核心 - 拆分为更小的部分
          'react-core': {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react-core',
            priority: 36,
            reuseExistingChunk: true,
            minSize: 80 * 1024,
            maxSize: 200 * 1024,
          },
          'next-core': {
            test: /[\\/]node_modules[\\/]next[\\/]/,
            name: 'next-core',
            priority: 35,
            reuseExistingChunk: true,
            minSize: 50 * 1024,
            maxSize: 150 * 1024,
          },
          // Zustand 状态管理
          'zustand': {
            test: /[\\/]node_modules[\\/]zustand[\\/]/,
            name: 'zustand',
            priority: 32,
            reuseExistingChunk: true,
            minSize: 10 * 1024,
            maxSize: 50 * 1024,
          },
          // 工具库
          'vendor-utils': {
            test: /[\\/]node_modules[\\/](immer|uuid|date-fns|lodash|clsx|tailwind-merge)[\\/]/,
            name: 'vendor-utils',
            priority: 30,
            reuseExistingChunk: true,
            minSize: 10 * 1024,
            maxSize: 80 * 1024,
          },
          // 表单验证库
          'forms-libs': {
            test: /[\\/]node_modules[\\/](zod|react-hook-form)[\\/]/,
            name: 'forms-libs',
            priority: 25,
            reuseExistingChunk: true,
            minSize: 15 * 1024,
            maxSize: 60 * 1024,
          },
          // 国际化库
          'i18n-libs': {
            test: /[\\/]node_modules[\\/](i18next|react-i18next|next-i18next|i18next-browser-languagedetector)[\\/]/,
            name: 'i18n-libs',
            priority: 22,
            reuseExistingChunk: true,
            minSize: CHUNK_LIMITS.minChunkSize,
            maxSize: 100 * 1024,
          },
          // 二维码库
          'qrcode': {
            test: /[\\/]node_modules[\\/]qrcode[\\/]/,
            name: 'qrcode',
            priority: 20,
            reuseExistingChunk: true,
            minSize: 10 * 1024,
            maxSize: 50 * 1024,
          },
          // Polyfills（优化）
          'polyfills': {
            test: /[\\/]node_modules[\\/](core-js|regenerator-runtime)[\\/]/,
            name: 'polyfills',
            priority: 18,
            reuseExistingChunk: true,
            minSize: 20 * 1024,
            maxSize: 100 * 1024,
          },
          // 通用 node_modules
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            minChunks: 2,
            reuseExistingChunk: true,
            minSize: CHUNK_LIMITS.minChunkSize,
          },
          // 公共代码
          common: {
            minChunks: 3,
            priority: 5,
            reuseExistingChunk: true,
            minSize: 20 * 1024,
          },
        },
        maxInitialRequests: 30, // 增加以允许更多并行请求
        maxAsyncRequests: 35,
        minSize: 10 * 1024, // 降低最小大小
        maxSize: 150 * 1024, // 降低默认最大大小
        minChunks: 1,
        enforceSizeThreshold: 20 * 1024, // 降低阈值
      };
    }

    return config;
  },

  // ============================================
  // 安全 Headers
  // ============================================
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
        ],
      },
      {
        source: '/:path*.{png,jpg,jpeg,webp,avif,svg,ico}',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
        ],
      },
    ];
  },

  // ============================================
  // 日志配置
  // ============================================
  logging: {
    fetches: {
      fullUrl: !isProduction,
    },
  },
};

// ============================================
// 导出配置
// ============================================
export default nextConfig;
