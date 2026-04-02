/// <reference types="vitest" />

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [path.resolve(__dirname, './src/test/setup.ts')],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],

    // 🚀 并行化配置 - P0 优化
    // 使用 forks 而不是 threads，因为 jsdom 在 forks 中性能更好
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
        minForks: 1,
        maxForks: 2, // 减少到 2 个进程，避免资源竞争
      },
    },
    fileParallelism: true,

    // 🚀 测试超时
    testTimeout: 15000, // 增加到 15 秒
    hookTimeout: 10000,

    // 重试失败的测试 (flaky test 保护)
    retry: 1,

    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  root: __dirname,
})
