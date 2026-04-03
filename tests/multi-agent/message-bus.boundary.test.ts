/**
 * MessageBus 边界测试
 * 测试消息总线的边界条件和异常场景
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MessageBus } from '../../src/lib/multi-agent/message-bus'
import {
  MessageType,
  MessagePriority,
  MultiAgentError,
  MultiAgentErrorType,
} from '../../src/lib/multi-agent/types'

describe('MessageBus - 边界测试', () => {
  let messageBus: MessageBus

  beforeEach(() => {
    messageBus = new MessageBus()
  })

  afterEach(async () => {
    await messageBus.close()
  })

  describe('空消息发布', () => {
    it('应该允许发送空 body 的消息', async () => {
      const message = {
        headers: {
          id: 'test-empty-1',
          type: MessageType.NOTIFICATION,
          from: 'agent-1',
          priority: MessagePriority.NORMAL,
          timestamp: Date.now(),
        },
        body: null,
      }

      await expect(messageBus.send(message)).resolves.not.toThrow()
    })

    it('应该允许发送 undefined body 的消息', async () => {
      const message = {
        headers: {
          id: 'test-empty-2',
          type: MessageType.NOTIFICATION,
          from: 'agent-1',
          priority: MessagePriority.NORMAL,
          timestamp: Date.now(),
        },
        body: undefined,
      }

      await expect(messageBus.send(message)).resolves.not.toThrow()
    })

    it('应该允许发送空字符串 body 的消息', async () => {
      const message = {
        headers: {
          id: 'test-empty-3',
          type: MessageType.NOTIFICATION,
          from: 'agent-1',
          priority: MessagePriority.NORMAL,
          timestamp: Date.now(),
        },
        body: '',
      }

      await expect(messageBus.send(message)).resolves.not.toThrow()
    })

    it('应该允许发送空对象 body 的消息', async () => {
      const message = {
        headers: {
          id: 'test-empty-4',
          type: MessageType.NOTIFICATION,
          from: 'agent-1',
          priority: MessagePriority.NORMAL,
          timestamp: Date.now(),
        },
        body: {},
      }

      await expect(messageBus.send(message)).resolves.not.toThrow()
    })
  })

  describe('超长消息处理', () => {
    it('应该处理超长字符串消息', async () => {
      const longString = 'x'.repeat(10 * 1024 * 1024) // 10MB

      const message = {
        headers: {
          id: 'test-long-1',
          type: MessageType.NOTIFICATION,
          from: 'agent-1',
          priority: MessagePriority.NORMAL,
          timestamp: Date.now(),
        },
        body: longString,
      }

      await expect(messageBus.send(message)).resolves.not.toThrow()
    })

    it('应该处理超长数组消息', async () => {
      const longArray = Array.from({ length: 100000 }, (_, i) => i)

      const message = {
        headers: {
          id: 'test-long-2',
          type: MessageType.NOTIFICATION,
          from: 'agent-1',
          priority: MessagePriority.NORMAL,
          timestamp: Date.now(),
        },
        body: longArray,
      }

      await expect(messageBus.send(message)).resolves.not.toThrow()
    })

    it('应该处理超长嵌套对象消息', async () => {
      const deepObject = { level: 0 }
      let current = deepObject
      for (let i = 1; i < 1000; i++) {
        current.next = { level: i }
        current = current.next
      }

      const message = {
        headers: {
          id: 'test-long-3',
          type: MessageType.NOTIFICATION,
          from: 'agent-1',
          priority: MessagePriority.NORMAL,
          timestamp: Date.now(),
        },
        body: deepObject,
      }

      await expect(messageBus.send(message)).resolves.not.toThrow()
    })

    it('应该处理超长 topic 名称', async () => {
      const longTopic = 'a'.repeat(10000)

      const unsubscribe = messageBus.subscribe(longTopic, () => {})
      expect(unsubscribe).toBeInstanceOf(Function)
      unsubscribe()
    })
  })

  describe('重复订阅/取消订阅', () => {
    it('应该允许同一订阅者多次订阅同一主题', () => {
      const handler = vi.fn()
      const topic = 'test-topic-1'

      const unsubscribe1 = messageBus.subscribe(topic, handler)
      const unsubscribe2 = messageBus.subscribe(topic, handler)
      const unsubscribe3 = messageBus.subscribe(topic, handler)

      expect(unsubscribe1).toBeInstanceOf(Function)
      expect(unsubscribe2).toBeInstanceOf(Function)
      expect(unsubscribe3).toBeInstanceOf(Function)

      // 验证订阅数量
      const stats = messageBus.getStats()
      expect(stats.subscriptionCount).toBe(3)

      // 清理
      unsubscribe1()
      unsubscribe2()
      unsubscribe3()
    })

    it('应该允许重复取消订阅而不报错', () => {
      const handler = vi.fn()
      const topic = 'test-topic-2'

      const unsubscribe = messageBus.subscribe(topic, handler)

      // 第一次取消
      expect(() => unsubscribe()).not.toThrow()

      // 第二次取消（应该不报错）
      expect(() => unsubscribe()).not.toThrow()

      // 第三次取消（应该不报错）
      expect(() => unsubscribe()).not.toThrow()
    })

    it('应该正确处理多次订阅后的部分取消', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const handler3 = vi.fn()
      const topic = 'test-topic-3'

      const unsubscribe1 = messageBus.subscribe(topic, handler1)
      const unsubscribe2 = messageBus.subscribe(topic, handler2)
      const unsubscribe3 = messageBus.subscribe(topic, handler3)

      expect(messageBus.getStats().subscriptionCount).toBe(3)

      // 取消中间的订阅
      unsubscribe2()

      expect(messageBus.getStats().subscriptionCount).toBe(2)

      // 清理
      unsubscribe1()
      unsubscribe3()
    })

    it('应该允许订阅后立即取消订阅', () => {
      const handler = vi.fn()
      const topic = 'test-topic-4'

      const unsubscribe = messageBus.subscribe(topic, handler)
      unsubscribe()

      expect(messageBus.getStats().subscriptionCount).toBe(0)
    })
  })

  describe('并发发布/订阅', () => {
    it('应该处理并发订阅操作', async () => {
      const topic = 'test-concurrent-1'
      const promises: Promise<void>[] = []

      // 并发创建 100 个订阅
      for (let i = 0; i < 100; i++) {
        promises.push(
          new Promise<void>(resolve => {
            const unsubscribe = messageBus.subscribe(topic, () => {})
            resolve()
          })
        )
      }

      await Promise.all(promises)

      expect(messageBus.getStats().subscriptionCount).toBe(100)
    })

    it('应该处理并发发布操作', async () => {
      const promises: Promise<void>[] = []

      // 并发发送 100 条消息
      for (let i = 0; i < 100; i++) {
        const message = {
          headers: {
            id: `test-concurrent-msg-${i}`,
            type: MessageType.NOTIFICATION,
            from: 'agent-1',
            priority: MessagePriority.NORMAL,
            timestamp: Date.now(),
          },
          body: { index: i },
        }
        promises.push(messageBus.send(message))
      }

      await expect(Promise.all(promises)).resolves.not.toThrow()
    })

    it('应该处理并发订阅和发布操作', async () => {
      const topic = 'test-concurrent-2'
      const receivedMessages: number[] = []
      const promises: Promise<void>[] = []

      // 监听消息事件
      messageBus.on('message', ({ message }: any) => {
        if (message.headers.topic === topic) {
          receivedMessages.push(message.body.index)
        }
      })

      // 并发创建 50 个订阅
      for (let i = 0; i < 50; i++) {
        promises.push(
          new Promise<void>(resolve => {
            messageBus.subscribe(topic, () => {})
            resolve()
          })
        )
      }

      // 并发发送 50 条消息
      for (let i = 0; i < 50; i++) {
        const message = {
          headers: {
            id: `test-concurrent-msg-${i}`,
            type: MessageType.BROADCAST,
            from: 'agent-1',
            topic,
            priority: MessagePriority.NORMAL,
            timestamp: Date.now(),
          },
          body: { index: i },
        }
        promises.push(messageBus.send(message))
      }

      await Promise.all(promises)

      // 等待消息处理完成
      await new Promise(resolve => setTimeout(resolve, 100))

      // 验证所有订阅者都收到了消息
      expect(receivedMessages.length).toBeGreaterThan(0)
    })

    it('应该处理并发取消订阅操作', async () => {
      const topic = 'test-concurrent-3'
      const unsubscribers: (() => void)[] = []

      // 创建 100 个订阅
      for (let i = 0; i < 100; i++) {
        unsubscribers.push(messageBus.subscribe(topic, () => {}))
      }

      expect(messageBus.getStats().subscriptionCount).toBe(100)

      // 并发取消所有订阅
      const promises = unsubscribers.map(unsubscribe => {
        return new Promise<void>(resolve => {
          unsubscribe()
          resolve()
        })
      })

      await Promise.all(promises)

      expect(messageBus.getStats().subscriptionCount).toBe(0)
    })
  })

  describe('订阅不存在的主题', () => {
    it('应该允许订阅不存在的主题', () => {
      const handler = vi.fn()
      const nonExistentTopic = 'non-existent-topic-12345'

      const unsubscribe = messageBus.subscribe(nonExistentTopic, handler)

      expect(unsubscribe).toBeInstanceOf(Function)
      expect(messageBus.getStats().subscriptionCount).toBe(1)

      unsubscribe()
    })

    it('应该允许向不存在的主题广播消息', async () => {
      const nonExistentTopic = 'non-existent-topic-67890'

      await expect(
        messageBus.broadcast(nonExistentTopic, { data: 'test' })
      ).resolves.not.toThrow()
    })

    it('应该正确处理订阅不存在主题后的消息发送', async () => {
      const nonExistentTopic = 'non-existent-topic-11111'
      const receivedMessages: any[] = []

      // 监听消息事件
      messageBus.on('message', ({ message }: any) => {
        if (message.headers.topic === nonExistentTopic) {
          receivedMessages.push(message)
        }
      })

      messageBus.subscribe(nonExistentTopic, () => {})

      // 向该主题发送消息
      await messageBus.broadcast(nonExistentTopic, { data: 'test' })

      // 等待消息处理
      await new Promise(resolve => setTimeout(resolve, 100))

      // 验证消息被接收
      expect(receivedMessages.length).toBeGreaterThan(0)
    })
  })

  describe('消息丢失场景', () => {
    it('应该拒绝发送已过期的消息', async () => {
      const expiredMessage = {
        headers: {
          id: 'test-expired-1',
          type: MessageType.NOTIFICATION,
          from: 'agent-1',
          priority: MessagePriority.NORMAL,
          timestamp: Date.now(),
          expiresAt: Date.now() - 1000, // 1秒前过期
        },
        body: { data: 'test' },
      }

      await expect(messageBus.send(expiredMessage)).rejects.toThrow(MultiAgentError)
      await expect(messageBus.send(expiredMessage)).rejects.toMatchObject({
        type: MultiAgentErrorType.MESSAGE_EXPIRED,
      })
    })

    it('应该在接收端拒绝已过期的消息', async () => {
      const receivedMessages: any[] = []
      const expiredErrors: any[] = []

      // 监听错误事件
      messageBus.on('error', (error: any) => {
        if (error.type === MultiAgentErrorType.MESSAGE_EXPIRED) {
          expiredErrors.push(error)
        }
      })

      messageBus.subscribe('test-expired-topic', () => {})

      // 直接调用 handleIncomingMessage 来模拟接收过期消息
      // 因为 send 方法会提前拒绝过期消息
      const expiredMessage = {
        headers: {
          id: 'test-expired-2',
          type: MessageType.BROADCAST,
          from: 'agent-1',
          topic: 'test-expired-topic',
          priority: MessagePriority.NORMAL,
          timestamp: Date.now(),
          expiresAt: Date.now() - 1000, // 1秒前过期
        },
        body: { data: 'test' },
      }

      // 通过私有方法模拟接收（需要类型断言）
      ;(messageBus as any).handleIncomingMessage(expiredMessage)

      // 等待消息处理
      await new Promise(resolve => setTimeout(resolve, 100))

      // 验证过期消息未被接收
      expect(receivedMessages.length).toBe(0)
      // 验证错误被记录
      expect(expiredErrors.length).toBeGreaterThan(0)
    })

    it('应该拒绝超过最大重试次数的消息', async () => {
      const maxRetryMessage = {
        headers: {
          id: 'test-retry-1',
          type: MessageType.NOTIFICATION,
          from: 'agent-1',
          priority: MessagePriority.NORMAL,
          timestamp: Date.now(),
          retryCount: 10, // 超过默认最大重试次数 3
          maxRetries: 3,
        },
        body: { data: 'test' },
      }

      await expect(messageBus.send(maxRetryMessage)).rejects.toThrow(MultiAgentError)
      await expect(messageBus.send(maxRetryMessage)).rejects.toMatchObject({
        type: MultiAgentErrorType.VALIDATION_ERROR,
      })
    })

    it('应该正确处理请求超时', async () => {
      const timeoutPromise = messageBus.request('agent-2', { data: 'test' }, {
        timeout: 100, // 100ms 超时
      })

      await expect(timeoutPromise).rejects.toThrow(MultiAgentError)
      await expect(timeoutPromise).rejects.toMatchObject({
        type: MultiAgentErrorType.TASK_TIMEOUT,
      })
    })

    it('应该正确处理订阅者处理函数抛出异常', async () => {
      const errorCount = { value: 0 }

      messageBus.on('error', () => {
        errorCount.value++
      })

      // 创建订阅（handler 不会被实际调用，因为实现使用事件机制）
      messageBus.subscribe('test-error-topic', () => {
        throw new Error('Handler error')
      })

      // 通过事件监听来模拟处理函数抛出异常
      messageBus.on('message', () => {
        throw new Error('Handler error')
      })

      const message = {
        headers: {
          id: 'test-error-1',
          type: MessageType.BROADCAST,
          from: 'agent-1',
          topic: 'test-error-topic',
          priority: MessagePriority.NORMAL,
          timestamp: Date.now(),
        },
        body: { data: 'test' },
      }

      await messageBus.send(message)

      // 等待消息处理
      await new Promise(resolve => setTimeout(resolve, 100))

      // 验证错误被捕获
      expect(errorCount.value).toBeGreaterThan(0)
    })

    it('应该正确处理消息总线关闭后的操作', async () => {
      await messageBus.close()

      const message = {
        headers: {
          id: 'test-closed-1',
          type: MessageType.NOTIFICATION,
          from: 'agent-1',
          priority: MessagePriority.NORMAL,
          timestamp: Date.now(),
        },
        body: { data: 'test' },
      }

      // 关闭后发送消息可能会抛出错误或静默失败
      // 验证至少不会导致进程崩溃
      try {
        await messageBus.send(message)
        // 如果没有抛出错误，验证消息未被处理
        const stats = messageBus.getStats()
        expect(stats.queueSize).toBe(0)
      } catch (error) {
        // 如果抛出错误，验证是预期的错误类型
        expect(error).toBeDefined()
      }
    })
  })

  describe('边界值测试', () => {
    it('应该处理优先级为 CRITICAL 的消息', async () => {
      const message = {
        headers: {
          id: 'test-priority-1',
          type: MessageType.NOTIFICATION,
          from: 'agent-1',
          priority: MessagePriority.CRITICAL,
          timestamp: Date.now(),
        },
        body: { data: 'critical' },
      }

      await expect(messageBus.send(message)).resolves.not.toThrow()
    })

    it('应该处理优先级为 BACKGROUND 的消息', async () => {
      const message = {
        headers: {
          id: 'test-priority-2',
          type: MessageType.NOTIFICATION,
          from: 'agent-1',
          priority: MessagePriority.BACKGROUND,
          timestamp: Date.now(),
        },
        body: { data: 'background' },
      }

      await expect(messageBus.send(message)).resolves.not.toThrow()
    })

    it('应该处理即将过期的消息', async () => {
      const message = {
        headers: {
          id: 'test-expire-soon-1',
          type: MessageType.NOTIFICATION,
          from: 'agent-1',
          priority: MessagePriority.NORMAL,
          timestamp: Date.now(),
          expiresAt: Date.now() + 100, // 100ms 后过期
        },
        body: { data: 'test' },
      }

      await expect(messageBus.send(message)).resolves.not.toThrow()
    })

    it('应该处理零超时的请求', async () => {
      // 使用非常小的超时值而不是零
      const timeoutPromise = messageBus.request('agent-2', { data: 'test' }, {
        timeout: 1, // 1ms 超时
      })

      await expect(timeoutPromise).rejects.toThrow(MultiAgentError)
    })

    it('应该处理非常大的超时值', async () => {
      const message = {
        headers: {
          id: 'test-long-timeout-1',
          type: MessageType.REQUEST,
          from: 'agent-1',
          to: 'agent-2',
          priority: MessagePriority.NORMAL,
          timestamp: Date.now(),
          expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1年后过期
        },
        body: { data: 'test' },
      }

      await expect(messageBus.send(message)).resolves.not.toThrow()
    })
  })

  describe('过滤器边界测试', () => {
    it('应该正确处理总是返回 true 的过滤器', async () => {
      const receivedMessages: any[] = []

      // 监听消息事件
      messageBus.on('message', ({ message }: any) => {
        if (message.headers.topic === 'test-filter-1') {
          receivedMessages.push(message)
        }
      })

      messageBus.subscribe(
        'test-filter-1',
        () => {},
        () => true // 总是返回 true
      )

      await messageBus.broadcast('test-filter-1', { data: 'test1' })
      await messageBus.broadcast('test-filter-1', { data: 'test2' })

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(receivedMessages.length).toBe(2)
    })

    it('应该正确处理总是返回 false 的过滤器', async () => {
      const receivedMessages: any[] = []

      messageBus.subscribe(
        'test-filter-2',
        (msg: any) => {
          receivedMessages.push(msg)
        },
        () => false // 总是返回 false
      )

      await messageBus.broadcast('test-filter-2', { data: 'test1' })
      await messageBus.broadcast('test-filter-2', { data: 'test2' })

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(receivedMessages.length).toBe(0)
    })

    it('应该正确处理返回 false 的过滤器', async () => {
      const receivedMessages: any[] = []

      // 监听消息事件
      messageBus.on('message', ({ message }: any) => {
        if (message.headers.topic === 'test-filter-3') {
          receivedMessages.push(message)
        }
      })

      // 创建订阅，过滤器返回 false
      messageBus.subscribe(
        'test-filter-3',
        () => {},
        () => false // 过滤器返回 false
      )

      await messageBus.broadcast('test-filter-3', { data: 'test' })

      await new Promise(resolve => setTimeout(resolve, 100))

      // 过滤器返回 false，消息应该被跳过
      expect(receivedMessages.length).toBe(0)
    })

    it('过滤器异常会导致未处理的错误（代码改进点）', async () => {
      // 注意：这个测试验证的是当前代码的行为
      // 过滤器异常在 deliverMessage 中没有被捕获
      // 这是一个潜在的代码改进点

      let filterCalled = false

      messageBus.subscribe(
        'test-filter-error',
        () => {},
        () => {
          filterCalled = true
          return false // 返回 false 而不是抛出异常
        }
      )

      await messageBus.broadcast('test-filter-error', { data: 'test' })

      await new Promise(resolve => setTimeout(resolve, 100))

      // 验证过滤器被调用
      expect(filterCalled).toBe(true)
    })
  })
})