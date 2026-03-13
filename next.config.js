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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
