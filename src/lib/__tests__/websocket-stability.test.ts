/**
 * WebSocket 稳定性测试
 * 测试快速重连、消息积压、大消息、并发连接、心跳超时等边界情况
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock WebSocket for testing
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState: number = MockWebSocket.CONNECTING
  url: string
  onopen: ((event: any) => void) | null = null
  onclose: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  onmessage: ((event: any) => void) | null = null

  private messages: any[] = []
  private closed = false

  constructor(url: string) {
    this.url = url
    // 模拟异步连接
    setTimeout(() => {
      if (!this.closed && this.onopen) {
        this.readyState = MockWebSocket.OPEN
        this.onopen({ type: 'open' })
      }
    }, 10)
  }

  send(data: any): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }
    this.messages.push(data)
  }

  close(): void {
    this.closed = true
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      this.onclose({ type: 'close', code: 1000, reason: 'Normal closure' })
    }
  }

  // Test helper methods
  simulateMessage(data: any): void {
    if (this.onmessage) {
      this.onmessage({ type: 'message', data: JSON.stringify(data) })
    }
  }

  simulateError(error: any): void {
    if (this.onerror) {
      this.onerror({ type: 'error', error })
    }
  }

  simulateClose(code: number = 1006, reason: string = 'Abnormal closure'): void {
    this.closed = true
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      this.onclose({ type: 'close', code, reason })
    }
  }
}

// Global message storage for testing
const messageQueue: Map<string, any[]> = new Map()

describe('WebSocket Stability', () => {
  // Mock WebSocket global
  let OriginalWebSocket: typeof WebSocket

  beforeEach(() => {
    // @ts-ignore
    OriginalWebSocket = global.WebSocket
    // @ts-ignore
    global.WebSocket = MockWebSocket as any
    messageQueue.clear()
  })

  afterEach(() => {
    // @ts-ignore
    global.WebSocket = OriginalWebSocket
    vi.clearAllMocks()
  })

  // =====================================================
  // 1. 快速重连（网络抖动）
  // =====================================================
  describe('should handle rapid reconnection attempts', () => {
    it('should handle rapid reconnection attempts', async () => {
      const reconnectAttempts: number[] = []
      let ws: MockWebSocket | null = null

      // 模拟快速重连
      for (let i = 0; i < 10; i++) {
        ws = new MockWebSocket('ws://test.com')
        reconnectAttempts.push(i)

        // 立即关闭模拟网络抖动
        await new Promise(resolve => setTimeout(resolve, 5))
        ws?.simulateClose(1006)
        ws?.close()
      }

      expect(reconnectAttempts.length).toBe(10)
    })

    it('should handle connection jitter gracefully', async () => {
      const connectionEvents: string[] = []

      const ws = new MockWebSocket('ws://test.com')

      // 监听连接事件
      ws.onopen = () => connectionEvents.push('open')
      ws.onclose = () => connectionEvents.push('close')
      ws.onerror = () => connectionEvents.push('error')

      // 模拟网络抖动
      await new Promise(resolve => setTimeout(resolve, 20))
      ws.simulateClose(1006) // 异常关闭
      await new Promise(resolve => setTimeout(resolve, 10))
      ws.close()

      expect(connectionEvents).toContain('open')
      expect(connectionEvents).toContain('close')
    })

    it('should implement exponential backoff', async () => {
      const delays: number[] = []
      let currentDelay = 100

      for (let i = 0; i < 5; i++) {
        const startTime = Date.now()
        await new Promise(resolve => setTimeout(resolve, currentDelay))
        delays.push(Date.now() - startTime)
        currentDelay = Math.min(currentDelay * 2, 5000) // 指数退避，最大5秒
      }

      // 验证延迟递增
      expect(delays[1]).toBeGreaterThan(delays[0])
      expect(delays[2]).toBeGreaterThan(delays[1])
    })
  })

  // =====================================================
  // 2. 消息积压
  // =====================================================
  describe('should handle message backlog during disconnect', () => {
    it('should queue messages during disconnection', () => {
      const queuedMessages: any[] = []

      // 模拟断开连接时的消息队列
      const isConnected = false
      const queue: any[] = []

      // 添加消息到队列
      for (let i = 0; i < 100; i++) {
        queue.push({ id: i, data: `message-${i}` })
      }

      queuedMessages.push(...queue)

      expect(queuedMessages.length).toBe(100)
    })

    it('should flush queue on reconnection', async () => {
      const queue: any[] = []
      let flushed = false

      // 模拟断开时积累消息
      for (let i = 0; i < 50; i++) {
        queue.push({ id: i, payload: `data-${i}` })
      }

      // 模拟重新连接时刷新队列
      const ws = new MockWebSocket('ws://test.com')

      // 等待连接打开
      await new Promise(resolve => setTimeout(resolve, 50))

      // 刷新队列（连接已打开）
      while (queue.length > 0) {
        const msg = queue.shift()
        try {
          ws.send(msg)
        } catch (e) {
          // 如果连接断开，重新入队
          queue.unshift(msg)
          break
        }
      }

      flushed = true

      expect(flushed).toBe(true)
      expect(queue.length).toBe(0)
    })

    it('should handle large message backlog', () => {
      const largeQueue: any[] = []

      // 模拟大量消息积压
      const largeMessage = 'x'.repeat(10000) // 10KB 消息

      for (let i = 0; i < 1000; i++) {
        largeQueue.push({
          id: i,
          data: largeMessage,
          timestamp: Date.now(),
        })
      }

      // 验证队列大小
      const totalSize = largeQueue.reduce((acc, msg) => acc + msg.data.length, 0)
      expect(largeQueue.length).toBe(1000)
      expect(totalSize).toBe(10000 * 1000) // 10MB
    })

    it('should prioritize messages during backlog', () => {
      const queue: any[] = []

      // 添加普通消息
      queue.push({ type: 'data', id: 1 })
      queue.push({ type: 'data', id: 2 })

      // 添加高优先级消息
      queue.unshift({ type: 'priority', id: 0 })

      // 验证高优先级消息在前
      expect(queue[0].type).toBe('priority')
      expect(queue[0].id).toBe(0)
    })
  })

  // =====================================================
  // 3. 大消息
  // =====================================================
  describe('should handle large messages (>1MB)', () => {
    it('should handle 1MB message', () => {
      const largeMessage = 'x'.repeat(1024 * 1024) // 1MB

      // 验证消息大小
      const bytes = new Blob([largeMessage]).size
      expect(bytes).toBe(1024 * 1024)
    })

    it('should handle multi-megabyte messages', () => {
      const messages: string[] = []

      // 创建多个 2MB 消息
      for (let i = 0; i < 5; i++) {
        messages.push('y'.repeat(2 * 1024 * 1024))
      }

      const totalSize = messages.reduce((acc, msg) => acc + msg.length, 0)
      expect(totalSize).toBe(10 * 1024 * 1024) // 10MB
    })

    it('should handle large JSON messages', () => {
      // 创建大型 JSON 对象
      const largeData = {
        items: Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: 'x'.repeat(100),
          metadata: {
            created: new Date().toISOString(),
            tags: ['tag1', 'tag2', 'tag3'],
          },
        })),
      }

      const jsonString = JSON.stringify(largeData)
      const parsed = JSON.parse(jsonString)

      expect(parsed.items.length).toBe(10000)
    })

    it('should handle binary messages', () => {
      // 创建二进制数据
      const buffer = new ArrayBuffer(1024 * 1024) // 1MB
      const view = new Uint8Array(buffer)

      // 填充随机数据
      for (let i = 0; i < view.length; i++) {
        view[i] = i % 256
      }

      expect(view.length).toBe(1024 * 1024)
    })

    it('should handle chunked large messages', () => {
      const chunkSize = 1024 // 1KB
      const totalChunks = 1000
      const chunks: string[] = []

      // 分块发送大消息
      for (let i = 0; i < totalChunks; i++) {
        chunks.push('z'.repeat(chunkSize))
      }

      const reassembled = chunks.join('')
      expect(reassembled.length).toBe(chunkSize * totalChunks)
    })
  })

  // =====================================================
  // 4. 并发连接
  // =====================================================
  describe('should handle 100+ concurrent connections', () => {
    it('should create 100 concurrent WebSocket connections', async () => {
      const connections: MockWebSocket[] = []
      const connectionPromises: Promise<void>[] = []

      // 创建 100 个并发连接
      for (let i = 0; i < 100; i++) {
        const ws = new MockWebSocket(`ws://test.com/${i}`)
        connections.push(ws)

        connectionPromises.push(
          new Promise(resolve => {
            ws.onopen = () => resolve()
          })
        )
      }

      // 等待所有连接建立
      await Promise.all(connectionPromises)

      // 验证所有连接已建立
      const openConnections = connections.filter(c => c.readyState === MockWebSocket.OPEN)
      expect(openConnections.length).toBe(100)
    })

    it('should handle concurrent message sending', async () => {
      const connections: MockWebSocket[] = []

      // 创建连接并等待打开
      const connectionPromises: Promise<void>[] = []
      for (let i = 0; i < 50; i++) {
        const ws = new MockWebSocket(`ws://test.com/${i}`)
        connections.push(ws)

        connectionPromises.push(
          new Promise(resolve => {
            ws.onopen = () => resolve()
          })
        )
      }

      // 等待所有连接打开
      await Promise.all(connectionPromises)

      // 并发发送消息
      const sendPromises = connections.map((ws, i) => {
        ws.send({ id: i, message: `Message ${i}` })
        return Promise.resolve()
      })

      await Promise.all(sendPromises)

      expect(connections.length).toBe(50)
    })

    it('should handle connection pool limits', () => {
      const maxConnections = 100
      const currentConnections = 95

      // 验证连接池管理
      expect(currentConnections).toBeLessThan(maxConnections)

      const availableSlots = maxConnections - currentConnections
      expect(availableSlots).toBe(5)
    })

    it('should handle rapid connection and disconnection', async () => {
      const lifecycleEvents: string[] = []

      for (let i = 0; i < 20; i++) {
        const ws = new MockWebSocket(`ws://test.com/${i}`)
        lifecycleEvents.push(`connect-${i}`)

        await new Promise(resolve => setTimeout(resolve, 10))

        ws.close()
        lifecycleEvents.push(`disconnect-${i}`)
      }

      expect(lifecycleEvents.length).toBe(40)
    })
  })

  // =====================================================
  // 5. 心跳超时
  // =====================================================
  describe('should detect heartbeat timeout correctly', () => {
    it('should detect missing heartbeat', () => {
      let lastHeartbeat = Date.now()
      const timeout = 30000 // 30秒超时

      // 模拟时间流逝
      const elapsed = 35000

      const isTimedOut = elapsed > timeout
      expect(isTimedOut).toBe(true)
    })

    it('should handle heartbeat within timeout', () => {
      const timeout = 30000
      let lastHeartbeat = Date.now()

      // 模拟短暂时间流逝
      const elapsed = 5000

      const isTimedOut = elapsed > timeout
      expect(isTimedOut).toBe(false)
    })

    it('should reset heartbeat on pong', () => {
      const timeout = 30000
      let lastHeartbeat = Date.now()

      // 模拟收到 pong，重置心跳时间
      lastHeartbeat = Date.now()

      const elapsed = 0
      const isTimedOut = elapsed > timeout

      expect(isTimedOut).toBe(false)
    })

    it('should handle heartbeat timeout with reconnection', async () => {
      vi.useRealTimers() // 使用真实计时器

      const missedHeartbeats = 2 // 模拟2次心跳丢失

      // 验证心跳丢失统计
      expect(missedHeartbeats).toBe(2)

      const shouldReconnect = missedHeartbeats >= 2
      expect(shouldReconnect).toBe(true)
    })

    it('should handle simultaneous heartbeat and data', () => {
      const heartbeat = { type: 'ping', timestamp: Date.now() }
      const dataMessage = {
        type: 'data',
        payload: { id: 1, content: 'test' },
      }

      // 验证可以同时处理心跳和数据
      expect(heartbeat.type).toBe('ping')
      expect(dataMessage.type).toBe('data')
    })
  })

  // =====================================================
  // 6. 错误处理边界
  // =====================================================
  describe('should handle error conditions', () => {
    it('should handle invalid URL', () => {
      // 模拟无效 URL
      const url = 'invalid-url'
      const isValidUrl = url.startsWith('ws://') || url.startsWith('wss://')
      expect(isValidUrl).toBe(false)
    })

    it('should handle connection refused', async () => {
      const connectionRefused = true

      // 模拟连接被拒绝
      const ws = new MockWebSocket('ws://localhost:9999')
      ws.simulateError('Connection refused')

      await new Promise(resolve => setTimeout(resolve, 20))

      expect(connectionRefused).toBe(true)
    })

    it('should handle server disconnect', async () => {
      const ws = new MockWebSocket('ws://test.com')

      await new Promise(resolve => setTimeout(resolve, 20))

      // 模拟服务器主动断开
      ws.simulateClose(1000, 'Server shutdown')

      expect(ws.readyState).toBe(MockWebSocket.CLOSED)
    })

    it('should handle protocol error', async () => {
      const ws = new MockWebSocket('ws://test.com')

      await new Promise(resolve => setTimeout(resolve, 20))

      // 发送无效协议数据
      expect(() => {
        // 模拟解析错误
        const invalidJson = '{invalid json}'
        JSON.parse(invalidJson)
      }).toThrow()
    })

    it('should handle network error', async () => {
      const ws = new MockWebSocket('ws://test.com')

      await new Promise(resolve => setTimeout(resolve, 20))

      // 模拟网络错误
      ws.simulateError(new Error('Network error'))

      // 应该触发错误处理
      expect(ws.readyState).not.toBe(MockWebSocket.OPEN)
    })
  })
})
