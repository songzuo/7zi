const { withSentryConfig } = require('@sentry/nextjs');
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 性能优化：压缩输出
  compress: true,
  // 生产优化
  productionBrowserSourceMaps: false, // 减少构建大小
  // 图片优化配置
  images: {
    unoptimized: true, // 静态导出时需要
    domains: ['api.dicebear.com', 'avatars.githubusercontent.com', 'github.com'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days cache
  },
  // 编译器优化 - 生产环境移除 console
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // 安全策略
  poweredByHeader: false,
  // 静态资源优化
  trailingSlash: false,
  // 使用 standalone 输出模式支持 API 路由
  output: 'standalone',
  // 实验性功能
  experimental: {
    optimizePackageImports: ['lucide-react', '@tanstack/react-query'],
    // 启用优化 CSS
    optimizeCss: true,
  },
  // Headers 配置 - 性能和安全
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // 缓存控制
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          // 安全头
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      {
        // 静态资源长期缓存
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // 图片资源缓存
        source: '/:all*(svg|jpg|png|ico|webp|avif|gif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // 字体缓存
        source: '/:all*(woff|woff2|eot|ttf|otf)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
  // 重定向配置
  async redirects() {
    return [
      // 旧路径重定向
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

// Sentry 配置
const sentryWebpackPluginOptions = {
  silent: true, // 安静模式，减少构建日志
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  release: process.env.SENTRY_RELEASE || process.env.npm_package_version,
};

// 使用 withNextIntl 和 withSentryConfig 包装配置
const moduleExports = withSentryConfig(withNextIntl(nextConfig), sentryWebpackPluginOptions);

module.exports = moduleExports;