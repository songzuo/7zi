/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],
  
  // Vitest 4: 线程池配置在顶层（不在 test 对象内）
  poolOptions: {
    vmForks: {
      singleFork: false, // 允许并行执行
    },
  },
  
  // Vitest 4: 限制并发工作线程数量（maxThreads 现在是顶层选项）
  maxThreads: 3,
  minThreads: 1,
  
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.tsx'],
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}', 'app/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    
    // Vitest 4: 性能优化：使用 vmForks 线程池减少内存占用
    pool: 'vmForks',
    
    // 测试超时配置
    testTimeout: 10000,
    hookTimeout: 10000,
    // 失败时重试
    retry: 1,
    
    // 文件级别的超时配置
    fileTimeout: 30000,
    
    // 性能优化：测试隔离模式（in-process 更快但可能不安全，vmThreads 更安全）
    isolate: true,
    
    // 并发限制：限制同时运行的测试文件数量
    maxConcurrency: 2,
    
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
    },
  },
  // Fix module resolution for tests
  define: {
    global: 'globalThis',
  },
})
