/**
 * WebSocket Client - Edge Case Tests (T1)
 *
 * 覆盖 src/lib/websocket/core.ts 的边界行为：
 *  1. 重连 (reconnection)      —— 状态机迁移、重连历史、最大重试次数、网络恢复
 *  2. 消息去重 (dedup)         —— 同一监听器重复注册只回调一次、离线队列过期清理
 *  3. 超时 (timeout)           —— 心跳超时断连、pong 重置丢失计数
 *  4. 错误事件 (error events)  —— connect_error / error 事件处理
 *  5. 鉴权失败 (auth failure)  —— auth 参数透传、鉴权被拒后的错误态
 *
 * @version 1.12.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import { ConnectionState } from '../types'

// ---------------------------------------------------------------------------
// Mock socket.io-client
// 每次 io() 返回一个全新的 socket 实例，这样可以精确控制「哪一次连接」上的事件。
// ---------------------------------------------------------------------------
const { sockets, mockIo } = vi.hoisted(() => {
  type Handler = (...args: any[]) => void

  const created: any[] = []

  const createSocket = () => {
    const handlers = new Map<string, Handler[]>()
    const anyHandlers: Handler[] = []

    const socket: any = {
      connected: false,
      disconnected: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
      emit: vi.fn(() => true),
      off: vi.fn(),
      removeAllListeners: vi.fn(),
      on: vi.fn((event: string, handler: Handler) => {
        const list = handlers.get(event) ?? []
        list.push(handler)
        handlers.set(event, list)
        return socket
      }),
      onAny: vi.fn((handler: Handler) => {
        anyHandlers.push(handler)
        return socket
      }),
      // 测试辅助方法
      __fire: (event: string, ...args: unknown[]) => {
        ;(handlers.get(event) ?? []).forEach(h => h(...args))
      },
      __fireAny: (event: string, ...args: unknown[]) => {
        anyHandlers.forEach(h => h(event, ...args))
      },
    }

    return socket
  }

  const ioMock = vi.fn((..._args: unknown[]) => {
    const socket = createSocket()
    created.push(socket)
    return socket
  })

  return { sockets: created, mockIo: ioMock }
})

vi.mock('socket.io-client', () => ({
  io: mockIo,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/monitoring', () => ({
  monitor: {
    trackCustomMetric: vi.fn(),
    trackError: vi.fn(),
  },
}))

type MockSocket = {
  connected: boolean
  disconnected: boolean
  connect: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
  emit: ReturnType<typeof vi.fn>
  on: ReturnType<typeof vi.fn>
  onAny: ReturnType<typeof vi.fn>
  off: ReturnType<typeof vi.fn>
  removeAllListeners: ReturnType<typeof vi.fn>
  __fire: (event: string, ...args: unknown[]) => void
  __fireAny: (event: string, ...args: unknown[]) => void
}

const lastSocket = (): MockSocket => sockets[sockets.length - 1] as MockSocket

describe('WebSocketClient - 边界用例 (edge cases)', () => {
  let WebSocketClient: any
  let clients: any[] = []
  let windowListeners: Record<string, Array<(...args: any[]) => void>>

  const fireWindowEvent = (event: string) => {
    ;(windowListeners[event] ?? []).forEach(h => h())
  }

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    sockets.length = 0
    clients = []
    windowListeners = {}

    // core.ts 依赖 window.localStorage 以及 online/offline 事件
    const mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    }
    vi.stubGlobal('window', {
      localStorage: mockLocalStorage,
      addEventListener: vi.fn((event: string, handler: (...args: any[]) => void) => {
        ;(windowListeners[event] ??= []).push(handler)
      }),
      removeEventListener: vi.fn(),
    })

    const module = await import('../core')
    WebSocketClient = module.WebSocketClient
  })

  afterEach(() => {
    clients.forEach(client => {
      try {
        client.disconnect()
      } catch {
        /* ignore cleanup errors */
      }
    })
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  const createClient = (options: Record<string, unknown> = {}) => {
    const client = new WebSocketClient({
      url: 'http://test.com',
      autoConnect: false,
      ...options,
    })
    clients.push(client)
    return client
  }

  /** 建立一条「已连接」的链路 */
  const connectAndFire = (client: any) => {
    client.connect()
    const socket = lastSocket()
    socket.connected = true
    socket.__fire('connect')
    return socket
  }

  // =========================================================================
  // 1. 重连 (reconnection)
  // =========================================================================
  describe('重连边界', () => {
    it('传输层关闭时应切换到 reconnecting 状态并停止心跳', () => {
      const client = createClient()
      const socket = connectAndFire(client)

      expect(client.getState()).toBe(ConnectionState.CONNECTED)

      socket.__fire('disconnect', 'transport close')

      expect(client.getState()).toBe(ConnectionState.RECONNECTING)
      expect(client.isConnected()).toBe(false)
    })

    it('客户端主动断开（io client disconnect）时不应重连', () => {
      const client = createClient()
      const socket = connectAndFire(client)

      socket.__fire('disconnect', 'io client disconnect')

      expect(client.getState()).toBe(ConnectionState.DISCONNECTED)

      // 不应安排任何重连（io 调用次数保持不变）
      const ioCallsBefore = mockIo.mock.calls.length
      vi.advanceTimersByTime(60_000)
      expect(mockIo.mock.calls.length).toBe(ioCallsBefore)
    })

    it('服务端主动断开（io server disconnect）同样不应重连', () => {
      const client = createClient()
      const socket = connectAndFire(client)

      socket.__fire('disconnect', 'io server disconnect')

      expect(client.getState()).toBe(ConnectionState.DISCONNECTED)
      expect(client.getReconnectionHistory()).toEqual([])
    })

    it('达到最大重连次数后应进入 error 状态并记录失败历史', () => {
      const client = createClient({ reconnectionAttempts: 0 })
      const socket = connectAndFire(client)

      socket.__fire('disconnect', 'transport close')

      expect(client.getState()).toBe(ConnectionState.ERROR)

      const history = client.getReconnectionHistory()
      expect(history.length).toBeGreaterThan(0)
      expect(history[history.length - 1].reason).toBe('max_attempts_reached')
      expect(history[history.length - 1].result).toBe('failed')
    })

    it('重连过程中再次断开应把历史结果标记为 aborted', () => {
      const client = createClient()
      const socket = connectAndFire(client)

      // 第一次断开：进入 reconnecting 并安排重连
      socket.__fire('disconnect', 'transport close')
      expect(client.getState()).toBe(ConnectionState.RECONNECTING)

      // 第二次断开：此时已有重连尝试，应写入历史
      socket.__fire('disconnect', 'transport close')

      const history = client.getReconnectionHistory()
      expect(history.length).toBeGreaterThan(0)
      const last = history[history.length - 1]
      expect(last.reason).toBe('transport close')
      expect(['aborted', 'failed']).toContain(last.result)
    })

    it('网络恢复（online 事件）时应触发快速重连', () => {
      const client = createClient()
      const socket = connectAndFire(client)

      socket.connected = false
      socket.__fire('disconnect', 'io client disconnect')
      expect(client.getState()).toBe(ConnectionState.DISCONNECTED)

      const ioCallsBefore = mockIo.mock.calls.length
      fireWindowEvent('online')

      expect(mockIo.mock.calls.length).toBe(ioCallsBefore + 1)
      expect(client.getState()).toBe(ConnectionState.CONNECTING)
    })

    it('clearReconnectionHistory 应幂等且清空历史', () => {
      const client = createClient({ reconnectionAttempts: 0 })
      const socket = connectAndFire(client)
      socket.__fire('disconnect', 'transport close')

      expect(client.getReconnectionHistory().length).toBeGreaterThan(0)

      client.clearReconnectionHistory()
      client.clearReconnectionHistory()
      expect(client.getReconnectionHistory()).toEqual([])
    })
  })

  // =========================================================================
  // 2. 消息去重 (dedup)
  // =========================================================================
  describe('消息去重边界', () => {
    it('同一监听器重复注册只应被回调一次', () => {
      const client = createClient()
      const socket = connectAndFire(client)

      const listener = vi.fn()
      client.on('dup-event', listener)
      client.on('dup-event', listener) // 重复注册 -> Set 去重

      socket.__fireAny('dup-event', { hello: 'world' })

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith('dup-event', { hello: 'world' })
    })

    it('off 之后不应再收到该事件', () => {
      const client = createClient()
      const socket = connectAndFire(client)

      const listener = vi.fn()
      client.on('off-event', listener)
      client.off('off-event', listener)

      socket.__fireAny('off-event', { n: 1 })

      expect(listener).not.toHaveBeenCalled()
    })

    it('状态监听器重复注册同样只回调一次', () => {
      const client = createClient()
      const socket = connectAndFire(client)

      const listener = vi.fn()
      client.onStateChange(listener)
      client.onStateChange(listener)

      socket.connected = false
      socket.__fire('disconnect', 'io client disconnect')

      const stateCalls = listener.mock.calls.filter(
        call => call[0] === ConnectionState.DISCONNECTED
      )
      expect(stateCalls).toHaveLength(1)
    })

    it('离线队列应丢弃已过期的消息', () => {
      const client = createClient({ queueExpiry: 100 })
      client.connect()

      // 未连接 -> 消息进入队列
      expect(client.emit('evt-a', { i: 1 }, true)).toBe(false)
      expect(client.getQueueSize()).toBe(1)

      vi.advanceTimersByTime(200)

      // 再次入队时过期消息被清理，队列不应无限增长
      expect(client.emit('evt-b', { i: 2 }, true)).toBe(false)
      expect(client.getQueueSize()).toBe(1)
    })

    it('超过队列上限时应淘汰最旧的消息', () => {
      const client = createClient({ maxQueueSize: 2 })
      client.connect()

      client.emit('evt-1', { i: 1 }, true)
      client.emit('evt-2', { i: 2 }, true)
      client.emit('evt-3', { i: 3 }, true)

      expect(client.getQueueSize()).toBe(2)
    })

    it('clearQueue 应清空所有排队消息', () => {
      const client = createClient()
      client.connect()

      client.emit('evt-1', { i: 1 }, true)
      client.emit('evt-2', { i: 2 }, true)
      expect(client.getQueueSize()).toBe(2)

      client.clearQueue()
      expect(client.getQueueSize()).toBe(0)
    })
  })

  // =========================================================================
  // 3. 超时 (timeout)
  // =========================================================================
  describe('超时边界', () => {
    it('连续丢失 3 次心跳后应断开 socket 并上报错误', () => {
      const client = createClient({ heartbeatInterval: 50, heartbeatTimeout: 50 })
      const socket = connectAndFire(client)

      // 推进时间，累计触发心跳超时
      vi.advanceTimersByTime(400)

      expect(socket.emit).toHaveBeenCalledWith('ping')
      expect(socket.disconnect).toHaveBeenCalled()
      expect(
        vi
          .mocked(monitor.trackError)
          .mock.calls.some(call => call[0] === 'WebSocketHeartbeatTimeout')
      ).toBe(true)
    })

    it('收到 pong 后应重置丢失心跳计数', () => {
      const client = createClient({ heartbeatInterval: 50, heartbeatTimeout: 50 })
      const socket = connectAndFire(client)

      vi.advanceTimersByTime(120) // 触发一次心跳丢失
      socket.__fire('pong')

      const issues = client.healthCheck().issues
      expect(issues.some((i: string) => i.startsWith('Missed heartbeats'))).toBe(false)
    })

    it('心跳超时的告警文案应包含丢失次数', () => {
      const client = createClient({ heartbeatInterval: 50, heartbeatTimeout: 50 })
      const socket = connectAndFire(client)

      vi.advanceTimersByTime(120)

      const warnings = vi
        .mocked(logger.warn)
        .mock.calls.map(call => String(call[0]))
      expect(warnings.some(w => w.includes('Missed heartbeat'))).toBe(true)
    })

    it('disconnect 后心跳定时器应被清理，不再发送 ping', () => {
      const client = createClient({ heartbeatInterval: 50, heartbeatTimeout: 50 })
      const socket = connectAndFire(client)

      vi.advanceTimersByTime(60)
      const pingCount = socket.emit.mock.calls.filter(c => c[0] === 'ping').length
      expect(pingCount).toBeGreaterThan(0)

      client.disconnect()
      socket.emit.mockClear()

      vi.advanceTimersByTime(500)
      expect(socket.emit.mock.calls.filter(c => c[0] === 'ping')).toHaveLength(0)
    })
  })

  // =========================================================================
  // 4. 错误事件 (error events)
  // =========================================================================
  describe('错误事件边界', () => {
    it('connect_error 应切换到 error 状态并记录日志', () => {
      const client = createClient()
      const socket = connectAndFire(client)

      socket.__fire('connect_error', new Error('connect failed'))

      expect(client.getState()).toBe(ConnectionState.ERROR)
      expect(
        vi
          .mocked(logger.error)
          .mock.calls.some(call => String(call[0]).includes('Connection error'))
      ).toBe(true)
    })

    it('connect_error 后应安排重连', () => {
      const client = createClient()
      const socket = connectAndFire(client)

      const ioCallsBefore = mockIo.mock.calls.length
      socket.connected = false
      socket.__fire('connect_error', new Error('connect failed'))

      // 推进超过默认 reconnectionDelay 后应重新建立连接
      vi.advanceTimersByTime(2_000)

      expect(mockIo.mock.calls.length).toBeGreaterThan(ioCallsBefore)
    })

    it('socket error 事件不应改变连接状态', () => {
      const client = createClient()
      const socket = connectAndFire(client)

      socket.__fire('error', new Error('socket boom'))

      expect(client.getState()).toBe(ConnectionState.CONNECTED)
      expect(
        vi
          .mocked(logger.error)
          .mock.calls.some(call => String(call[0]).includes('Socket error'))
      ).toBe(true)
    })

    it('监听器抛异常不应影响其它监听器', () => {
      const client = createClient()
      const socket = connectAndFire(client)

      const bad = vi.fn(() => {
        throw new Error('listener boom')
      })
      const good = vi.fn()

      client.on('evt', bad)
      client.on('evt', good)

      expect(() => socket.__fireAny('evt', { a: 1 })).not.toThrow()
      expect(bad).toHaveBeenCalledTimes(1)
      expect(good).toHaveBeenCalledTimes(1)
    })

    it('状态监听器抛异常不应影响其它状态监听器', () => {
      const client = createClient()

      const bad = vi.fn(() => {
        throw new Error('state listener boom')
      })
      const good = vi.fn()

      client.onStateChange(bad)
      client.onStateChange(good)

      expect(() => client.connect()).not.toThrow()
      expect(bad).toHaveBeenCalled()
      expect(good).toHaveBeenCalled()
    })
  })

  // =========================================================================
  // 5. 鉴权失败 (auth failure)
  // =========================================================================
  describe('鉴权失败边界', () => {
    it('auth 参数应透传给 socket.io 客户端', () => {
      const client = createClient({ auth: { token: 'secret-token' } })
      client.connect()

      expect(mockIo).toHaveBeenCalledWith(
        'http://test.com',
        expect.objectContaining({ auth: { token: 'secret-token' } })
      )
    })

    it('未配置 auth 时应传入空对象', () => {
      const client = createClient()
      client.connect()

      expect(mockIo).toHaveBeenCalledWith(
        'http://test.com',
        expect.objectContaining({ auth: {} })
      )
    })

    it('鉴权失败（connect_error）后应进入 error 状态并记录错误', () => {
      const client = createClient({ auth: { token: 'bad-token' } })
      const socket = connectAndFire(client)

      const authError = new Error('Invalid credentials')
      socket.__fire('connect_error', authError)

      expect(client.getState()).toBe(ConnectionState.ERROR)
      expect(
        vi
          .mocked(logger.error)
          .mock.calls.some(call => String(call[0]).includes('Connection error'))
      ).toBe(true)
    })

    it('鉴权失败达到最大重试次数后应记录 max_attempts_reached', () => {
      const client = createClient({
        auth: { token: 'bad-token' },
        reconnectionAttempts: 0,
      })
      const socket = connectAndFire(client)

      socket.__fire('connect_error', new Error('Invalid credentials'))

      expect(client.getState()).toBe(ConnectionState.ERROR)

      const history = client.getReconnectionHistory()
      expect(history.length).toBeGreaterThan(0)
      expect(history[history.length - 1].reason).toBe('max_attempts_reached')
      expect(history[history.length - 1].result).toBe('failed')
    })

    it('鉴权失败时应上报 WebSocketReconnectFailed 错误指标', () => {
      const client = createClient({
        auth: { token: 'bad-token' },
        reconnectionAttempts: 0,
      })
      const socket = connectAndFire(client)

      socket.__fire('connect_error', new Error('Invalid credentials'))

      expect(
        vi
          .mocked(monitor.trackError)
          .mock.calls.some(call => call[0] === 'WebSocketReconnectFailed')
      ).toBe(true)
    })

    it('重新连接成功时应清零重连尝试次数并累计重连统计', () => {
      const client = createClient()
      const socket = connectAndFire(client)

      socket.__fire('disconnect', 'transport close')
      expect(client.getState()).toBe(ConnectionState.RECONNECTING)

      // 模拟重连成功
      const nextSocket = lastSocket()
      nextSocket.connected = true
      nextSocket.__fire('connect')

      expect(client.getState()).toBe(ConnectionState.CONNECTED)
      expect(client.getStats().totalReconnections).toBeGreaterThan(0)

      const history = client.getReconnectionHistory()
      expect(history.some((record: any) => record.result === 'success')).toBe(true)
    })
  })
})
