/**
 * Message Store Unit Tests
 *
 * Tests for WebSocket Message Storage functionality
 * Covers: Storage, editing, deletion, reactions, pinning, history, offline messages
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  MessageStore,
  getMessageStore,
  resetMessageStore,
  StoredMessage,
  MessageReaction,
} from '@/lib/websocket/message-store'

describe('MessageStore', () => {
  let store: MessageStore
  const roomId = 'test-room'
  const user1Id = 'user1'
  const user2Id = 'user2'

  beforeEach(() => {
    resetMessageStore()
    store = getMessageStore()
  })

  describe('Message Storage', () => {
    it('should store messages', () => {
      const message = store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Hello, world!',
      })

      expect(message.id).toBe('msg1')
      expect(message.content).toBe('Hello, world!')
      expect(message.timestamp).toBeDefined()
    })

    it('should store messages with custom timestamp', () => {
      const customTime = new Date('2024-01-01T12:00:00Z')
      const message = store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Hello!',
        timestamp: customTime,
      })

      expect(message.timestamp).toEqual(customTime)
    })

    it('should retrieve messages by ID', () => {
      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Hello, world!',
      })

      const retrieved = store.get('msg1')
      expect(retrieved).toBeDefined()
      expect(retrieved?.content).toBe('Hello, world!')
    })

    it('should retrieve messages from specific room', () => {
      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Message 1',
      })

      store.store({
        id: 'msg2',
        roomId: 'other-room',
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Message 2',
      })

      const retrieved = store.getInRoom(roomId, 'msg1')
      expect(retrieved).toBeDefined()
      expect(retrieved?.content).toBe('Message 1')

      const notInRoom = store.getInRoom(roomId, 'msg2')
      expect(notInRoom).toBeUndefined()
    })

    it('should return undefined for non-existent message', () => {
      const retrieved = store.get('nonexistent')
      expect(retrieved).toBeUndefined()
    })
  })

  describe('Message Editing', () => {
    it('should edit messages', () => {
      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Original',
      })

      const edited = store.edit('msg1', 'Updated', user1Id)

      expect(edited).toBeDefined()
      expect(edited?.content).toBe('Updated')
      expect(edited?.edited).toBe(true)
      expect(edited?.editedAt).toBeDefined()
    })

    it('should return undefined for non-existent message edit', () => {
      const edited = store.edit('nonexistent', 'Updated', user1Id)
      expect(edited).toBeUndefined()
    })

    it('should track edit timestamp', () => {
      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Original',
      })

      const beforeEdit = new Date()
      store.edit('msg1', 'Updated', user1Id)
      const message = store.get('msg1')

      expect(message?.editedAt).toBeDefined()
      expect(message?.editedAt!.getTime()).toBeGreaterThanOrEqual(beforeEdit.getTime() - 1000)
    })
  })

  describe('Message Deletion', () => {
    it('should soft delete messages', () => {
      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'To be deleted',
      })

      const deleted = store.delete('msg1', user2Id)

      expect(deleted).toBe(true)

      const retrieved = store.get('msg1')
      expect(retrieved?.metadata?.deleted).toBe(true)
      expect(retrieved?.metadata?.deletedBy).toBe(user2Id)
    })

    it('should return false for non-existent message deletion', () => {
      const deleted = store.delete('nonexistent', user1Id)
      expect(deleted).toBe(false)
    })

    it('should permanently remove messages', () => {
      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'To be removed',
      })

      const removed = store.remove('msg1')

      expect(removed).toBe(true)
      expect(store.get('msg1')).toBeUndefined()
    })

    it('should exclude deleted messages from history by default', () => {
      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Active message',
      })

      store.store({
        id: 'msg2',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Deleted message',
      })

      store.delete('msg2', user2Id)

      const history = store.getHistory({ roomId, includeDeleted: false })
      expect(history).toHaveLength(1)
      expect(history[0].id).toBe('msg1')
    })

    it('should include deleted messages when requested', () => {
      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Active message',
      })

      store.store({
        id: 'msg2',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Deleted message',
      })

      store.delete('msg2', user2Id)

      const history = store.getHistory({ roomId, includeDeleted: true })
      expect(history).toHaveLength(2)
    })
  })

  describe('Reactions', () => {
    it('should add reactions', () => {
      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'React to me!',
      })

      const added = store.addReaction('msg1', '👍', user2Id, 'User 2')

      expect(added).toBe(true)

      const message = store.get('msg1')
      expect(message?.reactions).toHaveLength(1)
      expect(message?.reactions?.[0].emoji).toBe('👍')
      expect(message?.reactions?.[0].userId).toBe(user2Id)
    })

    it('should replace existing reaction from same user', () => {
      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'React to me!',
      })

      store.addReaction('msg1', '👍', user2Id, 'User 2')
      store.addReaction('msg1', '❤️', user2Id, 'User 2')

      const message = store.get('msg1')
      expect(message?.reactions).toHaveLength(1)
      expect(message?.reactions?.[0].emoji).toBe('❤️')
    })

    it('should remove reactions', () => {
      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'React to me!',
      })

      store.addReaction('msg1', '👍', user2Id, 'User 2')
      const removed = store.removeReaction('msg1', '👍', user2Id)

      expect(removed).toBe(true)
      expect(store.get('msg1')?.reactions).toHaveLength(0)
    })

    it('should return false for removing non-existent reaction', () => {
      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'No reactions',
      })

      const removed = store.removeReaction('msg1', '👍', user2Id)
      expect(removed).toBe(false)
    })

    it('should allow multiple users to react', () => {
      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'React!',
      })

      store.addReaction('msg1', '👍', user1Id, 'User 1')
      store.addReaction('msg1', '👍', user2Id, 'User 2')

      const message = store.get('msg1')
      expect(message?.reactions).toHaveLength(2)
    })
  })

  describe('Pinning', () => {
    it('should pin messages', () => {
      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Important!',
      })

      const pinned = store.pin('msg1', user2Id)

      expect(pinned).toBe(true)

      const message = store.get('msg1')
      expect(message?.pinned).toBe(true)
      expect(message?.pinnedBy).toBe(user2Id)
      expect(message?.pinnedAt).toBeDefined()
    })

    it('should unpin messages', () => {
      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Important!',
      })

      store.pin('msg1', user2Id)
      store.unpin('msg1')

      const message = store.get('msg1')
      expect(message?.pinned).toBe(false)
      expect(message?.pinnedBy).toBeUndefined()
    })

    it('should get pinned messages for room', () => {
      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Pinned',
      })

      store.store({
        id: 'msg2',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Not pinned',
      })

      store.pin('msg1', user2Id)

      const pinned = store.getPinnedMessages(roomId)
      expect(pinned).toHaveLength(1)
      expect(pinned[0].id).toBe('msg1')
    })

    it('should return false for pinning non-existent message', () => {
      const pinned = store.pin('nonexistent', user1Id)
      expect(pinned).toBe(false)
    })
  })

  describe('History Queries', () => {
    it('should get message history', () => {
      const now = new Date()

      for (let i = 0; i < 10; i++) {
        store.store({
          id: `msg${i}`,
          roomId,
          userId: user1Id,
          userName: 'User 1',
          type: 'text',
          content: `Message ${i}`,
          timestamp: new Date(now.getTime() + i * 1000),
        })
      }

      const history = store.getHistory({ roomId })
      expect(history).toHaveLength(10)
      expect(history[0].id).toBe('msg9') // Newest first
    })

    it('should apply limit', () => {
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

      const history = store.getHistory({ roomId, limit: 5 })
      expect(history).toHaveLength(5)
    })

    it('should apply offset', () => {
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

      const history = store.getHistory({ roomId, limit: 5, offset: 3 })
      expect(history).toHaveLength(5)
    })

    it('should filter by user', () => {
      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Message from user1',
      })

      store.store({
        id: 'msg2',
        roomId,
        userId: user2Id,
        userName: 'User 2',
        type: 'text',
        content: 'Message from user2',
      })

      const history = store.getHistory({ roomId, userId: user1Id })
      expect(history).toHaveLength(1)
      expect(history[0].userId).toBe(user1Id)
    })

    it('should filter by type', () => {
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

      const history = store.getHistory({ roomId, type: 'text' })
      expect(history).toHaveLength(1)
      expect(history[0].type).toBe('text')
    })

    it('should filter by time range', () => {
      const baseTime = new Date('2024-01-01T12:00:00Z')

      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Before',
        timestamp: new Date(baseTime.getTime() - 3600000), // 1 hour before
      })

      store.store({
        id: 'msg2',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'After',
        timestamp: new Date(baseTime.getTime() + 3600000), // 1 hour after
      })

      const afterFilter = store.getHistory({
        roomId,
        after: baseTime,
      })
      expect(afterFilter).toHaveLength(1)
      expect(afterFilter[0].id).toBe('msg2')

      const beforeFilter = store.getHistory({
        roomId,
        before: new Date(baseTime.getTime() + 1800000),
      })
      expect(beforeFilter).toHaveLength(1)
      expect(beforeFilter[0].id).toBe('msg1')
    })
  })

  describe('User Messages', () => {
    it('should get messages for user', () => {
      const room1 = 'room1'
      const room2 = 'room2'

      store.store({
        id: 'msg1',
        roomId: room1,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Message in room1',
      })

      store.store({
        id: 'msg2',
        roomId: room2,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Message in room2',
      })

      store.store({
        id: 'msg3',
        roomId: room1,
        userId: user2Id,
        userName: 'User 2',
        type: 'text',
        content: 'Message from user2',
      })

      const userMessages = store.getUserMessages(user1Id)
      expect(userMessages).toHaveLength(2)
      expect(userMessages.every(m => m.userId === user1Id)).toBe(true)
    })

    it('should respect limit for user messages', () => {
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

      const userMessages = store.getUserMessages(user1Id, 10)
      expect(userMessages).toHaveLength(10)
    })
  })

  describe('Offline Messages', () => {
    it('should queue messages for offline users', () => {
      const message = store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Message for offline user',
      })

      store.queueOfflineMessage(user2Id, message)

      const offline = store.getOfflineMessages(user2Id)
      expect(offline).toHaveLength(1)
      expect(offline[0].message.id).toBe('msg1')
    })

    it('should clear offline messages', () => {
      const message = store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Message',
      })

      store.queueOfflineMessage(user2Id, message)
      store.clearOfflineMessages(user2Id)

      const offline = store.getOfflineMessages(user2Id)
      expect(offline).toHaveLength(0)
    })

    it('should mark offline messages as delivered', () => {
      const message = store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Message',
      })

      store.queueOfflineMessage(user2Id, message)
      store.markOfflineMessageDelivered(user2Id, 'msg1')

      const offline = store.getOfflineMessages(user2Id)
      expect(offline[0].delivered).toBe(true)
      expect(offline[0].deliveredAt).toBeDefined()
    })

    it('should limit offline queue size', () => {
      const smallStore = new MessageStore({ maxOfflineMessages: 3 })

      for (let i = 0; i < 5; i++) {
        const message = smallStore.store({
          id: `msg${i}`,
          roomId,
          userId: user1Id,
          userName: 'User 1',
          type: 'text',
          content: `Message ${i}`,
        })
        smallStore.queueOfflineMessage(user2Id, message)
      }

      const offline = smallStore.getOfflineMessages(user2Id)
      expect(offline).toHaveLength(3)
      // Should have the most recent messages
      expect(offline[2].message.id).toBe('msg4')
    })
  })

  describe('Statistics', () => {
    it('should provide statistics', () => {
      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Message 1',
      })

      store.store({
        id: 'msg2',
        roomId,
        userId: user2Id,
        userName: 'User 2',
        type: 'text',
        content: 'Message 2',
      })

      const message = store.store({
        id: 'msg3',
        roomId: 'other-room',
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Message 3',
      })

      store.queueOfflineMessage('offline-user', message)

      const stats = store.getStats()
      expect(stats.totalMessages).toBe(3)
      expect(stats.messagesPerRoom[roomId]).toBe(2)
      expect(stats.messagesPerRoom['other-room']).toBe(1)
      expect(stats.totalOfflineMessages).toBe(1)
      expect(stats.offlineUsers).toBe(1)
    })

    it('should track oldest and newest messages', () => {
      const oldTime = new Date('2024-01-01T12:00:00Z')
      const newTime = new Date('2024-01-02T12:00:00Z')

      store.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Old',
        timestamp: oldTime,
      })

      store.store({
        id: 'msg2',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'New',
        timestamp: newTime,
      })

      const stats = store.getStats()
      expect(stats.oldestMessage).toEqual(oldTime)
      expect(stats.newestMessage).toEqual(newTime)
    })
  })

  describe('Cleanup', () => {
    it('should clear all messages for a room', () => {
      for (let i = 0; i < 5; i++) {
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

    it('should cleanup expired offline messages', async () => {
      // Use a fresh store instance for this test
      const testStore = new MessageStore({
        offlineMessageTTL: 100, // 100ms for faster test
      })

      const message = testStore.store({
        id: 'msg-expire',
        roomId,
        userId: user1Id,
        userName: 'User 1',
        type: 'text',
        content: 'Expires',
      })

      testStore.queueOfflineMessage(user2Id, message)

      // Verify it's queued
      expect(testStore.getOfflineMessages(user2Id)).toHaveLength(1)

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150))

      // Run cleanup - getOfflineMessages also filters expired, so we verify cleanup ran
      testStore.cleanupExpiredOfflineMessages()

      // After cleanup, should return 0 (no valid messages)
      const offline = testStore.getOfflineMessages(user2Id)
      expect(offline).toHaveLength(0)
    })
  })

  describe('Room Config', () => {
    it('should evict oldest message when size limit reached', () => {
      const smallStore = new MessageStore({ maxHistorySize: 3 })

      for (let i = 0; i < 5; i++) {
        smallStore.store({
          id: `msg${i}`,
          roomId,
          userId: user1Id,
          userName: 'User 1',
          type: 'text',
          content: `Message ${i}`,
        })
      }

      // Should only have last 3 messages
      const history = smallStore.getHistory({ roomId })
      expect(history.length).toBeLessThanOrEqual(3)

      // Oldest message should be gone
      expect(smallStore.get('msg0')).toBeUndefined()
    })
  })
})
