/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],

  // 快速测试配置：更多并发，更少限制
  maxThreads: 4,
  minThreads: 2,

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [path.resolve(__dirname, './src/test/setup.tsx')],
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}', 'app/**/*.{test,spec}.{js,ts,jsx,tsx}'],

    // 排除高复杂度文件
    exclude: ['node_modules/**', '**/*.test.integration.{ts,tsx}', '**/*.e2e.{ts,tsx}'],

    pool: 'vmForks',

    // 快速测试的超时时间更短
    testTimeout: 5000,
    hookTimeout: 5000,
    fileTimeout: 30000,

    // 快速测试不重试
    retry: 0,

    isolate: true,
    maxConcurrency: 4,

    sequence: {
      shuffle: false,
      concurrent: true,
    },

    poolOptions: {
      vmForks: {
        singleFork: false,
        isolate: true,
        execArgv: ['--max-old-space-size=2048'],
      },
    },

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      exclude: [
        'node_modules/**',
        'src/test/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.integration.{ts,tsx}',
      ],
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/lib/utils': path.resolve(__dirname, './src/lib/utils.ts'),
    },
  },

  define: {
    global: 'globalThis',
  },

  cache: {
    dir: path.resolve(__dirname, '.vitest/cache-fast'),
  },
})
