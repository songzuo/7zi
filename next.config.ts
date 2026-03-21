import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";
import bundleAnalyzer from '@next/bundle-analyzer';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // Docker 部署使用 standalone 输出模式
  output: 'standalone',

  // Turbopack 根目录配置（解决 multiple lockfiles 警告）
  turbopack: {
    root: __dirname,
  },

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
  webpack: (config, { isServer, dev }) => {
    // 生产环境优化
    if (!isServer && !dev) {
      // 客户端包拆分
      config.optimization = config.optimization || {};
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // React 核心库单独打包
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            name: 'react-core',
            priority: 40,
            reuseExistingChunk: true,
          },
          // Next.js 核心单独打包
          next: {
            test: /[\\/]node_modules[\\/](next|next-intl)[\\/]/,
            name: 'next-core',
            priority: 35,
            reuseExistingChunk: true,
          },
          // 状态管理库
          state: {
            test: /[\\/]node_modules[\\/](zustand|immer|redux)[\\/]/,
            name: 'state-management',
            priority: 30,
            reuseExistingChunk: true,
          },
          // UI 组件库
          ui: {
            test: /[\\/]node_modules[\\/](lucide-react|@radix-ui)[\\/]/,
            name: 'ui-components',
            priority: 25,
            reuseExistingChunk: true,
          },
          // 实用工具库
          utils: {
            test: /[\\/]node_modules[\\/](uuid|clsx|class-variance-authority|date-fns)[\\/]/,
            name: 'utils',
            priority: 20,
            reuseExistingChunk: true,
          },
          // 其他 vendor
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 15,
            reuseExistingChunk: true,
          },
          // 公共模块
          common: {
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true,
          },
        },
        // 更细粒度的 chunk 控制
        maxInitialRequests: 30,  // 增加到 30
        maxAsyncRequests: 30,    // 增加异步请求数
        minSize: 10240,        // 减小到 10KB
        maxSize: 244000,       // 最大 chunk 大小 244KB
        minChunks: 1,
      };

      // Tree shaking 优化
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }

    // 优化模块解析
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['@'] = __dirname + '/src';

    return config;
  },

  // 安全头配置
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        // Content Security Policy (CSP) - 防止 XSS 和数据注入
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://cdn.jsdelivr.net",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com data:",
            "img-src 'self' data: blob: https: http: github.com avatars.githubusercontent.com va.vercel-scripts.com",
            "connect-src 'self' https://api.github.com https://o1.ingest.sentry.io https://va.vercel-scripts.com https://vitals.vercel-insights.com",
            "frame-ancestors 'self'",
            "base-uri 'self'",
            "form-action 'self'",
            "object-src 'none'",
          ].join('; '),
        },
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'on',
        },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        {
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
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
  ],
};

// Export with plugins
export default withBundleAnalyzer(withNextIntl(nextConfig));
