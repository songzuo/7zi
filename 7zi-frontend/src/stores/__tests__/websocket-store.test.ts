/**
 * WebSocket Store 测试
 *
 * 测试目标:
 * - 连接状态管理
 * - 消息发送/接收
 * - 统计功能
 * - 重连机制
 */

import { renderHook, act } from '@testing-library/react'
import { useWebSocketStore } from '../websocket-store'

// Mock Socket.IO
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  })),
}))

describe('useWebSocketStore', () => {
  beforeEach(() => {
    // 重置 Store 状态
    useWebSocketStore.getState()._reset()
  })

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const { result } = renderHook(() => useWebSocketStore())

      expect(result.current.status).toBe('disconnected')
      expect(result.current.url).toBeNull()
      expect(result.current.messages).toEqual([])
      expect(result.current.latency).toBe(0)
      expect(result.current.stats.messagesReceived).toBe(0)
      expect(result.current.stats.messagesSent).toBe(0)
    })
  })

  describe('消息管理', () => {
    it('应该能添加消息到队列', () => {
      const { result } = renderHook(() => useWebSocketStore())

      act(() => {
        result.current._addMessage({
          id: '1',
          type: 'chat',
          payload: { text: 'Hello' },
          timestamp: Date.now(),
          direction: 'incoming',
        })
      })

      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0].type).toBe('chat')
    })

    it('应该限制最大消息数量', () => {
      const { result } = renderHook(() => useWebSocketStore())

      act(() => {
        for (let i = 0; i < 150; i++) {
          result.current._addMessage({
            id: `${i}`,
            type: 'chat',
            payload: { text: `Message ${i}` },
            timestamp: Date.now(),
            direction: 'incoming',
          })
        }
      })

      expect(result.current.messages.length).toBeLessThanOrEqual(100)
    })

    it('应该能清除所有消息', () => {
      const { result } = renderHook(() => useWebSocketStore())

      act(() => {
        result.current._addMessage({
          id: '1',
          type: 'chat',
          payload: {},
          timestamp: Date.now(),
          direction: 'incoming',
        })
        result.current._addMessage({
          id: '2',
          type: 'chat',
          payload: {},
          timestamp: Date.now(),
          direction: 'incoming',
        })
      })

      expect(result.current.messages).toHaveLength(2)

      act(() => {
        result.current.clearMessages()
      })

      expect(result.current.messages).toHaveLength(0)
    })
  })

  describe('统计功能', () => {
    it('应该能更新统计数据', () => {
      const { result } = renderHook(() => useWebSocketStore())

      act(() => {
        result.current._updateStats({
          messagesReceived: 10,
          messagesSent: 5,
        })
      })

      expect(result.current.stats.messagesReceived).toBe(10)
      expect(result.current.stats.messagesSent).toBe(5)
    })

    it('应该保留未更新的统计字段', () => {
      const { result } = renderHook(() => useWebSocketStore())

      act(() => {
        result.current._updateStats({ messagesReceived: 10 })
      })

      act(() => {
        result.current._updateStats({ messagesSent: 5 })
      })

      expect(result.current.stats.messagesReceived).toBe(10)
      expect(result.current.stats.messagesSent).toBe(5)
    })
  })

  describe('状态管理', () => {
    it('应该能设置连接状态', () => {
      const { result } = renderHook(() => useWebSocketStore())

      act(() => {
        result.current._setStatus('connecting')
      })

      expect(result.current.status).toBe('connecting')

      act(() => {
        result.current._setStatus('connected')
      })

      expect(result.current.status).toBe('connected')
    })
  })

  describe('发送消息', () => {
    it('未连接时发送消息应该警告', () => {
      const { result } = renderHook(() => useWebSocketStore())

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      act(() => {
        result.current.sendMessage('chat', { text: 'Hello' })
      })

      expect(consoleSpy).toHaveBeenCalledWith('[WebSocket] Cannot send message: not connected')

      consoleSpy.mockRestore()
    })
  })

  describe('选择器', () => {
    it('选择器应该返回正确的状态切片', () => {
      const { result } = renderHook(() => useWebSocketStore())

      const status = result.current.status
      const messages = result.current.messages
      const stats = result.current.stats

      expect(status).toBe('disconnected')
      expect(messages).toEqual([])
      expect(stats.messagesReceived).toBe(0)
    })
  })
})
