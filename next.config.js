/** @type {import('next').NextConfig} */
const nextConfig = {
  // 跳过 trailing slash 重定向
  skipTrailingSlashRedirect: true,
  
  experimental: {
    optimizePackageImports: [
      '@react-three/fiber',
      '@react-three/drei',
      'three',
      'chart.js',
      'react-chartjs-2',
      'fuse.js',
      'zustand',
      'next-intl',
      'next-themes',
    ],
  },
  images: {
    // 修复: 限制远程图案以防止 SSRF
    // 只允许特定的受信任域名
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plausible.io',
      },
      {
        protocol: 'https',
        hostname: 'umami.7zi.studio',
      },
    ],
    // 限制图像优化路由以防止缓存中毒
    minimumCacheTTL: 60,
    formats: ['image/avif', 'image/webp'],
  },
  // 生产环境安全配置
  poweredByHeader: false,
  // 压缩响应
  compress: true,
  // 生成静态页面时排除 API 路由
  excludeFilePathsFromExpressMiddleware: ['/api'],
};

module.exports = nextConfig;
