import type { NextConfig } from 'next';

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // 启用严格模式
  reactStrictMode: true,

  // 输出模式 (standalone 用于 Docker 部署)
  output: 'standalone',

  // 图片优化
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // 环境变量 (服务端)
  env: {
    // 可以在这里添加服务端环境变量
  },

  // 压缩
  compress: true,

  // 生产环境 source map (可选)
  productionBrowserSourceMaps: false,

  // 头部配置 (安全)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
        ],
      },
    ];
  },

  // 实验性功能
  experimental: {
    // 启用增量静态再生成 (ISR)
    // isrMemoryCacheSize: 50, // MB
  },
};

// 导出配置
module.exports = withBundleAnalyzer(nextConfig);
