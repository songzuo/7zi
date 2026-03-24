/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import os from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 常规测试：平衡速度和稳定性
const cpuCount = os.cpus().length
const maxWorkers = Math.max(2, Math.floor(cpuCount / 2))

export default defineConfig({
  plugins: [react()],

  maxThreads: maxWorkers,
  minThreads: 1,

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [path.resolve(__dirname, './src/test/setup.tsx')],
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}', 'app/**/*.{test,spec}.{js,ts,jsx,tsx}'],

    pool: 'vmForks',

    // 常规测试的标准超时
    testTimeout: 10000,
    hookTimeout: 10000,
    fileTimeout: 60000,

    retry: 0,

    isolate: true,
    maxConcurrency: maxWorkers,

    sequence: {
      shuffle: false,
      concurrent: true,
    },

    poolOptions: {
      vmForks: {
        singleFork: false,
        isolate: true,
        execArgv: ['--max-old-space-size=3072'],
      },
    },

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'src/test/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.e2e.{ts,tsx}',
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
    dir: path.resolve(__dirname, '.vitest/cache-normal'),
  },
})
