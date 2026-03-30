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
        minForks: 2,
        maxForks: 4,
      },
    },
    fileParallelism: true,
    
    // 🚀 测试超时
    testTimeout: 10000,
    hookTimeout: 10000,
    
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  root: __dirname,
})
