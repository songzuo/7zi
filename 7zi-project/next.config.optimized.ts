import type { NextConfig } from 'next';

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // 启用严格模式
  reactStrictMode: true,

  // 输出模式 (standalone 用于 Docker 部署)
  output: 'standalone',

  // ⚡ OPTIMIZATION 1: 图片优化配置
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    // 启用图片优化
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 图片缓存时间（秒）
    minimumCacheTTL: 60,
  },

  // ⚡ OPTIMIZATION 2: 生产环境优化
  compress: true,
  productionBrowserSourceMaps: false,
  
  // ⚡ OPTIMIZATION 3: 代码分割优化
  swcMinify: true,
  
  // ⚡ OPTIMIZATION 4: Webpack 优化
  webpack: (config, { isServer }) => {
    // 优化模块解析
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': '/root/.openclaw/workspace/7zi-project/src',
    };
    
    // 减少构建体积
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },

  // 环境变量 (服务端)
  env: {
    // 可以在这里添加服务端环境变量
  },

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
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
};

// 导出配置
module.exports = withBundleAnalyzer(nextConfig);
