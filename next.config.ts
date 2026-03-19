import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

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
        hostname: '**',
      },
    ],
    // 图片格式（AVIF 和 WebP）
    formats: ['image/avif', 'image/webp'],
    // 设备尺寸断点
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 最小缓存时间（秒）
    minimumCacheTTL: 60,
  },
  
  // 压缩配置
  compress: true,
  
  // React 严格模式（开发环境）
  reactStrictMode: true,
  
  // 禁用 x-powered-by 头（安全）
  poweredByHeader: false,
  
  // 性能优化：实验性功能
  experimental: {
    // 优化包导入 - 减少打包体积
    optimizePackageImports: [
      'next-intl',
      '@sentry/nextjs',
      'zustand',
      'web-vitals',
    ],
  },
  
  // Webpack 配置优化
  webpack: (config, { isServer }) => {
    // 生产环境优化
    if (!isServer) {
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
          },
          // Next.js 核心单独打包
          next: {
            test: /[\\/]node_modules[\\/](next)[\\/]/,
            name: 'next-core',
            priority: 30,
          },
          // UI 组件库
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 20,
            reuseExistingChunk: true,
          },
          // 公共模块
          common: {
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true,
          },
        },
        maxInitialRequests: 25,
        minSize: 20000,
      };
    }
    
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
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://cdn.jsdelivr.net",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com data:",
            "img-src 'self' data: blob: https: http:",
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
  ],
  
  // 忽略 TypeScript 错误
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
  
  // 忽略 ESLint 错误
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
};

// Export with next-intl wrapper
export default withNextIntl(nextConfig);
