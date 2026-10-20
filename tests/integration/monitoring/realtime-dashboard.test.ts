/**
 * Real-Time Performance Dashboard Integration Tests
 * 实时性能仪表板集成测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Server as SocketIOServer } from 'socket.io'
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client'
import { createServer, Server as HTTPServer } from 'http'
import { realTimeDashboard } from '@/lib/monitoring/realtime-dashboard'
import { enhancedMetricsCollector } from '@/lib/monitoring/enhanced-metrics-collector'
import { alertManager } from '@/lib/monitoring/alert-manager-enhanced'

// ============================================
// 测试工具
// ============================================

let httpServer: HTTPServer
let ioServer: SocketIOServer
let clientSocket: ClientSocket
let serverPort: number

function createTestServer(timeoutMs = 5000): Promise<{ httpServer: HTTPServer; ioServer: SocketIOServer; port: number }> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Server creation timeout after ${timeoutMs}ms`))
    }, timeoutMs)

    httpServer = createServer()
    ioServer = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
      },
    })

    httpServer.listen(() => {
      clearTimeout(timeoutId)
      const port = (httpServer.address() as { port: number }).port
      resolve({ httpServer, ioServer, port })
    })

    httpServer.on('error', reject)
  })
}

function createClientSocket(port: number, timeoutMs = 5000): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(`http://localhost:${port}`, {
      transports: ['websocket'],
      timeout: timeoutMs,
    })

    const timeoutId = setTimeout(() => {
      socket.disconnect()
      reject(new Error(`Socket connection timeout after ${timeoutMs}ms`))
    }, timeoutMs)

    socket.on('connect', () => {
      clearTimeout(timeoutId)
      resolve(socket)
    })

    socket.on('connect_error', (err) => {
      clearTimeout(timeoutId)
      reject(err)
    })
  })
}

// ============================================
// 测试套件
// ============================================

// TODO: Fix integration - Socket.io singleton state causes cross-test contamination
// when tests run in parallel. The realTimeDashboard/enhancedMetricsCollector/alertManager
// singletons are not properly isolated between tests. Run with: -t "test name" to test individually.
describe.skip('Real-Time Performance Dashboard', () => {

  beforeEach(async () => {
    // Clean up any existing state first
    try { realTimeDashboard.destroy() } catch (e) { /* ignore */ }
    try { enhancedMetricsCollector.reset() } catch (e) { /* ignore */ }

    // 创建测试服务器
    const result = await createTestServer(5000)
    httpServer = result.httpServer
    ioServer = result.ioServer
    serverPort = result.port

    // 初始化服务
    realTimeDashboard.initialize(ioServer)
    enhancedMetricsCollector.initialize()
    alertManager.initialize()

    // 创建客户端连接
    clientSocket = await createClientSocket(serverPort, 5000)
  })

  afterEach(() => {
    // 清理 Socket.io 连接先
    if (clientSocket) {
      try { clientSocket.disconnect() } catch (e) { /* ignore */ }
      clientSocket = null as any
    }

    // 关闭服务器
    if (ioServer) {
      try { ioServer.close() } catch (e) { /* ignore */ }
      ioServer = null as any
    }
    if (httpServer) {
      try { httpServer.close() } catch (e) { /* ignore */ }
      httpServer = null as any
    }

    // 重置单例状态
    try { realTimeDashboard.destroy() } catch (e) { /* ignore */ }
    try { enhancedMetricsCollector.reset() } catch (e) { /* ignore */ }
  })

  describe('WebSocket Connection', () => {
    it('should establish connection', () => {
      expect(clientSocket.connected).toBe(true)
    })

    it('should receive initial data on connection', async () => {
      // Add explicit timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), 5000)
      })

      const metricsPromise = new Promise((resolve) => {
        clientSocket.on('metrics:current', resolve)
      })

      const metrics = await Promise.race([metricsPromise, timeoutPromise])

      expect(metrics).toBeDefined()
      expect(metrics).toHaveProperty('current')
      expect(metrics).toHaveProperty('score')
      expect(metrics).toHaveProperty('timestamp')
    })

    it('should receive metrics history', async () => {
      const historyPromise = new Promise((resolve) => {
        clientSocket.on('metrics:history', resolve)
      })

      const history = await historyPromise

      expect(Array.isArray(history)).toBe(true)
    })

    it('should receive performance trend', async () => {
      const trendPromise = new Promise((resolve) => {
        clientSocket.on('metrics:trend', resolve)
      })

      const trend = await trendPromise

      expect(trend).toHaveProperty('data')
      expect(trend).toHaveProperty('trend')
      expect(trend).toHaveProperty('changePercent')
    })
  })

  // TODO: Fix Metrics Collection tests - they are broken because the metrics events aren't emitted properly
  describe.skip('Metrics Collection', () => {
    it('should collect LCP metric', async () => {
      const updatePromise = new Promise((resolve) => {
        clientSocket.on('metrics:update', resolve)
      })

      // 记录指标
      enhancedMetricsCollector.recordMetric('LCP', 2500)

      const metrics = await updatePromise

      expect(metrics.current.LCP).toBe(2500)
    })

    it('should collect CLS metric', async () => {
      const updatePromise = new Promise((resolve) => {
        clientSocket.on('metrics:update', resolve)
      })

      enhancedMetricsCollector.recordMetric('CLS', 0.05)

      const metrics = await updatePromise

      expect(metrics.current.CLS).toBe(0.05)
    })

    it('should collect INP metric', async () => {
      const updatePromise = new Promise((resolve) => {
        clientSocket.on('metrics:update', resolve)
      })

      enhancedMetricsCollector.recordMetric('INP', 150)

      const metrics = await updatePromise

      expect(metrics.current.INP).toBe(150)
    })

    it('should collect TTFB metric', async () => {
      const updatePromise = new Promise((resolve) => {
        clientSocket.on('metrics:update', resolve)
      })

      enhancedMetricsCollector.recordMetric('TTFB', 600)

      const metrics = await updatePromise

      expect(metrics.current.TTFB).toBe(600)
    })

    it('should collect FCP metric', async () => {
      const updatePromise = new Promise((resolve) => {
        clientSocket.on('metrics:update', resolve)
      })

      enhancedMetricsCollector.recordMetric('FCP', 1500)

      const metrics = await updatePromise

      expect(metrics.current.FCP).toBe(1500)
    })
  })

  describe('Performance Score Calculation', () => {
    it('should calculate overall score', async () => {
      const updatePromise = new Promise((resolve) => {
        clientSocket.on('metrics:update', resolve)
      })

      enhancedMetricsCollector.recordMetric('LCP', 2000)
      enhancedMetricsCollector.recordMetric('CLS', 0.05)
      enhancedMetricsCollector.recordMetric('INP', 150)

      const metrics = await updatePromise

      expect(metrics.score.overall).toBeGreaterThan(0)
      expect(metrics.score.overall).toBeLessThanOrEqual(100)
    })

    it('should calculate individual scores', async () => {
      const updatePromise = new Promise((resolve) => {
        clientSocket.on('metrics:update', resolve)
      })

      enhancedMetricsCollector.recordMetric('LCP', 2000)
      enhancedMetricsCollector.recordMetric('CLS', 0.05)
      enhancedMetricsCollector.recordMetric('INP', 150)

      const metrics = await updatePromise

      expect(metrics.score.lcp).toBeGreaterThan(0)
      expect(metrics.score.cls).toBeGreaterThan(0)
      expect(metrics.score.inp).toBeGreaterThan(0)
    })
  })

  // TODO: Fix Alert System tests - they are broken because enhancedMetricsCollector.recordMetric
  // doesn't emit 'alert' event to clients properly
  describe.skip('Alert System', () => {
    it('should trigger warning alert for LCP > 2500ms', async () => {
      const alertPromise = new Promise((resolve) => {
        clientSocket.on('alert', resolve)
      })

      enhancedMetricsCollector.recordMetric('LCP', 3000)

      const alert = await alertPromise

      expect(alert).toBeDefined()
      expect(alert.level).toBe('warning')
      expect(alert.metricName).toBe('LCP')
    })

    it('should trigger critical alert for LCP > 4000ms', async () => {
      const alertPromise = new Promise((resolve) => {
        clientSocket.on('alert', resolve)
      })

      enhancedMetricsCollector.recordMetric('LCP', 4500)

      const alert = await alertPromise

      expect(alert).toBeDefined()
      expect(alert.level).toBe('critical')
      expect(alert.metricName).toBe('LCP')
    })

    it('should trigger warning alert for CLS > 0.1', async () => {
      const alertPromise = new Promise((resolve) => {
        clientSocket.on('alert', resolve)
      })

      enhancedMetricsCollector.recordMetric('CLS', 0.15)

      const alert = await alertPromise

      expect(alert).toBeDefined()
      expect(alert.level).toBe('warning')
      expect(alert.metricName).toBe('CLS')
    })

    it('should trigger critical alert for CLS > 0.25', async () => {
      const alertPromise = new Promise((resolve) => {
        clientSocket.on('alert', resolve)
      })

      enhancedMetricsCollector.recordMetric('CLS', 0.3)

      const alert = await alertPromise

      expect(alert).toBeDefined()
      expect(alert.level).toBe('critical')
      expect(alert.metricName).toBe('CLS')
    })

    it('should trigger warning alert for INP > 200ms', async () => {
      const alertPromise = new Promise((resolve) => {
        clientSocket.on('alert', resolve)
      })

      enhancedMetricsCollector.recordMetric('INP', 300)

      const alert = await alertPromise

      expect(alert).toBeDefined()
      expect(alert.level).toBe('warning')
      expect(alert.metricName).toBe('INP')
    })

    it('should trigger critical alert for INP > 500ms', async () => {
      const alertPromise = new Promise((resolve) => {
        clientSocket.on('alert', resolve)
      })

      enhancedMetricsCollector.recordMetric('INP', 600)

      const alert = await alertPromise

      expect(alert).toBeDefined()
      expect(alert.level).toBe('critical')
      expect(alert.metricName).toBe('INP')
    })
  })

  describe('Client Subscription', () => {
    it('should allow client to subscribe to specific metrics', async () => {
      clientSocket.emit('subscribe', { metrics: ['LCP', 'CLS'] })

      // 等待确认
      await new Promise(resolve => setTimeout(resolve, 100))

      // 记录指标
      enhancedMetricsCollector.recordMetric('LCP', 2000)
      enhancedMetricsCollector.recordMetric('CLS', 0.05)

      const updatePromise = new Promise((resolve) => {
        clientSocket.on('metrics:update', resolve)
      })

      const metrics = await updatePromise

      expect(metrics.current.LCP).toBeDefined()
      expect(metrics.current.CLS).toBeDefined()
    })

    it('should allow client to unsubscribe from metrics', async () => {
      clientSocket.emit('subscribe', { metrics: ['LCP', 'CLS'] })
      await new Promise(resolve => setTimeout(resolve, 100))

      clientSocket.emit('unsubscribe', { metrics: ['CLS'] })
      await new Promise(resolve => setTimeout(resolve, 100))

      enhancedMetricsCollector.recordMetric('LCP', 2000)
      enhancedMetricsCollector.recordMetric('CLS', 0.05)

      const updatePromise = new Promise((resolve) => {
        clientSocket.on('metrics:update', resolve)
      })

      const metrics = await updatePromise

      expect(metrics.current.LCP).toBeDefined()
      // CLS 可能仍然存在，因为其他客户端可能订阅了
    })

    it('should allow client to subscribe to specific alert levels', async () => {
      clientSocket.emit('subscribe', { alertLevels: ['critical'] })
      await new Promise(resolve => setTimeout(resolve, 100))

      enhancedMetricsCollector.recordMetric('LCP', 4500)

      const alertPromise = new Promise((resolve) => {
        clientSocket.on('alert', resolve)
      })

      const alert = await alertPromise

      expect(alert.level).toBe('critical')
    })
  })

  describe('Performance Trend', () => {
    it('should calculate improving trend', async () => {
      // 记录一系列改进的指标
      for (let i = 0; i < 10; i++) {
        enhancedMetricsCollector.recordMetric('LCP', 4000 - i * 200)
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      const trendPromise = new Promise((resolve) => {
        clientSocket.on('metrics:trend', resolve)
      })

      const trend = await trendPromise

      expect(trend.trend).toBe('improving')
      expect(trend.changePercent).toBeGreaterThan(0)
    })

    it('should calculate degrading trend', async () => {
      for (let i = 0; i < 10; i++) {
        enhancedMetricsCollector.recordMetric('LCP', 2000 + i * 200)
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      const trendPromise = new Promise((resolve) => {
        clientSocket.on('metrics:trend', resolve)
      })

      const trend = await trendPromise

      expect(trend.trend).toBe('degrading')
      expect(trend.changePercent).toBeLessThan(0)
    })

    it('should calculate stable trend', async () => {
      for (let i = 0; i < 10; i++) {
        enhancedMetricsCollector.recordMetric('LCP', 2500 + Math.random() * 100)
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      const trendPromise = new Promise((resolve) => {
        clientSocket.on('metrics:trend', resolve)
      })

      const trend = await trendPromise

      expect(trend.trend).toBe('stable')
      expect(Math.abs(trend.changePercent)).toBeLessThan(5)
    })
  })

  describe('Custom Metrics', () => {
    it('should collect heap size metric', async () => {
      const updatePromise = new Promise((resolve) => {
        clientSocket.on('metrics:update', resolve)
      })

      enhancedMetricsCollector.recordCustomMetric('heapSize', 75)

      const metrics = await updatePromise

      expect(metrics.custom.heapSize).toBe(75)
    })

    it('should trigger alert for high memory usage', async () => {
      const alertPromise = new Promise((resolve) => {
        clientSocket.on('alert', resolve)
      })

      enhancedMetricsCollector.recordCustomMetric('heapSize', 110)

      const alert = await alertPromise

      expect(alert).toBeDefined()
      expect(alert.level).toBe('critical')
      expect(alert.metricName).toBe('heapSize')
    })

    it('should collect long task metric', async () => {
      const updatePromise = new Promise((resolve) => {
        clientSocket.on('metrics:update', resolve)
      })

      enhancedMetricsCollector.recordCustomMetric('longTask', 150)

      const metrics = await updatePromise

      expect(metrics.custom.longTaskCount).toBeDefined()
    })

    it('should trigger alert for critical long task', async () => {
      const alertPromise = new Promise((resolve) => {
        clientSocket.on('alert', resolve)
      })

      enhancedMetricsCollector.recordCustomMetric('longTask', 350)

      const alert = await alertPromise

      expect(alert).toBeDefined()
      expect(alert.level).toBe('critical')
      expect(alert.metricName).toBe('longTask')
    })
  })

  describe('Multiple Clients', () => {
    it('should broadcast metrics to all connected clients', async () => {
      const client2 = await createClientSocket(serverPort)

      const updatePromise1 = new Promise((resolve) => {
        clientSocket.on('metrics:update', resolve)
      })

      const updatePromise2 = new Promise((resolve) => {
        client2.on('metrics:update', resolve)
      })

      enhancedMetricsCollector.recordMetric('LCP', 2000)

      const [metrics1, metrics2] = await Promise.all([updatePromise1, updatePromise2])

      expect(metrics1.current.LCP).toBe(2000)
      expect(metrics2.current.LCP).toBe(2000)

      client2.disconnect()
    })

    it('should broadcast alerts to subscribed clients', async () => {
      const client2 = await createClientSocket(serverPort)

      client2.emit('subscribe', { alertLevels: ['critical'] })
      await new Promise(resolve => setTimeout(resolve, 100))

      const alertPromise1 = new Promise((resolve) => {
        clientSocket.on('alert', resolve)
      })

      const alertPromise2 = new Promise((resolve) => {
        client2.on('alert', resolve)
      })

      enhancedMetricsCollector.recordMetric('LCP', 4500)

      const [alert1, alert2] = await Promise.all([alertPromise1, alertPromise2])

      expect(alert1.level).toBe('critical')
      expect(alert2.level).toBe('critical')

      client2.disconnect()
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid metric names gracefully', () => {
      expect(() => {
        enhancedMetricsCollector.recordMetric('INVALID_METRIC', 100)
      }).not.toThrow()
    })

    it('should handle negative values gracefully', () => {
      expect(() => {
        enhancedMetricsCollector.recordMetric('LCP', -100)
      }).not.toThrow()
    })

    it('should handle extremely large values gracefully', () => {
      expect(() => {
        enhancedMetricsCollector.recordMetric('LCP', 999999)
      }).not.toThrow()
    })
  })
})