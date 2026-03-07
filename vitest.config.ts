/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.tsx'],
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}', 'app/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    // 测试超时配置
    testTimeout: 10000,
    hookTimeout: 10000,
    // 失败时重试
    retry: 1,
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
        '**/types/**',
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
      '@': path.resolve(__dirname, './app'),
    },
  },
})
