import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

// 创建 next-intl 插件，指定配置文件路径
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

// ============================================================================
// Security Configuration (P1 Security Enhancements)
// ============================================================================
const isProduction = process.env.NODE_ENV === 'production'

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: false },
  reactStrictMode: true,

  // 输出配置
  output: 'standalone',

  // ============================================================================
  // Security Headers (P1 Security Enhancement)
  // ============================================================================
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          // Security Headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: isProduction ? 'max-age=63072000; includeSubDomains; preload' : 'max-age=0',
          },
          {
            key: 'X-Frame-Options',
            value: isProduction ? 'DENY' : 'SAMEORIGIN',
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
            value:
              'camera=(), microphone=(), geolocation=(self), payment=(self), usb=(), magnetometer=(), accelerometer=(), gyroscope=(), fullscreen=(self), screen-wake-lock=(self)',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-site',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: isProduction ? 'require-corp' : 'unsafe-none',
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none',
          },
          {
            key: 'Content-Security-Policy',
            value: isProduction
              ? "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;"
              : "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
          },
        ],
      },
      {
        // API routes - stricter CSP
        source: '/api/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'none'; style-src 'none'; img-src 'self' data:; font-src 'none'; connect-src 'self'; media-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'self';",
          },
        ],
      },
    ]
  },

  // v1.8.0 性能优化: 图片优化配置
  images: {
    // 使用 remotePatterns 替代已废弃的 domains
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: false,
    unoptimized: false,
    // v1.8.0: 启用图片压缩, v1.14.3: 缓存时间从60秒提升到1年
    minimumCacheTTL: 31536000,
  },

  // React Compiler 配置已移除 (Next.js 16.2.4 不识别此选项)
  // React 19 内置支持，无需额外配置

  // 实验性功能
  experimental: {
    
    optimizeCss: true,
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      // v1.12.0: 移除了未使用的 @radix-ui 和 framer-motion 配置
    ],
  },

  // 编译器选项
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'],
          }
        : false,
  },

  // v1.8.0 性能优化: 增强的 Webpack 配置
  webpack: (config, { isServer }) => {
    config.externals = config.externals || []
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      bufferutil: 'commonjs bufferutil',
    })

    // 优化 3: 模块解析优化
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...config.resolve.alias,
      // 优化 lodash 导入 - 使用 lodash-es
      'lodash': require.resolve('lodash-es'),
      'lodash/': 'lodash-es/',
    }

    // bull 库需要特定的 Node.js 模块处理
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        lodash: require.resolve('lodash-es'),
      }
    }

    // 优化 1: 代码分割策略 - 将大型依赖分离到独立 chunk
    if (!isServer) {
      config.optimization = config.optimization || {}
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // React 核心库单独打包
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            name: 'react-core',
            priority: 100,
            reuseExistingChunk: true,
          },
          // 图表库单独打包
          charts: {
            test: /[\\/]node_modules[\\/](recharts)[\\/]/,
            name: 'chart-libs',
            priority: 80,
            reuseExistingChunk: true,
          },
          // 3D 库单独打包 (动态加载)
          three: {
            test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
            name: 'three-libs',
            priority: 80,
            reuseExistingChunk: true,
          },
          // 工具库单独打包
          utils: {
            test: /[\\/]node_modules[\\/](lodash|date-fns|dayjs|uuid)[\\/]/,
            name: 'utils-libs',
            priority: 60,
            reuseExistingChunk: true,
          },
          // 其他 vendor 代码
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true,
            minChunks: 2,
          },
        },
        maxInitialRequests: 25,
        maxAsyncRequests: 25,
        minSize: 20000,
      }
    }

    // 优化 2: Tree Shaking 增强
    config.optimization = config.optimization || {}
    config.optimization.usedExports = true
    config.optimization.sideEffects = true

    return config
  },
}

export default withNextIntl(nextConfig)
