/// <reference types="vitest" />

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  
  // 🚀 并行化配置 - P0 优化 (Vitest 4 format)
  // 使用 forks 而不是 threads，因为 jsdom 在 forks 中性能更好
  pool: 'forks',
  poolOptions: {
    forks: {
      singleFork: false,
      minForks: 2,
      maxForks: 8,
    },
  },
  
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [path.resolve(__dirname, './src/test/setup.ts')],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],

    // Playwright 端到端用例由 playwright.config.ts (testDir: ./e2e) 负责，
    // 不能被 vitest 收集（test.describe() 在 vitest 下会直接抛错）
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      'tests/e2e/**',
    ],
    fileParallelism: true,

    // 🚀 测试超时 (优化: 60s → 12s)
    testTimeout: 12000,
    hookTimeout: 10000,

    // 重试失败的测试 (flaky test 保护)
    retry: 1,

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', '**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  root: __dirname,
})
