import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";
import bundleAnalyzer from '@next/bundle-analyzer';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false, // 不自动打开浏览器，适合 CI/CD 环境
  analyzerMode: 'static', // 生成静态 HTML 报告
});

const nextConfig: NextConfig = {
  // Docker 部署使用 standalone 输出模式
  output: 'standalone',

  // 图片优化配置
  images: {
    // 允许的图片域名（用于外部图片优化）
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'github.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'va.vercel-scripts.com',
      },
    ],
    // 图片格式（AVIF 和 WebP）
    formats: ['image/avif', 'image/webp'],
    // 设备尺寸断点
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 最小缓存时间（秒）
    minimumCacheTTL: 60,
    // 图片质量优化
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // 压缩配置
  compress: true,

  // React 严格模式（开发环境）
  reactStrictMode: true,

  // 禁用 x-powered-by 头（安全）
  poweredByHeader: false,

  // 编译器配置
  compiler: {
    // 移除 console.log（生产环境）
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // 性能优化：实验性功能
  experimental: {
    // 优化包导入 - 减少打包体积
    optimizePackageImports: [
      'next-intl',
      '@sentry/nextjs',
      'zustand',
      'web-vitals',
      'lucide-react',
      // 🚀 新增：优化大型库导入
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'xlsx',
    ],
    // CSS 优化
    optimizeCss: true,
  },

  // 服务器组件外部包
  serverExternalPackages: [
    'sharp',
    'better-sqlite3',
    'jose',
    'uuid',
  ],

  // Webpack 配置优化
  webpack: (config, { isServer, dev, webpack }) => {
    // 生产环境优化
    if (!isServer && !dev) {
      // 客户端包拆分
      config.optimization = config.optimization || {};
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // 🚀 大型库独立打包 (最高优先级)
          'chart-libs': {
            test: /[\\/]node_modules[\\/](recharts|chart\.js|react-chartjs-2|d3|vis-network|vis-data|@visx)[\\/]/,
            name: 'chart-libs',
            priority: 50,
            reuseExistingChunk: true,
            enforce: true,
            minSize: 30000,
          },

          // 📊 实时通信库
          'realtime-libs': {
            test: /[\\/]node_modules[\\/](socket\.io-client|@socket\.io|engine\.io-client|eventemitter3)[\\/]/,
            name: 'realtime-libs',
            priority: 45,
            reuseExistingChunk: true,
            enforce: true,
            minSize: 30000,
          },

          // 🎨 UI 组件库独立打包
          'ui-libs': {
            test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|framer-motion|class-variance-authority|clsx|tailwind-merge)[\\/]/,
            name: 'ui-libs',
            priority: 40,
            reuseExistingChunk: true,
            enforce: true,
          },

          // 📦 核心框架合并 (React + Next.js)
          framework: {
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|next|next-intl)[\\/]/,
            name: 'framework',
            priority: 35,
            reuseExistingChunk: true,
            minSize: 30000,
          },

          // 🔧 工具库合并
          'vendor-utils': {
            test: /[\\/]node_modules[\\/](zustand|immer|uuid|date-fns|lodash|lodash-es)[\\/]/,
            name: 'vendor-utils',
            priority: 30,
            reuseExistingChunk: true,
          },

          // 📝 表单和验证库
          'forms-libs': {
            test: /[\\/]node_modules[\\/](zod|react-hook-form|@hookform)[\\/]/,
            name: 'forms-libs',
            priority: 25,
            reuseExistingChunk: true,
          },

          // 🧩 其他小型工具库合并
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            minChunks: 1,
            reuseExistingChunk: true,
          },

          // 公共模块
          common: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
        // 优化 chunk 控制参数
        maxInitialRequests: 25,  // 减少到 25 (原来 30)
        maxAsyncRequests: 25,    // 减少到 25 (原来 30)
        minSize: 20000,          // ⬆️ 增加到 20KB (原来 10KB) - 合并小 chunks
        maxSize: 244000,         // 最大 chunk 大小 244KB
        minChunks: 1,
        // 自动合并小 chunks
        enforceSizeThreshold: 50000,  // 50KB 以上才强制分割
      };

      // Tree shaking 优化
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;

      // 减少包体积
      config.optimization = config.optimization || {};
      config.optimization.providedExports = true;
      config.optimization.usedExports = true;
      config.optimization.sideEffects = true;
    }

    // 优化模块解析
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['@'] = __dirname + '/src';

    // 性能提示 - 生产环境启用
    if (!dev) {
      config.performance = {
        maxEntrypointSize: 512000, // 500KB
        maxAssetSize: 512000,
        hints: process.env.NODE_ENV === 'production' ? 'warning' : false,
      };
    }

    return config;
  },

  // 安全头配置
  headers: async () => {
    // CSP nonce for inline scripts (Next.js 16 auto-generates this)
    const cspNonce = process.env.CSP_NONCE || 'nonce-{GENERATED_NONCE}';

    return [
      {
        source: '/:path*',
        headers: [
          // Content Security Policy (CSP) - 防止 XSS 和数据注入
          {
            key: 'Content-Security-Policy',
            value: [
              // 默认策略：仅允许同源
              "default-src 'self'",

              // 脚本策略：使用 nonce 代替 unsafe-inline
              "script-src 'self' 'nonce-{GENERATED_NONCE}' https://va.vercel-scripts.com https://cdn.jsdelivr.net",

              // 样式策略：保留 unsafe-inline（CSS-in-JS 需要）
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

              // 字体策略
              "font-src 'self' https://fonts.gstatic.com data:",

              // 图片策略：允许所有图片来源（data:, blob:, https:, http:）
              "img-src 'self' data: blob: https: http: github.com avatars.githubusercontent.com va.vercel-scripts.com",

              // 连接策略：API 和分析服务
              "connect-src 'self' https://api.github.com https://o1.ingest.sentry.io https://va.vercel-scripts.com https://vitals.vercel-insights.com",

              // 框架策略
              "frame-src 'self'",

              // 基础 URI
              "base-uri 'self'",

              // 表单操作
              "form-action 'self'",

              // 禁用对象（Flash 等）
              "object-src 'none'",

              // 媒体源
              "media-src 'self'",

              // Worker 源
              "worker-src 'self'",

              // Manifest 源
              "manifest-src 'self'",

              // 升级不安全请求
              "upgrade-insecure-requests",
            ].join('; '),
          },
          // CSP Report-Only（测试模式，记录违规但不阻塞）
          {
            key: 'Content-Security-Policy-Report-Only',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https: http: github.com avatars.githubusercontent.com",
              "connect-src 'self' https://api.github.com https://o1.ingest.sentry.io https://va.vercel-scripts.com",
              "report-uri /api/csp-violation",
            ].join('; '),
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          // HTTPS 严格传输安全
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // 防止点击劫持
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          // 防止 MIME 类型嗅探
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // XSS 保护（已废弃但保留兼容性）
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // 引用策略
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // 权限策略（限制浏览器功能）
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
      {
        // 图片缓存优化
        source: '/:path*.{png,jpg,jpeg,webp,avif,svg,ico}',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // 静态资源缓存
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

// Export with plugins
export default withBundleAnalyzer(withNextIntl(nextConfig));
