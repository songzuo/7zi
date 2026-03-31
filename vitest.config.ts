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

  // Vitest 4: 线程池配置在顶层（不在 test 对象内）
  poolOptions: {
    forks: {
      singleFork: false, // 允许并行执行以提高测试速度
      isolate: true,     // 确保 fork 之间的隔离
    },
  },

  // Vitest 4: 并发工作线程配置
  maxThreads: 6, // 允许最多 6 个并行线程
  minThreads: 1,

  // 内存限制配置（防止 worker 崩溃）
  maxMemoryUsage: 2048, // 限制每个 worker 的内存使用为 2GB

  test: {
    environment: 'jsdom', // 使用 jsdom 环境以支持 React 组件测试
    globals: true,
    setupFiles: [path.resolve(__dirname, './tests/setup.ts')],
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}', 'app/**/*.{test,spec}.{js,ts,jsx,tsx}', 'tests/**/*.{test,spec}.{js,ts,jsx,tsx}'],

    // Vitest 4: 性能优化：使用 forks 线程池减少内存占用（jose 库需要真实 Node.js 环境）
    pool: 'forks',

    // 测试超时配置
    testTimeout: 60000,  // 增加到 60 秒以防止慢测试超时
    hookTimeout: 10000,
    // 失败时不重试
    retry: 0,

    // 文件级别的超时配置
    fileTimeout: 180000,  // 增加到 180 秒

    // 性能优化：测试隔离模式（单进程模式下使用 isolate: true 确保测试独立性）
    isolate: true,

    // 并发限制：限制同时运行的测试文件数量
    maxConcurrency: 6, // 允许同时运行 6 个测试文件以提高执行速度

    // 测试顺序：随机顺序以发现隐藏的依赖关系
    sequence: {
      shuffle: false,  // 保持顺序以确保稳定性
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
        'src/test/**',
        '**/*.d.ts',
        '**/*.config.*',
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
