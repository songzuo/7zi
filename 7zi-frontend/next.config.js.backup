/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  // ============================================
  // 基础配置
  // ============================================
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',  // Docker 部署
  typescript: {
    ignoreBuildErrors: true,
  },

  // ============================================
  // 图片优化
  // ============================================
  images: {
    // 启用现代图片格式
    formats: ['image/avif', 'image/webp'],
    
    // 图片尺寸配置（响应式）
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
    // 最小缓存时间（秒）
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 天
    
    // 远程图片域名白名单
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    
    // 危险的允许 SVG（仅在需要时启用）
    dangerouslyAllowSVG: false,
    
    // 内容安全策略
    contentDispositionType: 'attachment',
    
    // 内容安全策略（针对图片）
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    
    // 启用图片优化的严格模式
    unoptimized: false,
  },

  // ============================================
  // 生产优化
  // ============================================
  compress: true,
  generateEtags: true,
  productionBrowserSourceMaps: false,

  // ============================================
  // 编译器选项 (Next.js 16+ 默认使用 SWC)
  // 注意: swcMinify 已废弃，Next.js 16+ 默认启用 SWC 压缩
  // ============================================
  compiler: {
    // 生产环境移除 console.log，保留 error 和 warn
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // ============================================
  // 实验性选项 (仅使用文档中的)
  // ============================================
  experimental: {
    // 包导入优化 - 改善 tree-shaking
    optimizePackageImports: [
      'lucide-react',
      'zustand',
      'web-vitals',
      'date-fns',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'recharts',
      'zod',
    ],
    // CSS 优化
    optimizeCss: true,
  },

  // ============================================
  // Turbopack 配置 (Next.js 16+)
  // ============================================
  turbopack: {
    // 路径别名 - 替代 webpack resolve.alias
    resolveAlias: {
      '@': path.join(__dirname, 'src'),
    },
    // 文件系统根目录（解决 lockfile 警告）
    root: __dirname,
  },

  // ============================================
  // 服务端外部包 (不要与 transpilePackages 冲突)
  // ============================================
  serverExternalPackages: [
    'jose',
    'better-sqlite3',
  ],

  // ============================================
  // Webpack 后备配置 (仅当 USE_WEBPACK=true 时启用)
  // 用于需要回退到 webpack 的场景
  // ============================================
  webpack: (config, { isServer, dev }) => {
    // 仅在明确使用 webpack 时应用复杂配置
    if (process.env.USE_WEBPACK === 'true') {
      // 路径别名配置
      config.resolve.alias = config.resolve.alias || {};
      config.resolve.alias['@'] = __dirname + '/src';

      if (!isServer && !dev) {
        config.optimization = config.optimization || {};
        
        // 性能预算配置
        config.performance = {
          maxEntrypointSize: 300000,
          maxAssetSize: 250000,
          hints: 'warning',
        };

        // 代码分包策略 (9个 cacheGroups)
        config.optimization.splitChunks = {
          chunks: 'all',
          cacheGroups: {
            // Three.js 相关库
            'three-libs': {
              test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
              name: 'three-libs',
              priority: 60,
              reuseExistingChunk: true,
              enforce: true,
              minSize: 30000,
              maxSize: 300000,
            },
            // 图表库
            'chart-libs': {
              test: /[\\/]node_modules[\\/](recharts|d3|@visx)[\\/]/,
              name: 'chart-libs',
              priority: 50,
              reuseExistingChunk: true,
              enforce: true,
              minSize: 30000,
              maxSize: 200000,
            },
            // 实时通信库
            'realtime-libs': {
              test: /[\\/]node_modules[\\/](socket\.io|engine\.io)[\\/]/,
              name: 'realtime-libs',
              priority: 45,
              reuseExistingChunk: true,
              enforce: true,
              minSize: 30000,
            },
            // UI 组件库
            'ui-libs': {
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|framer-motion)[\\/]/,
              name: 'ui-libs',
              priority: 40,
              reuseExistingChunk: true,
              enforce: true,
              minSize: 20000,
            },
            // 框架核心
            'framework': {
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              name: 'framework',
              priority: 35,
              reuseExistingChunk: true,
              minSize: 100000,
              maxSize: 400000,
            },
            // 工具库
            'vendor-utils': {
              test: /[\\/]node_modules[\\/](zustand|immer|uuid|date-fns|lodash)[\\/]/,
              name: 'vendor-utils',
              priority: 30,
              reuseExistingChunk: true,
              minSize: 20000,
            },
            // 表单验证库
            'forms-libs': {
              test: /[\\/]node_modules[\\/](zod|react-hook-form)[\\/]/,
              name: 'forms-libs',
              priority: 25,
              reuseExistingChunk: true,
              minSize: 20000,
            },
            // Excel 处理库
            'excel-libs': {
              test: /[\\/]node_modules[\\/](exceljs)[\\/]/,
              name: 'excel-libs',
              priority: 20,
              reuseExistingChunk: true,
              enforce: true,
              minSize: 50000,
            },
            // 通用 node_modules
            vendors: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              minChunks: 2,
              reuseExistingChunk: true,
              minSize: 30000,
            },
            // 公共代码
            common: {
              minChunks: 3,
              priority: 5,
              reuseExistingChunk: true,
              minSize: 20000,
            },
          },
          maxInitialRequests: 25,
          maxAsyncRequests: 30,
          minSize: 15000,
          maxSize: 200000,
          minChunks: 1,
          enforceSizeThreshold: 30000,
        };

        // Tree-shaking 优化
        config.optimization.usedExports = true;
        config.optimization.sideEffects = false;
        config.optimization.providedExports = true;
        config.optimization.concatenateModules = true;
      }
    }

    return config;
  },
};

module.exports = nextConfig;
