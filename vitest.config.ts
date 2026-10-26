/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import os from 'os'

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Auto-detect CPU cores for optimal parallelization
const cpuCount = os.cpus().length
// For 4 cores: maxForks=8, maxConcurrency=3
// Conservative setting: forks = CPU * 2, concurrency = CPU - 1
const maxForks = Math.min(cpuCount * 2, 8)  // Cap at 8 to prevent memory pressure
const maxConcurrency = Math.max(2, cpuCount - 1)  // Leave 1 core for system

export default defineConfig({
  plugins: [react()],

  // Vitest 4: Thread pool configuration at top level (NOT inside test object)
  poolOptions: {
    forks: {
      singleFork: false,           // Enable parallel execution
      isolate: true,               // Ensure fork isolation
      maxForks: maxForks,          // Dynamic: 8 for 4-core machine
    },
  },

  // Memory limit per worker (prevent OOM crashes)
  maxMemoryUsage: 2048,  // 2GB per worker

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [path.resolve(__dirname, './tests/setup.ts')],
    include: [
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'app/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'tests/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],

    // Use forks pool (lighter than vmForks, better for jsdom tests)
    pool: 'forks',

    // Test timeout configuration (reduced from 180s to 60s)
    testTimeout: 60000,   // 60 seconds per test
    hookTimeout: 10000,   // 10 seconds for hooks

    // v12：CI 里不再 retry。
    // 原来 `retry: process.env.CI ? 1 : 0` 会让每个失败/挂死的用例跑两遍，
    // 而 draft-storage.test.ts 的 fake IDBRequest 从不回调 → 单个用例吃满
    // testTimeout(60s) × 2 = 120s，9 个用例 700s，直接把分片 3/4 顶穿
    // 20 分钟上限（job conclusion = cancelled，这才是 CI 恒红的真因）。
    // 测试本身已修，这里去掉 retry 再省一半时间。
    retry: 0,

    // v12：删掉 `fileTimeout: 120000`。它不是 vitest 的合法选项，一直被静默
    // 忽略，真正生效的只有上面的 testTimeout（每用例 60s）。留一个假开关比
    // 没有更危险。

    // Test isolation enabled
    isolate: true,

    // Limit concurrent test files
    maxConcurrency: maxConcurrency,  // Dynamic: 3 for 4-core machine

    // Test execution order
    sequence: {
      shuffle: false,  // Keep order for stability
    },

    // Disable worker threads (use forks instead)
    workerThreads: false,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'src/test/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.stories.*',
      ],
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

  // Cache configuration
  cache: {
    dir: path.resolve(__dirname, '.vitest/cache'),
  },
})
