import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['*.integration.test.ts'],
    setupFiles: ['./setup.ts'],
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
      '@': path.resolve(__dirname, '../../src'),
    },
  },
});
