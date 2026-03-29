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

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // 输出配置
  output: 'standalone',

  // 图片优化
  images: {
    domains: ['avatars.githubusercontent.com', 'github'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // React Compiler 配置 (仅在启用时应用)
  ...(reactCompilerEnabled && {
    experimental: {
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
