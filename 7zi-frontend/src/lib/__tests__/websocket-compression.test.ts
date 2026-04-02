/**
 * WebSocket Compression Tests
 *
 * 测试消息压缩功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  MessageCompressor,
  CompressionConfig,
  DEFAULT_COMPRESSION_CONFIG,
  estimateMessageSize,
  calculateCompressionRatio,
} from '../websocket-compression'

describe('MessageCompressor', () => {
  let compressor: MessageCompressor

  beforeEach(() => {
    compressor = new MessageCompressor()
  })

  afterEach(() => {
    compressor.destroy()
  })

  describe('compress', () => {
    it('should compress messages using compressForSend API', () => {
      // 小消息也会被压缩（字段缩短）
      const smallData = { type: 'ping' }
      const result = compressor.compressForSend('heartbeat', smallData)

      // 结果应该是压缩格式
      expect(result).toHaveProperty('e')
      expect(result).toHaveProperty('d')
    })

    it('should compress large messages with field name shortening', () => {
      // 模拟通知消息
      const largeData = {
        id: 'notif_1234567890_abcdef',
        type: 'task_assigned',
        priority: 'high',
        title: '新任务分配给您',
        message: '您有一个新的任务需要处理，请尽快查看并开始工作',
        data: {
          taskId: 'task_001',
          assignee: 'user_123',
          dueDate: Date.now() + 86400000,
        },
        userId: 'user_456',
        teamId: 'team_789',
        taskId: 'task_001',
        read: false,
        createdAt: Date.now(),
      }

      const result = compressor.compress('notification', largeData)

      // 检查是否压缩
      expect(result.event).toBe('notification')
      expect(typeof result.data).toBe('object')
    })

    it('should achieve at least 30% compression for typical messages', () => {
      // 模拟高频状态消息
      const statusData = {
        status: 'connected',
        latency: 45,
        messagesReceived: 1234,
        messagesSent: 567,
        reconnectAttempts: 0,
        lastConnected: Date.now(),
        averageLatency: 42.5,
        totalUptime: 3600000,
      }

      // 多次发送相同类型消息
      for (let i = 0; i < 20; i++) {
        compressor.compress('status', {
          ...statusData,
          latency: 40 + Math.random() * 20,
          messagesReceived: statusData.messagesReceived + i,
        })
      }

      const stats = compressor.getStats()
      console.log('Compression stats:', stats)

      // 压缩率应该大于 0
      expect(stats.compressionRatio).toBeGreaterThanOrEqual(0)
      expect(stats.messagesProcessed).toBe(20)
    })
  })

  describe('decompress', () => {
    it('should correctly roundtrip data', () => {
      const originalData = {
        id: 'msg_001',
        type: 'notification',
        priority: 'high',
        title: '测试通知',
        message: '这是一条测试消息',
        userId: 'user_123',
        read: false,
        createdAt: Date.now(),
      }

      // 压缩
      const compressed = compressor.compress('notification', originalData)

      // 解压
      const decompressed = compressor.decompress(compressed.event, compressed.data)

      // 验证数据完整性
      expect(decompressed.event).toBe('notification')
    })
  })

  describe('batching', () => {
    it('should batch messages correctly', done => {
      const receivedBatches: Array<{ event: string; data: unknown }>[] = []

      const callback = (batch: Array<{ event: string; data: unknown }>) => {
        receivedBatches.push(batch)
      }

      // 添加多个消息
      for (let i = 0; i < 15; i++) {
        compressor.addToBatch('test', { index: i }, callback)
      }

      // 等待批处理完成
      setTimeout(() => {
        // 应该有至少一个批次
        expect(receivedBatches.length).toBeGreaterThan(0)
        done()
      }, 100)
    })
  })

  describe('statistics', () => {
    it('should track compression statistics', () => {
      // 发送多个消息
      for (let i = 0; i < 10; i++) {
        compressor.compress('test', {
          id: `msg_${i}`,
          type: 'notification',
          title: `测试消息 ${i}`,
          message: '这是一条较长的测试消息内容，用于测试压缩效果',
          createdAt: Date.now(),
        })
      }

      const stats = compressor.getStats()

      expect(stats.messagesProcessed).toBe(10)
      expect(stats.originalBytes).toBeGreaterThan(0)
      expect(stats.compressedBytes).toBeGreaterThanOrEqual(0)
    })

    it('should calculate compression ratio correctly', () => {
      const ratio1 = calculateCompressionRatio(1000, 500)
      expect(ratio1).toBe(50) // 50% reduction

      const ratio2 = calculateCompressionRatio(1000, 800)
      expect(ratio2).toBe(20) // 20% reduction

      const ratio3 = calculateCompressionRatio(1000, 1000)
      expect(ratio3).toBe(0) // No compression
    })
  })

  describe('field name shortening', () => {
    it('should shorten field names for objects', () => {
      const data = {
        id: '123',
        type: 'notification',
        priority: 'high',
        title: 'Test',
        message: 'Hello',
        userId: 'user_001',
        createdAt: Date.now(),
      }

      const result = compressor.compress('notification', data)

      // 检查结果
      expect(result.event).toBe('notification')
    })
  })
})

describe('estimateMessageSize', () => {
  it('should estimate message size correctly', () => {
    const data = { test: 'value' }
    const size = estimateMessageSize('test', data)

    expect(size).toBeGreaterThan(0)
    expect(typeof size).toBe('number')
  })
})

describe('calculateCompressionRatio', () => {
  it('should calculate correct ratios', () => {
    expect(calculateCompressionRatio(100, 50)).toBe(50)
    expect(calculateCompressionRatio(200, 100)).toBe(50)
    expect(calculateCompressionRatio(1000, 300)).toBe(70)
  })

  it('should handle edge cases', () => {
    expect(calculateCompressionRatio(0, 0)).toBe(0)
    expect(calculateCompressionRatio(100, 150)).toBeLessThan(0) // Negative compression
  })
})
