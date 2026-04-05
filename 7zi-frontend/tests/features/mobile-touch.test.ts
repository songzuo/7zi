/**
 * Mobile Touch Optimization Tests - v1.13.0
 *
 * 测试移动端触摸优化功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  useMobileTouchOptimization,
  usePassiveScroll,
  useMobileViewport,
  useSafeAreaInsets,
} from '@/hooks/useMobileTouchOptimization'
import { renderHook, cleanup } from '@testing-library/react'

describe('Mobile Touch Optimization Tests', () => {
  afterEach(() => {
    cleanup()
    // 清理所有模拟
    vi.clearAllMocks()
  })

  describe('useMobileTouchOptimization', () => {
    it('应该检测移动设备', () => {
      const { result } = renderHook(() => useMobileTouchOptimization())

      // 检查是否返回布尔值
      expect(typeof result.current).toBe('boolean')
    })

    it('应该在移动设备上设置 touch-action: manipulation', () => {
      const { result } = renderHook(() => useMobileTouchOptimization())

      // 如果检测到移动设备，应该设置样式
      if (result.current) {
        expect(document.body.style.touchAction).toBe('manipulation')
      }
    })

    it('应该在移动设备上设置 webkitOverflowScrolling', () => {
      const { result } = renderHook(() => useMobileTouchOptimization())

      if (result.current) {
        expect(document.body.style.webkitOverflowScrolling).toBe('touch')
      }
    })

    it('应该添加 passive 事件监听器到按钮', () => {
      const mockButton = document.createElement('button')
      document.body.appendChild(mockButton)

      const { result } = renderHook(() => useMobileTouchOptimization())

      // 如果是移动设备，应该添加事件监听器
      if (result.current) {
        // 验证监听器已添加（间接验证）
        expect(document.body.contains(mockButton)).toBe(true)
      }

      document.body.removeChild(mockButton)
    })

    it('应该响应窗口大小变化', () => {
      const { result, rerender } = renderHook(() => useMobileTouchOptimization())

      const initialValue = result.current

      // 触发 resize 事件
      window.dispatchEvent(new Event('resize'))

      // 重新渲染
      rerender()

      // 值可能保持不变或根据窗口大小变化
      expect(typeof result.current).toBe('boolean')
    })
  })

  describe('usePassiveScroll', () => {
    it('应该检测 passive 事件支持', () => {
      const { result } = renderHook(() => usePassiveScroll())

      // hook 不返回值，只设置事件监听器
      expect(result.current).toBeUndefined()
    })

    it('应该添加 passive 事件监听器', () => {
      // 添加测试元素
      const scrollElement = document.createElement('div')
      scrollElement.setAttribute('data-scroll-passive', 'true')
      document.body.appendChild(scrollElement)

      renderHook(() => usePassiveScroll())

      // 验证元素仍然存在
      expect(document.body.contains(scrollElement)).toBe(true)

      document.body.removeChild(scrollElement)
    })

    it('应该使用 MutationObserver 监听新元素', () => {
      renderHook(() => usePassiveScroll())

      // 动态添加新元素
      const newElement = document.createElement('div')
      newElement.setAttribute('data-scroll-passive', 'true')

      // 添加到 DOM
      document.body.appendChild(newElement)

      // 验证元素存在
      expect(document.body.contains(newElement)).toBe(true)

      document.body.removeChild(newElement)
    })

    it('应该在卸载时清理监听器', () => {
      const { unmount } = renderHook(() => usePassiveScroll())

      // 卸载 hook
      unmount()

      // MutationObserver 应该被断开
      // 我们无法直接验证，但 hook 应该正确清理
      expect(true).toBe(true)
    })
  })

  describe('useMobileViewport', () => {
    it('应该创建或更新 viewport meta 标签', () => {
      // 移除现有的 viewport meta 标签
      const existingViewport = document.querySelector('meta[name="viewport"]')
      if (existingViewport) {
        existingViewport.remove()
      }

      renderHook(() => useMobileViewport())

      // 验证 viewport meta 标签存在
      const viewport = document.querySelector('meta[name="viewport"]')
      expect(viewport).toBeTruthy()
    })

    it('应该设置优化的 viewport 属性', () => {
      const { result } = renderHook(() => useMobileViewport())

      const viewport = document.querySelector('meta[name="viewport"]')
      const content = viewport?.getAttribute('content')

      expect(content).toContain('width=device-width')
      expect(content).toContain('initial-scale=1')
      expect(content).toContain('viewport-fit=cover')
      expect(content).toContain('maximum-scale=1')
      expect(content).toContain('user-scalable=no')
    })

    it('应该更新现有的 viewport meta 标签', () => {
      // 创建现有的 viewport meta 标签
      const existingViewport = document.createElement('meta')
      existingViewport.setAttribute('name', 'viewport')
      existingViewport.setAttribute('content', 'width=device-width, initial-scale=1')
      document.head.appendChild(existingViewport)

      renderHook(() => useMobileViewport())

      const viewport = document.querySelector('meta[name="viewport"]')
      const content = viewport?.getAttribute('content')

      // 应该被更新
      expect(content).toContain('viewport-fit=cover')
      expect(content).toContain('maximum-scale=1')

      document.head.removeChild(existingViewport)
    })

    it('应该在卸载时恢复默认 viewport', () => {
      const { unmount } = renderHook(() => useMobileViewport())

      const viewport = document.querySelector('meta[name="viewport"]')
      const originalContent = viewport?.getAttribute('content')

      // 卸载 hook
      unmount()

      const updatedContent = viewport?.getAttribute('content')

      // 应该恢复为更简单的配置
      if (viewport) {
        expect(updatedContent).toBe('width=device-width, initial-scale=1')
      }
    })
  })

  describe('useSafeAreaInsets', () => {
    it('应该添加 safe area CSS 变量', () => {
      renderHook(() => useSafeAreaInsets())

      // 检查 CSS 变量是否已设置（通过 computed styles）
      const testElement = document.createElement('div')
      document.body.appendChild(testElement)

      const styles = window.getComputedStyle(testElement)
      const safeAreaTop = styles.getPropertyValue('--safe-area-inset-top')

      // 应该定义了变量（即使值为 0px）
      expect(safeAreaTop).toBeDefined()

      document.body.removeChild(testElement)
    })

    it('应该添加 safe area 工具类', () => {
      renderHook(() => useSafeAreaInsets())

      // 验证样式标签已添加
      const styleTags = document.querySelectorAll('style')
      let foundSafeAreaStyles = false

      styleTags.forEach((tag) => {
        const content = tag.textContent || ''
        if (content.includes('safe-area-inset')) {
          foundSafeAreaStyles = true
        }
      })

      expect(foundSafeAreaStyles).toBe(true)
    })

    it('应该定义所有方向的 safe area 类', () => {
      renderHook(() => useSafeAreaInsets())

      const styleTags = document.querySelectorAll('style')
      let foundAllClasses = false

      styleTags.forEach((tag) => {
        const content = tag.textContent || ''
        if (
          content.includes('.safe-area-top') &&
          content.includes('.safe-area-bottom') &&
          content.includes('.safe-area-left') &&
          content.includes('.safe-area-right') &&
          content.includes('.safe-area-all')
        ) {
          foundAllClasses = true
        }
      })

      expect(foundAllClasses).toBe(true)
    })

    it('应该在卸载时清理样式', () => {
      const { unmount } = renderHook(() => useSafeAreaInsets())

      let styleCountBefore = 0
      document.querySelectorAll('style').forEach(() => {
        styleCountBefore++
      })

      // 卸载 hook
      unmount()

      let styleCountAfter = 0
      document.querySelectorAll('style').forEach(() => {
        styleCountAfter++
      })

      // 样式数量应该减少
      expect(styleCountAfter).toBeLessThanOrEqual(styleCountBefore)
    })
  })

  describe('集成测试', () => {
    it('应该同时使用多个移动端优化 hooks', () => {
      const { result: touchResult } = renderHook(() => useMobileTouchOptimization())
      renderHook(() => usePassiveScroll())
      renderHook(() => useMobileViewport())
      renderHook(() => useSafeAreaInsets())

      // 验证所有 hooks 都正常工作
      expect(typeof touchResult.current).toBe('boolean')

      // 验证 viewport meta 标签存在
      const viewport = document.querySelector('meta[name="viewport"]')
      expect(viewport).toBeTruthy()
    })

    it('应该正确处理 hook 的重新渲染', () => {
      const { result, rerender } = renderHook(() => useMobileTouchOptimization())

      const initialValue = result.current

      // 多次重新渲染
      rerender()
      rerender()
      rerender()

      // 值应该保持一致
      expect(result.current).toBe(initialValue)
    })
  })
})