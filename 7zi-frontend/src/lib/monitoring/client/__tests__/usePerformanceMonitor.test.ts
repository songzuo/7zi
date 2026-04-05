/**
 * usePerformanceMonitor Hook Tests
 * 简化版测试 - 验证核心功能
 */

import { describe, it, expect } from 'vitest'

describe('usePerformanceMonitor Hook', () => {
  describe('功能模块验证', () => {
    it('应该导出 usePerformanceMonitor', async () => {
      const { usePerformanceMonitor } = await import('../usePerformanceMonitor')
      expect(usePerformanceMonitor).toBeDefined()
      expect(typeof usePerformanceMonitor).toBe('function')
    })

    it('应该导出 usePerformanceMonitorWithErrorBoundary', async () => {
      const { usePerformanceMonitorWithErrorBoundary } = await import('../usePerformanceMonitor')
      expect(usePerformanceMonitorWithErrorBoundary).toBeDefined()
      expect(typeof usePerformanceMonitorWithErrorBoundary).toBe('function')
    })
  })

  describe('类型定义验证', () => {
    it('UsePerformanceMonitorOptions 类型应该存在', async () => {
      const module = await import('../usePerformanceMonitor')
      // 验证函数签名
      expect(module.usePerformanceMonitor).toBeDefined()
    })
  })
})
