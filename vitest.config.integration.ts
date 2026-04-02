/**
 * @fileoverview Vitest configuration for API integration tests
 */

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/app/api/__tests__/**/*.integration.test.ts'],
    exclude: ['node_modules', 'dist', '.next', '*.config.*', 'src/test/**'],
    setupFiles: ['./src/app/api/__tests__/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    pool: 'forks',
    maxThreads: 1,
    minThreads: 1,
    isolate: true,
    maxConcurrency: 1,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
  },
})
