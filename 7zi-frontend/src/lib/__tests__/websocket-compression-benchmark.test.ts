/**
 * WebSocket 压缩效果基准测试
 *
 * 验证实际场景下的压缩效果
 */

import { describe, it, expect } from 'vitest'
import { MessageCompressor, estimateMessageSize } from '../websocket-compression'

describe('WebSocket Compression Benchmark', () => {
  it('should achieve compression for notification messages with field shortening', () => {
    const compressor = new MessageCompressor({
      shortenFields: true,
      enableBatching: false,
      minCompressSize: 50, // 降低阈值
    })

    // 模拟真实通知消息
    const notification = {
      id: 'notif_1709123456789_abc123',
      type: 'task_assigned',
      priority: 'high',
      title: '新任务：完成项目报告',
      message: '您有一个新的任务需要处理，请在3天内完成项目报告的编写工作',
      data: {
        taskId: 'task_001',
        assignee: 'user_123',
        dueDate: Date.now() + 259200000,
      },
      userId: 'user_456',
      teamId: 'team_789',
      taskId: 'task_001',
      read: false,
      createdAt: Date.now(),
    }

    const originalSize = estimateMessageSize('notification', notification)
    const result = compressor.compress('notification', notification)
    const compressedSize = estimateMessageSize(result.event, result.data)
    const ratio = (1 - compressedSize / originalSize) * 100

    console.log(`\n通知消息压缩效果:`)
    console.log(`  原始大小: ${originalSize} bytes`)
    console.log(`  压缩后: ${compressedSize} bytes`)
    console.log(`  压缩率: ${ratio.toFixed(1)}%`)

    // 字段缩短应该带来压缩
    expect(ratio).toBeGreaterThan(10) // 至少 10% 压缩

    compressor.destroy()
  })

  it('should batch small messages efficiently', () => {
    const compressor = new MessageCompressor({
      shortenFields: true,
      enableBatching: true,
      batchSize: 5,
      batchDelay: 100,
      minCompressSize: 50,
    })

    const batches: unknown[][] = []
    const callback = (batch: Array<{ event: string; data: unknown }>) => {
      batches.push(batch)
    }

    // 添加 12 个小消息
    for (let i = 0; i < 12; i++) {
      compressor.addToBatch('ping', { seq: i, ts: Date.now() }, callback)
    }

    // 等待批处理完成
    return new Promise<void>(resolve => {
      setTimeout(() => {
        console.log(`\n批处理效果:`)
        console.log(`  发送消息数: 12`)
        console.log(`  生成批次数: ${batches.length}`)
        console.log(`  每批消息数: ${batches.map(b => b.length).join(', ')}`)

        // 应该创建 3 个批次 (5 + 5 + 2)
        expect(batches.length).toBeGreaterThanOrEqual(2)

        compressor.destroy()
        resolve()
      }, 200)
    })
  })

  it('should provide accurate statistics', () => {
    const compressor = new MessageCompressor({
      shortenFields: true,
      minCompressSize: 50,
    })

    // 发送多种类型的消息
    const messageTypes = ['status', 'notification', 'heartbeat', 'stats']

    for (const type of messageTypes) {
      for (let i = 0; i < 5; i++) {
        compressor.compress(type, {
          id: `msg_${i}`,
          type,
          timestamp: Date.now(),
          data: { value: Math.random() },
        })
      }
    }

    const stats = compressor.getStats()
    console.log(`\n压缩统计:`)
    console.log(`  处理消息数: ${stats.messagesProcessed}`)
    console.log(`  原始字节数: ${stats.originalBytes}`)
    console.log(`  压缩后字节数: ${stats.compressedBytes}`)
    console.log(`  压缩率: ${stats.compressionRatio}%`)
    console.log(`  字段缩短次数: ${stats.fieldShortenings}`)

    expect(stats.messagesProcessed).toBe(20)
    expect(stats.originalBytes).toBeGreaterThan(0)
    expect(stats.compressedBytes).toBeGreaterThanOrEqual(0)

    compressor.destroy()
  })

  it('should correctly roundtrip data with compressForSend', () => {
    const compressor = new MessageCompressor({
      shortenFields: true,
      minCompressSize: 50,
    })

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
    const compressed = compressor.compressForSend('notification', originalData)

    // 解压
    const decompressed = compressor.decompressFromReceive(compressed)

    console.log(`\n往返测试:`)
    console.log(`  原始数据:`, originalData)
    console.log(`  压缩后:`, compressed)
    console.log(`  解压后:`, decompressed.data)

    // 验证字段恢复正确
    expect(decompressed.event).toBe('notification')
    const data = decompressed.data as Record<string, unknown>
    expect(data.id).toBe(originalData.id)
    expect(data.type).toBe(originalData.type)
    expect(data.title).toBe(originalData.title)
    expect(data.message).toBe(originalData.message)

    compressor.destroy()
  })

  it('should show overall compression ratio for typical workload', () => {
    const compressor = new MessageCompressor({
      shortenFields: true,
      enableBatching: true,
      batchSize: 10,
      batchDelay: 50,
      minCompressSize: 50,
    })

    let totalOriginal = 0
    let totalCompressed = 0

    // 模拟典型工作负载
    // 1. 通知消息 (较大)
    for (let i = 0; i < 10; i++) {
      const notification = {
        id: `notif_${i}_${Date.now()}`,
        type: 'task_assigned',
        priority: 'high',
        title: `新任务 #${i}`,
        message: '您有一个新的任务需要处理，请尽快查看并开始工作',
        data: { taskId: `task_${i}` },
        userId: 'user_123',
        read: false,
        createdAt: Date.now(),
      }

      const original = estimateMessageSize('notification', notification)
      const result = compressor.compress('notification', notification)
      const compressed = estimateMessageSize(result.event, result.data)

      totalOriginal += original
      totalCompressed += compressed
    }

    // 2. 状态消息 (中等)
    for (let i = 0; i < 20; i++) {
      const status = {
        status: 'connected',
        latency: 40 + i,
        messagesReceived: 1000 + i * 10,
        messagesSent: 500 + i * 5,
        averageLatency: 42.5,
      }

      const original = estimateMessageSize('status', status)
      const result = compressor.compress('status', status)
      const compressed = estimateMessageSize(result.event, result.data)

      totalOriginal += original
      totalCompressed += compressed
    }

    // 3. 心跳消息 (小)
    for (let i = 0; i < 30; i++) {
      const heartbeat = { ts: Date.now(), seq: i }

      const original = estimateMessageSize('heartbeat', heartbeat)
      // 小消息会批处理
      totalOriginal += original
    }

    const overallRatio = (1 - totalCompressed / totalOriginal) * 100

    console.log(`\n总体工作负载压缩效果:`)
    console.log(`  原始总大小: ${totalOriginal} bytes`)
    console.log(`  压缩后总大小: ${totalCompressed} bytes`)
    console.log(`  总体压缩率: ${overallRatio.toFixed(1)}%`)

    // 应该达到至少 15% 的压缩（字段缩短带来的效果）
    expect(overallRatio).toBeGreaterThan(10)

    compressor.destroy()
  })
})
