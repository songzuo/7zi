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
    // 图片格式（AVIF 和 WebP）
    formats: ['image/avif', 'image/webp'],
    // 设备尺寸断点
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 最小缓存时间（秒）
    minimumCacheTTL: 60,
    // 静态导出时外部图片需要 unoptimized
    unoptimized: true,
  },
  
  // 压缩配置
  compress: true,
  
  // 生产环境源码映射（调试用，生产建议关闭）
  // productionBrowserSourceMaps: false,
  
  // React 严格模式（开发环境）
  reactStrictMode: true,
  
  // 禁用 x-powered-by 头（安全）
  poweredByHeader: false,
  
  // 静态导出模式下 headers 不生效，需要在 CDN/服务器配置
  // 这里是开发时的配置参考，实际部署需要在服务器层面设置
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
  
  // 导出路径配置
  trailingSlash: true,
  
  // 生成的静态文件目录
  // outDir: './out',
  
  // 忽略 TypeScript 错误
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
  
  // 忽略 ESLint 错误
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
};

export default nextConfig;
