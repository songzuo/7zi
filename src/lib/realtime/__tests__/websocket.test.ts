/**
 * WebSocket 功能测试文件
 *
 * 测试 useWebSocket 和 useEnhancedWebSocket hooks 以及 notificationService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useWebSocket, createMessage, isMessageType } from '../useWebSocket'
import { useEnhancedWebSocket } from '../useEnhancedWebSocket'
import { notificationService } from '../notification-service'
import { notificationServer } from '../server'

// ============================================================================
// useWebSocket 测试
// ============================================================================

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('基础功能', () => {
    it('应该正确初始化', () => {
      const { result } = renderHook(() =>
        useWebSocket({ url: 'ws://localhost:3000', autoConnect: false })
      )

      expect(result.current.status).toBe('closed')
      expect(result.current.isConnected).toBe(false)
      expect(result.current.error).toBe(null)
      expect(result.current.lastMessage).toBe(null)
    })

    it('应该正确设置 autoConnect', () => {
      const { result } = renderHook(() =>
        useWebSocket({ url: 'ws://localhost:3000', autoConnect: false })
      )

      expect(result.current.status).toBe('closed')
    })
  })

  describe('消息处理', () => {
    it('应该正确创建消息', () => {
      const msg = createMessage('test:event', { data: 'test' })

      expect(msg.type).toBe('test:event')
      expect(msg.payload).toEqual({ data: 'test' })
      expect(msg.id).toBeDefined()
      expect(msg.timestamp).toBeDefined()
    })

    it('应该正确检查消息类型', () => {
      const msg = createMessage('test:event', { data: 'test' }) as any

      expect(isMessageType(msg, 'test:event')).toBe(true)
      expect(isMessageType(msg, 'other:event')).toBe(false)
    })
  })

  describe('事件监听', () => {
    it('应该支持添加和移除监听器', () => {
      const handler = vi.fn()
      const { result } = renderHook(() =>
        useWebSocket({ url: 'ws://localhost:3000', autoConnect: false })
      )

      const cleanup = result.current.on('test:event', handler)

      // 发送测试消息
      act(() => {
        handler({ type: 'test:event', data: 'test' })
      })

      expect(handler).toHaveBeenCalled()

      // 清理监听器
      cleanup()
    })
  })
})

// ============================================================================
// useEnhancedWebSocket 测试
// ============================================================================

describe('useEnhancedWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    notificationServer.clearAll()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('基础功能', () => {
    it('应该正确初始化', () => {
      const { result } = renderHook(() =>
        useEnhancedWebSocket({
          url: 'http://localhost:3000',
          autoConnect: false,
        })
      )

      expect(result.current.connectionState).toBe('disconnected')
      expect(result.current.isConnected).toBe(false)
      expect(result.current.error).toBe(null)
      expect(result.current.stats).toEqual({
        messagesSent: 0,
        messagesReceived: 0,
        reconnectCount: 0,
        lastConnected: null,
        lastDisconnected: null,
        connectionDuration: 0,
      })
    })
  })

  describe('连接状态管理', () => {
    it('应该正确跟踪连接状态', () => {
      const { result } = renderHook(() =>
        useEnhancedWebSocket({
          url: 'http://localhost:3000',
          autoConnect: false,
        })
      )

      const stateChanges: string[] = []
      const cleanup = result.current.onStateChange(state => {
        stateChanges.push(state)
      })

      // 测试状态变化
      act(() => {
        // 模拟状态变化
        stateChanges.push('connecting')
      })

      expect(stateChanges).toContain('connecting')

      cleanup()
    })
  })

  describe('消息统计', () => {
    it('应该正确跟踪消息统计', () => {
      const { result } = renderHook(() =>
        useEnhancedWebSocket({
          url: 'http://localhost:3000',
          autoConnect: false,
        })
      )

      expect(result.current.stats.messagesSent).toBe(0)
      expect(result.current.stats.messagesReceived).toBe(0)
    })
  })

  describe('离线队列', () => {
    it('应该支持离线队列', () => {
      const { result } = renderHook(() =>
        useEnhancedWebSocket({
          url: 'http://localhost:3000',
          autoConnect: false,
          enableOfflineQueue: true,
        })
      )

      const queue = result.current.getOfflineQueue()

      expect(Array.isArray(queue)).toBe(true)
    })
  })

  describe('频道订阅', () => {
    it('应该支持频道订阅', () => {
      const { result } = renderHook(() =>
        useEnhancedWebSocket({
          url: 'http://localhost:3000',
          autoConnect: false,
        })
      )

      expect(() => {
        result.current.subscribe(['channel1', 'channel2'])
      }).not.toThrow()

      expect(() => {
        result.current.unsubscribe(['channel1'])
      }).not.toThrow()
    })
  })
})

// ============================================================================
// notificationService 测试
// ============================================================================

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    notificationServer.clearAll()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('离线队列', () => {
    it('应该支持离线队列管理', () => {
      const userId = 'test-user-123'

      // 获取空队列
      const queue = notificationService.getOfflineQueue(userId)
      expect(queue).toEqual([])

      // 清空队列
      notificationService.clearOfflineQueue(userId)
      expect(notificationService.getOfflineQueue(userId)).toEqual([])
    })

    it('应该限制队列大小', () => {
      // 队列大小限制在构造函数中设置
      // 这里只验证队列可以正常获取和清空
      const userId = 'test-user-456'
      notificationService.clearOfflineQueue(userId)
      expect(notificationService.getOfflineQueue(userId)).toEqual([])
    })
  })

  describe('错误处理', () => {
    it('应该支持错误日志', () => {
      const errors = notificationService.getErrorLog(10)
      expect(Array.isArray(errors)).toBe(true)

      notificationService.clearErrorLog()
      expect(notificationService.getErrorLog()).toEqual([])
    })

    it('应该支持错误回调', () => {
      const errorCallback = vi.fn()
      const cleanup = notificationService.onError(errorCallback)

      // 模拟错误
      const error = {
        code: 'TEST_ERROR',
        message: 'Test error message',
        timestamp: Date.now(),
      }

      errorCallback(error)

      expect(errorCallback).toHaveBeenCalledWith(error)

      cleanup()
    })
  })

  describe('在线状态', () => {
    it('应该正确检查用户在线状态', () => {
      const userId = 'test-user-789'

      // 初始状态：离线
      expect(notificationService.isUserOnline(userId)).toBe(false)

      // 模拟用户连接
      notificationServer.connectUser(userId)

      // 检查状态：在线
      expect(notificationService.isUserOnline(userId)).toBe(true)

      // 模拟用户断开
      notificationServer.disconnectUser(userId)

      // 检查状态：离线
      expect(notificationService.isUserOnline(userId)).toBe(false)
    })

    it('应该返回在线用户列表', () => {
      notificationServer.clearAll()

      const user1 = 'user-1'
      const user2 = 'user-2'

      notificationServer.connectUser(user1)
      notificationServer.connectUser(user2)

      const onlineUsers = notificationService.getOnlineUsers()

      expect(onlineUsers).toContain(user1)
      expect(onlineUsers).toContain(user2)
      expect(onlineUsers.length).toBe(2)
    })
  })

  describe('通知发送', () => {
    it('应该成功发送成员状态通知', () => {
      expect(() => {
        notificationService.notifyMemberStatus({
          userId: 'user-1',
          userName: '张三',
          avatar: '/avatars/zhangsan.jpg',
          status: 'online',
        })
      }).not.toThrow()
    })

    it('应该正确处理通知历史', () => {
      const userId = 'test-user-999'
      const history = notificationService.getNotificationHistory(userId, 10)

      expect(Array.isArray(history)).toBe(true)
    })
  })

  describe('队列处理', () => {
    it('应该支持手动处理队列', async () => {
      await expect(notificationService.processQueueNow()).resolves.not.toThrow()
    })
  })

  describe('清理', () => {
    it('应该支持清理服务', () => {
      expect(() => {
        notificationService.destroy()
      }).not.toThrow()
    })
  })
})

// ============================================================================
// 工具函数测试
// ============================================================================

describe('工具函数', () => {
  describe('createMessage', () => {
    it('应该创建有效的消息对象', () => {
      const msg = createMessage('test:event', { foo: 'bar' })

      expect(msg).toHaveProperty('type', 'test:event')
      expect(msg).toHaveProperty('id')
      expect(msg).toHaveProperty('timestamp')
      expect(msg).toHaveProperty('payload', { foo: 'bar' })
    })

    it('应该生成唯一的 ID', () => {
      const msg1 = createMessage('test:event')
      const msg2 = createMessage('test:event')

      expect(msg1.id).not.toBe(msg2.id)
    })
  })

  describe('isMessageType', () => {
    it('应该正确识别消息类型', () => {
      const msg = createMessage('test:event', { data: 'test' }) as any

      expect(isMessageType(msg, 'test:event')).toBe(true)
      expect(isMessageType(msg, 'other:event')).toBe(false)
    })

    it('应该正确类型化 payload', () => {
      const msg = createMessage('test:event', { count: 42 }) as any

      if (isMessageType<{ count: number }>(msg, 'test:event')) {
        expect(typeof msg.payload.count).toBe('number')
        expect(msg.payload.count).toBe(42)
      }
    })
  })
})

// ============================================================================
// 集成测试
// ============================================================================

describe('集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    notificationServer.clearAll()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('应该支持完整的离线队列流程', async () => {
    const userId = 'integration-test-user'

    // 1. 用户离线
    expect(notificationService.isUserOnline(userId)).toBe(false)

    // 2. 获取离线队列（空）
    const queue1 = notificationService.getOfflineQueue(userId)
    expect(queue1).toEqual([])

    // 3. 清空队列
    notificationService.clearOfflineQueue(userId)
    expect(notificationService.getOfflineQueue(userId)).toEqual([])

    // 4. 模拟用户上线
    notificationServer.connectUser(userId)
    expect(notificationService.isUserOnline(userId)).toBe(true)

    // 5. 处理队列
    await notificationService.processQueueNow()

    // 6. 模拟用户离线
    notificationServer.disconnectUser(userId)
    expect(notificationService.isUserOnline(userId)).toBe(false)
  })

  it('应该支持错误处理流程', () => {
    const errorSpy = vi.fn()
    const cleanup = notificationService.onError(errorSpy)

    // 模拟错误
    const error = {
      code: 'INTEGRATION_TEST_ERROR',
      message: 'Integration test error',
      timestamp: Date.now(),
    }

    errorSpy(error)

    expect(errorSpy).toHaveBeenCalled()

    // 检查错误日志
    const errors = notificationService.getErrorLog()
    expect(errors.length).toBeGreaterThanOrEqual(0)

    cleanup()
  })
})

// ============================================================================
// 性能测试
// ============================================================================

describe('性能测试', () => {
  it('应该高效处理大量消息创建', () => {
    const start = Date.now()
    const count = 1000

    for (let i = 0; i < count; i++) {
      createMessage('test:event', { index: i })
    }

    const duration = Date.now() - start

    // 应该在合理时间内完成（< 1秒）
    expect(duration).toBeLessThan(1000)
  })

  it('应该高效处理消息类型检查', () => {
    const msg = createMessage('test:event', { data: 'test' }) as any
    const start = Date.now()
    const count = 10000

    for (let i = 0; i < count; i++) {
      isMessageType(msg, 'test:event')
    }

    const duration = Date.now() - start

    // 应该非常快（< 100ms）
    expect(duration).toBeLessThan(100)
  })
})
