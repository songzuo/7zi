/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],

  // Set root directory explicitly
  root: __dirname,

  // Vitest 4: 线程池配置在顶层（不在 test 对象内）
  poolOptions: {
    vmForks: {
      singleFork: true, // 使用单进程执行以减少内存占用和构建阻塞
      isolate: true,    // 确保 fork 之间的隔离
      execArgv: ['--max-old-space-size=2048'], // 限制 Node.js 内存使用
    },
  },

  // Vitest 4: 严格限制并发工作线程数量
  maxThreads: 1, // 使用单个线程避免内存溢出
  minThreads: 1,

  // 内存限制配置（防止 worker 崩溃）
  maxMemoryUsage: 2048, // 限制每个 worker 的内存使用为 2GB

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [path.resolve(__dirname, 'src/test/setup.tsx')],
    include: [
      'tests/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}'
    ],

    // Vitest 4: 性能优化：使用 vmForks 线程池减少内存占用
    pool: 'vmForks',

    // 测试超时配置
    testTimeout: 15000,  // 增加到 15 秒以防止慢测试超时
    hookTimeout: 10000,
    // 失败时重试
    retry: 1,

    // 文件级别的超时配置
    fileTimeout: 60000,  // 增加到 60 秒

    // 性能优化：测试隔离模式（单进程模式下使用 isolate: true 确保测试独立性）
    isolate: true,

    // 并发限制：限制同时运行的测试文件数量
    maxConcurrency: 1, // 串行执行以避免内存溢出

    // 测试顺序：随机顺序以发现隐藏的依赖关系
    sequence: {
      shuffle: false,  // 保持顺序以确保稳定性
      concurrent: false, // 串行执行
    },

    // 限制工作线程的生命周期
    workerThreads: false, // 禁用 worker threads，使用 forks

    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      // 排除不需要覆盖的文件
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.d.ts',
        '**/*.config.*',
        '7zi-frontend/src/test/**',
        'src/test/**',
        'e2e/**',
        '*.spec.ts',
        '*.test.ts',
      ],
      // 包含的文件
      include: [
        '7zi-frontend/src/**/*.{js,ts,jsx,tsx}',
        'src/**/*.{js,ts,jsx,tsx}',
        'app/**/*.{js,ts,jsx,tsx}',
      ],
      // 覆盖率阈值
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 40,
        statements: 50,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/test': path.resolve(__dirname, './src/test'),
      '@/lib/utils': path.resolve(__dirname, './src/lib/utils.ts'),
    },
  },
  // Fix module resolution for tests
  define: {
    global: 'globalThis',
  },
  // 优化缓存配置
  cache: {
    dir: path.resolve(__dirname, '.vitest/cache'),
  },
})
