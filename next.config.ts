import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// 创建 next-intl 插件，指定配置文件路径
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// ============================================================================
// React Compiler 配置
// ============================================================================
// 服务端环境变量，用于构建时控制
const reactCompilerEnabled = process.env.ENABLE_REACT_COMPILER === 'true';
const reactCompilerMode = process.env.REACT_COMPILER_MODE || 'opt-out';
const reactCompilerExcludePatterns = process.env.REACT_COMPILER_EXCLUDE_PATTERNS || '';

// 解析排除模式
const excludePatterns = reactCompilerExcludePatterns
  ? reactCompilerExcludePatterns.split(',').map(p => p.trim())
  : [];

// ============================================================================
// Security Configuration (P1 Security Enhancements)
// ============================================================================
const isProduction = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
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
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: isProduction ? 'max-age=63072000; includeSubDomains; preload' : 'max-age=0'
          },
          {
            key: 'X-Frame-Options',
            value: isProduction ? 'DENY' : 'SAMEORIGIN'
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
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), payment=(self), usb=(), magnetometer=(), accelerometer=(), gyroscope=(), fullscreen=(self), screen-wake-lock=(self)'
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-site'
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: isProduction ? 'require-corp' : 'unsafe-none'
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none'
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
            value: "default-src 'self'; script-src 'none'; style-src 'none'; img-src 'self' data:; font-src 'none'; connect-src 'self'; media-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'self';",
          },
        ],
      },
    ];
  },

  // 图片优化
  images: {
    domains: ['avatars.githubusercontent.com', 'github'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: false,
    unoptimized: false,
  },

  // React Compiler 配置 (Next.js 16+: 顶级配置)
  ...(reactCompilerEnabled && {
    reactCompiler: {
      // 源文件过滤函数
      sources: (filename: string) => {
        const normalizedPath = filename.replace(/\\/g, '/');

        // 检查排除模式
        for (const pattern of excludePatterns) {
          if (normalizedPath.includes(pattern) || normalizedPath.match(pattern.replace(/\*\*/g, '.*'))) {
            return false;
          }
        }

        // 固定黑名单 (始终排除)
        const alwaysExclude = [
          'node_modules',
          '.next',
          'build',
          'dist',
          'src/lib/third-party',
          'src/components/legacy',
          'src/app/standalone', // Next.js standalone 输出
        ];

        for (const pattern of alwaysExclude) {
          if (normalizedPath.includes(pattern)) {
            return false;
          }
        }

        // opt-in 模式：只编译指定目录
        if (reactCompilerMode === 'opt-in') {
          const includePatterns = [
            'src/components/features',
            'src/components/dashboard',
            'src/components/tasks',
            'src/app/[locale]/dashboard',
          ];
          for (const pattern of includePatterns) {
            if (normalizedPath.includes(pattern)) {
              return true;
            }
          }
          return false;
        }

        // opt-out 模式或 all 模式：编译除黑名单外的所有文件
        return true;
      },
    },
  }),

  // 实验性功能
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },

  // 编译器选项
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Webpack 配置
  webpack: (config) => {
    config.externals = config.externals || [];
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });

    return config;
  },
};

export default withNextIntl(nextConfig);
