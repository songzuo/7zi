/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],

  // 慢速测试：限制并发以避免资源竞争
  maxThreads: 2,
  minThreads: 1,

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [path.resolve(__dirname, './src/test/setup.tsx')],
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}', 'app/**/*.{test,spec}.{js,ts,jsx,tsx}'],

    pool: 'vmForks',

    // 慢速测试需要更长的超时时间
    testTimeout: 15000,
    hookTimeout: 10000,
    fileTimeout: 90000,

    // 慢速测试允许一次重试
    retry: 1,

    isolate: true,
    maxConcurrency: 2,

    sequence: {
      shuffle: false,
      concurrent: true,
    },

    poolOptions: {
      vmForks: {
        singleFork: false,
        isolate: true,
        execArgv: ['--max-old-space-size=4096'], // 更多内存
      },
    },

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'src/test/**',
        '**/*.d.ts',
        '**/*.config.*',
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

  define: {
    global: 'globalThis',
  },

  cache: {
    dir: path.resolve(__dirname, '.vitest/cache-slow'),
  },
})
