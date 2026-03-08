import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Docker 部署使用 standalone 输出模式
  output: 'standalone',
  
  // 构建性能优化
  experimental: {
    // 优化包处理
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
    // 启用 SWC 插件
    swcPlugins: [],
    // 减少构建大小
    serverComponentsHmrCache: false,
  },
  
  // 图片优化配置
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    // 限制最大图片尺寸
    dangerouslyAllowSVG: false,
  },
  
  // 压缩配置
  compress: true,
  
  // React 严格模式
  reactStrictMode: true,
  
  // 禁用 x-powered-by 头
  poweredByHeader: false,
  
  // Webpack 构建优化
  webpack: (config, { isServer, dev }) => {
    // 生产环境优化
    if (!isServer && !dev) {
      // 移除 console.log 等调试代码
      config.optimization.minimizer = config.optimization.minimizer.map((minimizer: { constructor: { name: string }; options?: { terserOptions?: { compress?: { drop_console?: boolean; drop_debugger?: boolean } } } }) => {
        if (minimizer.constructor.name === 'TerserPlugin') {
          minimizer.options.terserOptions.compress.drop_console = true;
          minimizer.options.terserOptions.compress.drop_debugger = true;
        }
        return minimizer;
      });
      
      // 拆分代码块优化
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // 第三方库单独打包
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
          },
          // React 相关单独打包
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 20,
            reuseExistingChunk: true,
          },
          // Three.js 相关单独打包（体积大）
          three: {
            test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
            name: 'three',
            chunks: 'all',
            priority: 30,
            reuseExistingChunk: true,
          },
          // 通用组件
          common: {
            minChunks: 2,
            name: 'common',
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };
      
      // 减少构建大小 - 移除 source map
      config.devtool = false;
    }
    
    // 缓存配置
    if (!dev) {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
    }
    
    return config;
  },
  
  // 安全头配置
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
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https: blob:",
            "font-src 'self' data:",
            "connect-src 'self' https: wss:",
            "frame-ancestors 'self'",
            "base-uri 'self'",
            "form-action 'self'",
            "object-src 'none'",
          ].join('; '),
        },
      ],
    },
    {
      source: '/:path*.{png,jpg,jpeg,webp,avif,svg,ico}',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
    {
      source: '/_next/static/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ],
  
  // TypeScript 配置
  typescript: {
    // 生产环境忽略类型错误（加快构建）
    ignoreBuildErrors: true,
  },
  
  // 减少构建大小
  // 排除不必要的文件
  excludeDefaultMomentLocales: true,
};

export default withNextIntl(nextConfig);
