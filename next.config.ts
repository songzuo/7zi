import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 启用静态导出
  output: 'export',
  
  // 图片优化配置
  images: {
    // 允许的图片域名（用于外部图片优化）
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // 图片格式
    formats: ['image/avif', 'image/webp'],
    // 设备尺寸断点
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 最小缓存时间（秒）
    minimumCacheTTL: 60,
    // 未优化图片的最大尺寸
    unoptimized: false,
  },
  
  // 压缩配置
  compress: true,
  
  // 生产环境源码映射（调试用，生产建议关闭）
  // productionBrowserSourceMaps: false,
  
  // React 严格模式（开发环境）
  reactStrictMode: true,
  
  // 禁用 x-powered-by 头（安全）
  poweredByHeader: false,
  
  // 头部配置
  headers: async () => [
    {
      source: '/:path*',
      headers: [
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
  
  // 重定向配置（如需要）
  // redirects: async () => [],
  
  // 重写配置（如需要）
  // rewrites: async () => [],
};

export default nextConfig;
