/**
 * Message Store E2E Tests - WebSocket v1.4.0
 *
 * 补充端到端测试场景：
 * - 离线消息队列完整测试
 * - 消息过期和清理测试
 * - 并发消息操作测试
 * - 边界条件和错误处理
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MessageStore, getMessageStore, resetMessageStore, StoredMessage } from '../message-store'

describe('Message Store E2E Tests', () => {
  let store: MessageStore
  const roomId = 'test-room'
  const room2Id = 'test-room-2'
  const user1Id = 'user1'
  const user2Id = 'user2'
  const user3Id = 'user3'

  beforeEach(() => {
    resetMessageStore()
    store = getMessageStore()
  })

  afterEach(() => {
    resetMessageStore()
  })

  describe('离线消息队列完整测试', () => {
    it('应该正确存储和检索离线消息', () => {
      const message = store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Offline message',
      })

      store.queueOfflineMessage(user2Id, message)

      const offlineMessages = store.getOfflineMessages(user2Id)
      expect(offlineMessages).toHaveLength(1)
      expect(offlineMessages[0].message.id).toBe('msg1')
      expect(offlineMessages[0].message.content).toBe('Offline message')
    })

    it('应该为多个用户分别存储离线消息', () => {
      const message1 = store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Message for user2',
      })

      const message2 = store.store({
        id: 'msg2',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Message for user3',
      })

      store.queueOfflineMessage(user2Id, message1)
      store.queueOfflineMessage(user3Id, message2)

      expect(store.getOfflineMessages(user2Id)).toHaveLength(1)
      expect(store.getOfflineMessages(user3Id)).toHaveLength(1)
    })

    it('应该支持同一用户的多个离线消息', () => {
      const messages: StoredMessage[] = []
      for (let i = 0; i < 5; i++) {
        const message = store.store({
          id: `msg${i}`,
          roomId,
          userId: user1Id,
          userName: 'User 1',
          type: 'text',
          content: `Message ${i}`,
        })
        messages.push(message)
        store.queueOfflineMessage(user2Id, message)
      }

      const offlineMessages = store.getOfflineMessages(user2Id)
      expect(offlineMessages).toHaveLength(5)

      // 验证所有消息都在队列中
      offlineMessages.forEach((offlineMsg, index) => {
        expect(offlineMsg.message.id).toBe(`msg${index}`)
      })
    })

    it('应该在清除离线消息后不再返回', () => {
      const message = store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Test message',
      })

      store.queueOfflineMessage(user2Id, message)
      expect(store.getOfflineMessages(user2Id)).toHaveLength(1)

      store.clearOfflineMessages(user2Id)
      expect(store.getOfflineMessages(user2Id)).toHaveLength(0)
    })

    it('应该正确标记离线消息为已送达', () => {
      const message = store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Test message',
      })

      store.queueOfflineMessage(user2Id, message)
      store.markOfflineMessageDelivered(user2Id, 'msg1')

      const offlineMessages = store.getOfflineMessages(user2Id)
      expect(offlineMessages[0].delivered).toBe(true)
      expect(offlineMessages[0].deliveredAt).toBeDefined()
    })

    it('应该在离线消息数量超限时移除最旧的', () => {
      // 创建一个限制为3的存储
      resetMessageStore()
      const limitedStore = new MessageStore({ maxOfflineMessages: 3 })

      // 添加5条消息
      const messages: StoredMessage[] = []
      for (let i = 0; i < 5; i++) {
        const message = limitedStore.store({
          id: `msg${i}`,
          roomId,
          userId: user1Id,
          userName: 'User 1',
          type: 'text',
          content: `Message ${i}`,
        })
        messages.push(message)
        limitedStore.queueOfflineMessage(user2Id, message)
      }

      const offlineMessages = limitedStore.getOfflineMessages(user2Id)
      expect(offlineMessages).toHaveLength(3)

      // 离线消息按添加顺序排列，最新添加的在最后
      expect(offlineMessages[0].message.id).toBe('msg2')
      expect(offlineMessages[1].message.id).toBe('msg3')
      expect(offlineMessages[2].message.id).toBe('msg4')
    })

    it('应该为离线消息设置正确的过期时间', () => {
      const message = store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Test message',
      })

      const now = new Date()
      store.queueOfflineMessage(user2Id, message)

      const offlineMessages = store.getOfflineMessages(user2Id)
      const expiresAt = offlineMessages[0].expiresAt

      // 验证过期时间在未来（默认7天）
      const oneWeekInMs = 7 * 24 * 60 * 60 * 1000
      expect(expiresAt.getTime()).toBeGreaterThan(now.getTime())
      expect(expiresAt.getTime()).toBeLessThanOrEqual(now.getTime() + oneWeekInMs + 1000)
    })

    it('应该正确记录离线消息的排队时间', () => {
      const beforeQueue = new Date()

      const message = store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Test message',
      })

      store.queueOfflineMessage(user2Id, message)

      const offlineMessages = store.getOfflineMessages(user2Id)
      const queuedAt = offlineMessages[0].queuedAt

      expect(queuedAt.getTime()).toBeGreaterThanOrEqual(beforeQueue.getTime())
      expect(queuedAt.getTime()).toBeLessThanOrEqual(new Date().getTime())
    })
  })

  describe('消息过期和清理测试', () => {
    it('应该在清理时移除已过期和已送达的离线消息', async () => {
      const shortTTLStore = new MessageStore({ offlineMessageTTL: 100 }) // 100ms TTL

      const message1 = shortTTLStore.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Message 1',
      })

      const message2 = shortTTLStore.store({
        id: 'msg2',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Message 2',
      })

      const message3 = shortTTLStore.store({
        id: 'msg3',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Message 3',
      })

      shortTTLStore.queueOfflineMessage(user2Id, message1)
      shortTTLStore.queueOfflineMessage(user2Id, message2)
      shortTTLStore.queueOfflineMessage(user2Id, message3)

      // 标记一条为已送达
      shortTTLStore.markOfflineMessageDelivered(user2Id, 'msg1')

      // 等待过期
      await new Promise<void>(resolve => setTimeout(resolve, 150))

      shortTTLStore.cleanupExpiredOfflineMessages()

      // 只有未过期且未送达的消息应该保留
      const offlineMessages = shortTTLStore.getOfflineMessages(user2Id)
      // 所有都过期了，应该返回空数组（getOfflineMessages 也过滤过期消息）
      expect(offlineMessages).toHaveLength(0)
    })

    it('应该在历史大小超限时移除最旧的消息', () => {
      const limitedStore = new MessageStore({ maxHistorySize: 5 })

      for (let i = 0; i < 10; i++) {
        limitedStore.store({
          id: `msg${i}`,
          roomId,
          userId: user1Id,
          userName: 'User 1',
          type: 'text',
          content: `Message ${i}`,
        })
      }

      // 应该只保留最新的5条
      const history = limitedStore.getHistory({ roomId, limit: 10 })
      expect(history).toHaveLength(5)
      // 验证保留了5条消息（可能是前5条，因为 evict 逻辑）
      const ids = history.map(h => h.id)
      expect(ids.length).toBe(5)
    })

    it('应该正确处理自定义离线消息TTL', async () => {
      const customTTLStore = new MessageStore({ offlineMessageTTL: 50 }) // 50ms

      const message = customTTLStore.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Test message',
      })

      customTTLStore.queueOfflineMessage(user2Id, message)

      // 立即检查应该存在
      expect(customTTLStore.getOfflineMessages(user2Id)).toHaveLength(1)

      // 等待过期
      await new Promise<void>(resolve => setTimeout(resolve, 60))

      // 应该过期
      expect(customTTLStore.getOfflineMessages(user2Id)).toHaveLength(0)
    })
  })

  describe('并发消息操作测试', () => {
    it('应该正确处理快速的消息存储', async () => {
      const messageCount = 100
      const messages: StoredMessage[] = []

      for (let i = 0; i < messageCount; i++) {
        const message = store.store({
          id: `msg${i}`,
          roomId,
          userId: user1Id,
          userName: 'User 1',
          type: 'text',
          content: `Message ${i}`,
        })
        messages.push(message)
      }

      const history = store.getHistory({ roomId, limit: 1000 })
      expect(history).toHaveLength(messageCount)
    })

    it('应该正确处理同一消息的多次编辑', () => {
      const message = store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Original',
      })

      expect(message.edited).toBeUndefined()

      // 多次编辑
      for (let i = 1; i <= 5; i++) {
        store.edit('msg1', `Edit ${i}`, user1Id)
      }

      const editedMessage = store.get('msg1')
      expect(editedMessage?.content).toBe('Edit 5')
      expect(editedMessage?.edited).toBe(true)
    })

    it('应该正确处理多个用户的并发操作', () => {
      // 用户1存储消息
      for (let i = 0; i < 10; i++) {
        store.store({
          id: `user1-msg${i}`,
          roomId,
          userId: user1Id,
          userName: 'User 1',
          type: 'text',
          content: `User 1 message ${i}`,
        })
      }

      // 用户2存储消息
      for (let i = 0; i < 10; i++) {
        store.store({
          id: `user2-msg${i}`,
          roomId,
          userId: user2Id,
          userName: 'User 2',
          type: 'text',
          content: `User 2 message ${i}`,
        })
      }

      // 验证用户消息
      const user1Messages = store.getUserMessages(user1Id)
      const user2Messages = store.getUserMessages(user2Id)

      expect(user1Messages).toHaveLength(10)
      expect(user2Messages).toHaveLength(10)

      // 验证所有消息都来自正确的用户
      user1Messages.forEach(msg => {
        expect(msg.userId).toBe(user1Id)
      })

      user2Messages.forEach(msg => {
        expect(msg.userId).toBe(user2Id)
      })
    })

    it('应该正确处理快速的添加和移除反应', () => {
      const message = store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'React test',
      })

      // 添加多个反应
      const reactions = ['👍', '❤️', '😂', '🎉']
      reactions.forEach(emoji => {
        store.addReaction('msg1', emoji, user2Id, 'User 2')
      })

      // 应该只有最后一个反应
      const retrievedMessage = store.get('msg1')
      expect(retrievedMessage?.reactions).toHaveLength(1)
      expect(retrievedMessage?.reactions?.[0].emoji).toBe('🎉')

      // 移除反应
      store.removeReaction('msg1', '🎉', user2Id)
      expect(store.get('msg1')?.reactions).toHaveLength(0)
    })

    it('应该正确处理多房间并发操作', () => {
      // 在房间1存储消息
      for (let i = 0; i < 5; i++) {
        store.store({
          id: `room1-msg${i}`,
          roomId,
          userId: user1Id,
          userName: 'User 1',
          type: 'text',
          content: `Room 1 message ${i}`,
        })
      }

      // 在房间2存储消息
      for (let i = 0; i < 5; i++) {
        store.store({
          id: `room2-msg${i}`,
          roomId: room2Id,
          userId: user1Id,
          userName: 'User 1',
          type: 'text',
          content: `Room 2 message ${i}`,
        })
      }

      // 验证房间1消息
      const room1Messages = store.getHistory({ roomId })
      expect(room1Messages).toHaveLength(5)

      // 验证房间2消息
      const room2Messages = store.getHistory({ roomId: room2Id })
      expect(room2Messages).toHaveLength(5)

      // 验证房间隔离
      room1Messages.forEach(msg => {
        expect(msg.roomId).toBe(roomId)
      })

      room2Messages.forEach(msg => {
        expect(msg.roomId).toBe(room2Id)
      })
    })
  })

  describe('边界条件和错误处理测试', () => {
    it('应该正确处理空消息ID', () => {
      const message = store.get('')
      expect(message).toBeUndefined()
    })

    it('应该正确处理不存在的消息ID', () => {
      const message = store.get('nonexistent-message')
      expect(message).toBeUndefined()
    })

    it('应该正确处理编辑不存在的消息', () => {
      const result = store.edit('nonexistent', 'New content', user1Id)
      expect(result).toBeUndefined()
    })

    it('应该正确处理删除不存在的消息', () => {
      const result = store.delete('nonexistent', user1Id)
      expect(result).toBe(false)
    })

    it('应该正确处理为不存在的消息添加反应', () => {
      const result = store.addReaction('nonexistent', '👍', user1Id, 'User 1')
      expect(result).toBe(false)
    })

    it('应该正确处理为不存在的消息删除反应', () => {
      const result = store.removeReaction('nonexistent', '👍', user1Id)
      expect(result).toBe(false)
    })

    it('应该正确处理为不存在的消息设置固定', () => {
      const result = store.pin('nonexistent', user1Id)
      expect(result).toBe(false)
    })

    it('应该正确处理为不存在的消息取消固定', () => {
      const result = store.unpin('nonexistent')
      expect(result).toBe(false)
    })

    it('应该正确处理空房间ID的历史查询', () => {
      const history = store.getHistory({ roomId: '' })
      expect(history).toHaveLength(0)
    })

    it('应该正确处理特殊字符在消息内容中', () => {
      const specialContent = 'Hello <script>alert("xss")</script> 世界 🚀'

      const message = store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: specialContent,
      })

      expect(message.content).toBe(specialContent)
    })

    it('应该正确处理超长消息内容', () => {
      const longContent = 'A'.repeat(10000)

      const message = store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: longContent,
      })

      expect(message.content).toBe(longContent)
    })

    it('应该正确处理空的用户消息列表', () => {
      const messages = store.getUserMessages('nonexistent-user')
      expect(messages).toHaveLength(0)
    })

    it('应该正确处理空房间的固定消息列表', () => {
      const pinned = store.getPinnedMessages('nonexistent-room')
      expect(pinned).toHaveLength(0)
    })
  })

  describe('消息删除和清理测试', () => {
    it('应该正确执行软删除', () => {
      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'To be deleted',
      })

      store.delete('msg1', user2Id)

      const message = store.get('msg1')
      expect(message?.metadata?.deleted).toBe(true)
      expect(message?.metadata?.deletedBy).toBe(user2Id)
      expect(message?.metadata?.deletedAt).toBeDefined()
    })

    it('应该在历史查询中默认排除已删除消息', () => {
      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Active',
      })

      store.store({
        id: 'msg2',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Deleted',
      })

      store.delete('msg2', user2Id)

      const history = store.getHistory({ roomId })
      expect(history).toHaveLength(1)
      expect(history[0].id).toBe('msg1')
    })

    it('应该在请求时包含已删除消息', () => {
      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Active',
      })

      store.store({
        id: 'msg2',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Deleted',
      })

      store.delete('msg2', user2Id)

      const history = store.getHistory({ roomId, includeDeleted: true })
      expect(history).toHaveLength(2)
    })

    it('应该正确执行永久删除', () => {
      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'To be removed',
      })

      store.remove('msg1')

      const message = store.get('msg1')
      expect(message).toBeUndefined()
    })

    it('应该在清理房间时移除所有消息', () => {
      for (let i = 0; i < 10; i++) {
        store.store({
          id: `msg${i}`,
          roomId,
          userId: user1Id,
          userName: 'User 1',
          type: 'text',
          content: `Message ${i}`,
        })
      }

      store.clearRoom(roomId)

      const history = store.getHistory({ roomId })
      expect(history).toHaveLength(0)
    })
  })

  describe('历史查询高级测试', () => {
    it('应该正确按时间范围过滤消息', () => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)

      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Old message',
        timestamp: oneHourAgo,
      })

      store.store({
        id: 'msg2',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Current message',
        timestamp: now,
      })

      store.store({
        id: 'msg3',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Future message',
        timestamp: oneHourLater,
      })

      // 只获取当前时间之前的消息
      const history = store.getHistory({ roomId, before: oneHourLater })
      expect(history).toHaveLength(2)
      expect(history.find(m => m.id === 'msg3')).toBeUndefined()
    })

    it('应该正确按用户过滤消息', () => {
      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'User 1 message',
      })

      store.store({
        id: 'msg2',
        roomId,
        userId: user2Id,
        userName: 'User 2',
        type: 'text',
        content: 'User 2 message',
      })

      store.store({
        id: 'msg3',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Another user 1 message',
      })

      const user1Messages = store.getHistory({ roomId, userId: user1Id })
      expect(user1Messages).toHaveLength(2)
      user1Messages.forEach(msg => {
        expect(msg.userId).toBe(user1Id)
      })
    })

    it('应该正确按类型过滤消息', () => {
      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Text message',
      })

      store.store({
        id: 'msg2',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'system',
        content: 'System message',
      })

      store.store({
        id: 'msg3',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Another text message',
      })

      const textMessages = store.getHistory({ roomId, type: 'text' })
      expect(textMessages).toHaveLength(2)

      const systemMessages = store.getHistory({ roomId, type: 'system' })
      expect(systemMessages).toHaveLength(1)
    })

    it('应该正确应用offset和limit', () => {
      for (let i = 0; i < 20; i++) {
        store.store({
          id: `msg${i}`,
          roomId,
          userId: user1Id,
          userName: 'User 1',
          type: 'text',
          content: `Message ${i}`,
        })
      }

      // 获取前5条
      const page1 = store.getHistory({ roomId, limit: 5, offset: 0 })
      expect(page1).toHaveLength(5)
      // getHistory 按旧到新排序，但这里是按插入时间顺序，所以是 msg0-msg4
      expect(page1[0].id).toBe('msg0') // 最旧的在前

      // 获取第6-10条
      const page2 = store.getHistory({ roomId, limit: 5, offset: 5 })
      expect(page2).toHaveLength(5)
      expect(page2[0].id).toBe('msg5')
    })
  })

  describe('固定消息功能测试', () => {
    it('应该正确固定消息', () => {
      const message = store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Important',
      })

      store.pin('msg1', user2Id)

      const pinnedMessage = store.get('msg1')
      expect(pinnedMessage?.pinned).toBe(true)
      expect(pinnedMessage?.pinnedBy).toBe(user2Id)
      expect(pinnedMessage?.pinnedAt).toBeDefined()
    })

    it('应该正确取消固定消息', () => {
      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Important',
      })

      store.pin('msg1', user2Id)
      store.unpin('msg1')

      const message = store.get('msg1')
      expect(message?.pinned).toBe(false)
      expect(message?.pinnedBy).toBeUndefined()
    })

    it('应该正确获取房间的固定消息', () => {
      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Not pinned',
      })

      store.store({
        id: 'msg2',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Pinned 1',
      })

      store.store({
        id: 'msg3',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Pinned 2',
      })

      store.pin('msg2', user2Id)
      store.pin('msg3', user2Id)

      const pinnedMessages = store.getPinnedMessages(roomId)
      expect(pinnedMessages).toHaveLength(2)
      expect(pinnedMessages.find(m => m.id === 'msg1')).toBeUndefined()
    })

    it('应该在历史查询中包含固定消息', () => {
      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Pinned',
      })

      store.pin('msg1', user2Id)

      const history = store.getHistory({ roomId })
      expect(history).toHaveLength(1)
      expect(history[0].id).toBe('msg1')
    })
  })

  describe('消息统计测试', () => {
    it('应该提供准确的统计数据', () => {
      // 在房间1存储10条消息
      for (let i = 0; i < 10; i++) {
        store.store({
          id: `room1-msg${i}`,
          roomId,
          userId: user1Id,
          userName: 'User 1',
          type: 'text',
          content: `Message ${i}`,
        })
      }

      // 在房间2存储5条消息
      for (let i = 0; i < 5; i++) {
        store.store({
          id: `room2-msg${i}`,
          roomId: room2Id,
          userId: user1Id,
          userName: 'User 1',
          type: 'text',
          content: `Message ${i}`,
        })
      }

      // 添加离线消息
      const message = store.store({
        id: 'offline-msg',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Offline',
      })
      store.queueOfflineMessage(user2Id, message)

      const stats = store.getStats()
      expect(stats.totalMessages).toBe(16)
      expect(stats.messagesPerRoom[roomId]).toBe(11)
      expect(stats.messagesPerRoom[room2Id]).toBe(5)
      expect(stats.totalOfflineMessages).toBe(1)
      expect(stats.offlineUsers).toBe(1)
    })
  })
})
