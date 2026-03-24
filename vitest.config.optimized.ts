/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import os from 'os'

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 根据CPU核心数自动设置线程数
const cpuCount = os.cpus().length
const maxWorkers = Math.max(2, cpuCount - 1) // 保留一个核心给系统

export default defineConfig({
  plugins: [react()],

  // Vitest 4: 移除单进程限制，启用并行化
  maxThreads: maxWorkers,
  minThreads: 2,

  // 内存限制配置
  maxMemoryUsage: 4096, // 提高到 4GB 以支持并行

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [path.resolve(__dirname, './src/test/setup.tsx')],
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}', 'app/**/*.{test,spec}.{js,ts,jsx,tsx}'],

    // 性能优化：使用多线程 pool
    pool: 'vmForks',

    // 超时配置（优化后不需要那么长）
    testTimeout: 10000,
    hookTimeout: 10000,

    // 失败时重试（减少为0以提高速度，CI环境可设为1）
    retry: process.env.CI ? 1 : 0,

    // 文件级别的超时
    fileTimeout: 60000,

    // 启用测试隔离，但允许多文件并行
    isolate: true,

    // 并发限制：根据测试类型动态调整
    maxConcurrency: maxWorkers,

    // 并行执行测试文件
    sequence: {
      shuffle: false,  // 保持顺序确保稳定性
      concurrent: true, // 启用并发执行
    },

    // 配置工作进程池
    poolOptions: {
      vmForks: {
        singleFork: false, // 使用多进程并行
        isolate: true,    // 保持进程隔离
        execArgv: ['--max-old-space-size=3072'], // 每个进程 3GB
      },
    },

    // 优化覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      // 排除不需要覆盖的文件
      exclude: [
        'node_modules/**',
        'src/test/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.stories.*',
        '**/stories/**',
      ],
      // 覆盖率阈值
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 40,
        statements: 50,
      },
      // 仅在需要时收集覆盖率
      all: false, // 只测试已覆盖的文件
      // 并行收集覆盖率
      cleanOnRerun: true,
    },

    // 优化报告器
    reporter: process.env.CI ? ['default', 'json'] : ['default'],
    // 减少输出噪音
    silent: false,
    ui: false,

    // 优化文件监听
    watch: false,
    // 允许并行收集结果
    concurrent: true,

    // 测试名称模式（用于运行特定测试）
    testNamePattern: undefined,

    // 优化测试匹配
    includeSource: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
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
