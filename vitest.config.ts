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

    // No retry in dev, 1 retry in CI
    retry: process.env.CI ? 1 : 0,

    // File timeout (per test file)
    fileTimeout: 120000,  // 2 minutes per file

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
