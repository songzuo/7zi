/**
 * App Store 测试
 *
 * 测试目标:
 * - UI 状态管理
 * - 设置持久化
 * - 设置更新
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useAppStore } from '../app-store'

describe('useAppStore', () => {
  beforeEach(() => {
    // 清除 localStorage
    localStorage.clear()
    // 重置 Store 状态
    useAppStore.getState().resetSettings()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('初始状态', () => {
    it('应该有正确的默认设置', () => {
      const { result } = renderHook(() => useAppStore())

      expect(result.current.settings.sidebarOpen).toBe(true)
      expect(result.current.settings.darkMode).toBe(false)
      expect(result.current.settings.language).toBe('en')
      expect(result.current.settings.pageSize).toBe(20)
      expect(result.current.isGlobalLoading).toBe(false)
    })
  })

  describe('侧边栏控制', () => {
    it('应该能切换侧边栏状态', () => {
      const { result } = renderHook(() => useAppStore())

      expect(result.current.settings.sidebarOpen).toBe(true)

      act(() => {
        result.current.toggleSidebar()
      })

      expect(result.current.settings.sidebarOpen).toBe(false)

      act(() => {
        result.current.toggleSidebar()
      })

      expect(result.current.settings.sidebarOpen).toBe(true)
    })

    it('应该能设置侧边栏状态', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setSidebarOpen(false)
      })

      expect(result.current.settings.sidebarOpen).toBe(false)

      act(() => {
        result.current.setSidebarOpen(true)
      })

      expect(result.current.settings.sidebarOpen).toBe(true)
    })
  })

  describe('暗色模式', () => {
    it('应该能切换暗色模式', () => {
      const { result } = renderHook(() => useAppStore())

      expect(result.current.settings.darkMode).toBe(false)

      act(() => {
        result.current.toggleDarkMode()
      })

      expect(result.current.settings.darkMode).toBe(true)

      act(() => {
        result.current.toggleDarkMode()
      })

      expect(result.current.settings.darkMode).toBe(false)
    })

    it('应该能设置暗色模式', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setDarkMode(true)
      })

      expect(result.current.settings.darkMode).toBe(true)
    })
  })

  describe('语言设置', () => {
    it('应该能设置语言', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setLanguage('zh')
      })

      expect(result.current.settings.language).toBe('zh')
    })
  })

  describe('分页设置', () => {
    it('应该能设置页面大小', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setPageSize(50)
      })

      expect(result.current.settings.pageSize).toBe(50)
    })
  })

  describe('自动刷新设置', () => {
    it('应该能设置自动刷新', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setAutoRefresh(true)
      })

      expect(result.current.settings.autoRefresh).toBe(true)
    })

    it('应该能设置刷新间隔', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setRefreshInterval(60000)
      })

      expect(result.current.settings.refreshInterval).toBe(60000)
    })
  })

  describe('批量更新设置', () => {
    it('应该能更新多个设置', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.updateSettings({
          darkMode: true,
          language: 'zh',
          pageSize: 50,
        })
      })

      expect(result.current.settings.darkMode).toBe(true)
      expect(result.current.settings.language).toBe('zh')
      expect(result.current.settings.pageSize).toBe(50)
    })
  })

  describe('重置设置', () => {
    it('应该能重置到默认设置', () => {
      const { result } = renderHook(() => useAppStore())

      // 修改一些设置
      act(() => {
        result.current.updateSettings({
          darkMode: true,
          language: 'zh',
          sidebarOpen: false,
        })
      })

      expect(result.current.settings.darkMode).toBe(true)

      // 重置
      act(() => {
        result.current.resetSettings()
      })

      expect(result.current.settings.darkMode).toBe(false)
      expect(result.current.settings.language).toBe('en')
      expect(result.current.settings.sidebarOpen).toBe(true)
    })
  })

  describe('全局加载状态', () => {
    it('应该能设置全局加载状态', () => {
      const { result } = renderHook(() => useAppStore())

      expect(result.current.isGlobalLoading).toBe(false)

      act(() => {
        result.current.setGlobalLoading(true, '加载中...')
      })

      expect(result.current.isGlobalLoading).toBe(true)
      expect(result.current.globalLoadingMessage).toBe('加载中...')

      act(() => {
        result.current.setGlobalLoading(false)
      })

      expect(result.current.isGlobalLoading).toBe(false)
      expect(result.current.globalLoadingMessage).toBeNull()
    })
  })

  describe('持久化功能', () => {
    it('应该将设置持久化到 localStorage', async () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setDarkMode(true)
        result.current.setLanguage('zh')
      })

      // 等待 persist 中间件完成
      await waitFor(() => {
        const stored = localStorage.getItem('7zi-app-settings')
        expect(stored).toBeTruthy()
      })

      const stored = localStorage.getItem('7zi-app-settings')
      const parsed = JSON.parse(stored!)

      expect(parsed.state.settings.darkMode).toBe(true)
      expect(parsed.state.settings.language).toBe('zh')
    })

    it('应该从 localStorage 恢复设置', async () => {
      // 预设 localStorage
      localStorage.setItem(
        '7zi-app-settings',
        JSON.stringify({
          state: {
            settings: {
              sidebarOpen: false,
              darkMode: true,
              language: 'zh',
            },
          },
          version: 0,
        })
      )

      // 创建新的 Store 实例
      const { result } = renderHook(() => useAppStore())

      // 等待恢复完成
      await waitFor(() => {
        expect(result.current.settings.darkMode).toBe(true)
      })

      expect(result.current.settings.sidebarOpen).toBe(false)
      expect(result.current.settings.language).toBe('zh')
    })
  })

  describe('选择器', () => {
    it('选择器应该返回正确的状态切片', () => {
      const { result } = renderHook(() => useAppStore())

      const settings = result.current.settings
      const darkMode = result.current.settings.darkMode
      const language = result.current.settings.language

      expect(settings).toBeDefined()
      expect(darkMode).toBe(false)
      expect(language).toBe('en')
    })
  })
})
