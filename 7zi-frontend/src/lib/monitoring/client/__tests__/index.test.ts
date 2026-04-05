/**
 * Client Performance Monitoring SDK Tests
 * 简化版测试 - 验证核心功能
 */

import { describe, it, expect, vi } from 'vitest'

describe('Client Performance Monitoring SDK', () => {
  describe('功能模块验证', () => {
    it('应该有 index.ts 主文件', async () => {
      const { initClientMonitoring } = await import('../index')
      expect(initClientMonitoring).toBeDefined()
    })

    it('应该有 usePerformanceMonitor Hook', async () => {
      const { usePerformanceMonitor } = await import('../usePerformanceMonitor')
      expect(usePerformanceMonitor).toBeDefined()
    })

    it('应该有类型定义文件', async () => {
      const types = await import('../types')
      expect(types).toBeDefined()
    })

    it('应该有 README 文档', async () => {
      const fs = await import('fs')
      const path = await import('path')
      const readmePath = path.join(__dirname, '../README.md')
      expect(fs.existsSync(readmePath)).toBe(true)
    })
  })

  describe('导出验证', () => {
    it('应该导出 initClientMonitoring', async () => {
      const module = await import('../index')
      expect(typeof module.initClientMonitoring).toBe('function')
    })

    it('应该导出 trackCustomEvent', async () => {
      const module = await import('../index')
      expect(typeof module.trackCustomEvent).toBe('function')
    })

    it('应该导出 trackPageLoad', async () => {
      const module = await import('../index')
      expect(typeof module.trackPageLoad).toBe('function')
    })

    it('应该导出 usePerformanceMonitor', async () => {
      const module = await import('../index')
      expect(typeof module.usePerformanceMonitor).toBe('function')
    })

    it('应该导出 getClientConfig', async () => {
      const module = await import('../index')
      expect(typeof module.getClientConfig).toBe('function')
    })

    it('应该导出 isMonitoringInitialized', async () => {
      const module = await import('../index')
      expect(typeof module.isMonitoringInitialized).toBe('function')
    })
  })
})
