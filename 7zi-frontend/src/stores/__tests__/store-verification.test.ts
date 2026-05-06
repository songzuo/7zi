/**
 * Store 功能验证脚本
 *
 * 此脚本用于验证 Zustand Stores 的基本功能
 * 在 Node.js 环境运行（不带持久化）
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// 设置测试环境
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' })
global.window = dom.window as any
global.document = dom.window.document

// 模拟 localStorage
const localStorageMock = {
  store: new Map<string, string>(),

  getItem(key: string): string | null {
    return this.store.get(key) || null
  },

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  },

  removeItem(key: string): void {
    this.store.delete(key)
  },

  clear(): void {
    this.store.clear()
  },
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// 模拟 fetch
global.fetch = () => Promise.resolve() as any

// 模拟 crypto
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(2, 11),
  },
})

// 导入 Stores
import { useAuthStore } from '../auth-store'
import { useNotificationStore } from '../notification-store'
import { useAppStore } from '../app-store'
import { useWebSocketStore } from '../websocket-store'

describe('Store 功能验证', () => {
  describe('Auth Store', () => {
    beforeEach(() => {
      useAuthStore.getState().reset()
      localStorageMock.clear()
    })

    it('应该能使用 Token 登录', () => {
      const user = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
      }

      useAuthStore.getState().loginWithToken('test-token', user)

      const state = useAuthStore.getState()
      expect(state.user).toEqual(user)
      expect(state.token).toBe('test-token')
      expect(state.isAuthenticated).toBe(true)
    })

    it('应该能登出', () => {
      const user = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
      }

      useAuthStore.getState().loginWithToken('test-token', user)
      expect(useAuthStore.getState().isAuthenticated).toBe(true)

      useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })

    it('应该能更新用户资料', () => {
      const user = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
      }

      useAuthStore.getState().loginWithToken('test-token', user)
      useAuthStore.getState().updateProfile({ name: 'Updated Name' })

      expect(useAuthStore.getState().user?.name).toBe('Updated Name')
    })
  })

  describe('Notification Store', () => {
    beforeEach(() => {
      useNotificationStore.getState().clearAll()
    })

    it('应该能添加通知', () => {
      const id = useNotificationStore.getState().success('成功', '成功消息')

      const state = useNotificationStore.getState()
      expect(state.notifications).toHaveLength(1)
      expect(state.notifications[0].id).toBe(id)
      expect(state.notifications[0].type).toBe('success')
      expect(state.unreadCount).toBe(1)
    })

    it('应该能删除通知', () => {
      const id = useNotificationStore.getState().success('成功', '成功消息')
      expect(useNotificationStore.getState().notifications).toHaveLength(1)

      useNotificationStore.getState().removeNotification(id)

      expect(useNotificationStore.getState().notifications).toHaveLength(0)
    })

    it('应该能标记已读', () => {
      const id = useNotificationStore.getState().success('成功', '成功消息')
      expect(useNotificationStore.getState().unreadCount).toBe(1)

      useNotificationStore.getState().markAsRead(id)

      const state = useNotificationStore.getState()
      expect(state.notifications[0].read).toBe(true)
      expect(state.unreadCount).toBe(0)
    })
  })

  describe('App Store', () => {
    beforeEach(() => {
      useAppStore.getState().resetSettings()
      localStorageMock.clear()
    })

    it('应该能切换侧边栏', () => {
      expect(useAppStore.getState().settings.sidebarOpen).toBe(true)

      useAppStore.getState().toggleSidebar()

      expect(useAppStore.getState().settings.sidebarOpen).toBe(false)

      useAppStore.getState().toggleSidebar()

      expect(useAppStore.getState().settings.sidebarOpen).toBe(true)
    })

    it('应该能切换暗色模式', () => {
      expect(useAppStore.getState().settings.darkMode).toBe(false)

      useAppStore.getState().toggleDarkMode()

      expect(useAppStore.getState().settings.darkMode).toBe(true)
    })

    it('应该能设置语言', () => {
      expect(useAppStore.getState().settings.language).toBe('en')

      useAppStore.getState().setLanguage('zh')

      expect(useAppStore.getState().settings.language).toBe('zh')
    })

    it('应该能更新多个设置', () => {
      useAppStore.getState().updateSettings({
        darkMode: true,
        language: 'zh',
        pageSize: 50,
      })

      const settings = useAppStore.getState().settings
      expect(settings.darkMode).toBe(true)
      expect(settings.language).toBe('zh')
      expect(settings.pageSize).toBe(50)
    })

    it('应该能重置设置', () => {
      useAppStore.getState().updateSettings({
        darkMode: true,
        language: 'zh',
      })

      expect(useAppStore.getState().settings.darkMode).toBe(true)

      useAppStore.getState().resetSettings()

      const settings = useAppStore.getState().settings
      expect(settings.darkMode).toBe(false)
      expect(settings.language).toBe('en')
    })
  })

  describe('WebSocket Store', () => {
    beforeEach(() => {
      useWebSocketStore.getState().clearMessages()
    })

    it('应该能设置连接状态', () => {
      expect(useWebSocketStore.getState().status).toBe('disconnected')

      useWebSocketStore.getState()._setStatus('connecting')

      expect(useWebSocketStore.getState().status).toBe('connecting')
    })

    it('应该能添加消息', () => {
      useWebSocketStore.getState()._addMessage({
        id: '1',
        type: 'chat',
        payload: { text: 'Hello' },
        timestamp: Date.now(),
        direction: 'incoming',
      })

      expect(useWebSocketStore.getState().messages).toHaveLength(1)
    })

    it('应该能更新统计', () => {
      useWebSocketStore.getState()._updateStats({
        messagesReceived: 10,
        messagesSent: 5,
      })

      const stats = useWebSocketStore.getState().stats
      expect(stats.messagesReceived).toBe(10)
      expect(stats.messagesSent).toBe(5)
    })
  })
})
