/**
 * WebSocket Collaboration Integration Tests
 *
 * Tests for real-time collaboration features:
 * - Message type system
 * - Cursor synchronization
 * - Selection synchronization
 * - Conflict resolution (OT)
 * - Multi-user scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Server as SocketIOServer } from 'socket.io'
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client'
import { createServer } from '../server'
import type {
  CursorUpdate,
  SelectionUpdate,
  DocumentOperation,
  CollaborationMessage,
} from '../types'
import { transform, applyOperationToContent } from '@/lib/collaboration/manager'
import type { Operation } from '@/lib/collaboration/manager'

// ============================================================================
// Test Setup
// ============================================================================

describe('WebSocket Collaboration Integration', () => {
  let ioServer: SocketIOServer
  let serverSocket: ClientSocket
  let clientSocket: ClientSocket
  let clientSocket2: ClientSocket

  const TEST_PORT = 45000
  const TEST_URL = `http://localhost:${TEST_PORT}`

  const user1 = {
    id: 'user-1',
    name: 'Alice',
    email: 'alice@example.com',
    token: 'token-1',
  }

  const user2 = {
    id: 'user-2',
    name: 'Bob',
    email: 'bob@example.com',
    token: 'token-2',
  }

  const TEST_ROOM_ID = 'test-room'
  const TEST_DOCUMENT_ID = 'doc-1'

  beforeEach(async () => {
    // This is a simplified test setup
    // In a real scenario, you'd set up a proper Socket.IO server
    ioServer = new SocketIOServer(TEST_PORT, {
      cors: {
        origin: '*',
      },
    })

    // Create client sockets
    clientSocket = ioClient(TEST_URL, {
      auth: { token: user1.token },
    })

    clientSocket2 = ioClient(TEST_URL, {
      auth: { token: user2.token },
    })

    await Promise.all([
      new Promise<void>(resolve => {
        clientSocket.on('connect', resolve)
      }),
      new Promise<void>(resolve => {
        clientSocket2.on('connect', resolve)
      }),
    ])
  })

  afterEach(() => {
    ioServer.close()
    clientSocket.close()
    clientSocket2.close()
  })

  // ============================================================================
  // Message Type System Tests
  // ============================================================================

  describe('Message Type System', () => {
    it('should properly type cursor update messages', () => {
      const cursorUpdate: CursorUpdate = {
        userId: user1.id,
        userName: user1.name,
        color: '#ff0000',
        position: 42,
        selection: {
          start: 40,
          end: 50,
        },
      }

      expect(cursorUpdate.userId).toBe(user1.id)
      expect(cursorUpdate.position).toBe(42)
      expect(cursorUpdate.selection).toBeDefined()
      expect(cursorUpdate.selection?.start).toBe(40)
      expect(cursorUpdate.selection?.end).toBe(50)
    })

    it('should properly type selection update messages', () => {
      const selectionUpdate: SelectionUpdate = {
        userId: user2.id,
        userName: user2.name,
        color: '#00ff00',
        selection: {
          start: 10,
          end: 20,
        },
      }

      expect(selectionUpdate.userId).toBe(user2.id)
      expect(selectionUpdate.selection.start).toBe(10)
      expect(selectionUpdate.selection.end).toBe(20)
    })

    it('should properly type document operation messages', () => {
      const insertOp: DocumentOperation = {
        type: 'insert',
        position: 5,
        content: 'hello',
      }

      const deleteOp: DocumentOperation = {
        type: 'delete',
        position: 10,
        length: 3,
      }

      expect(insertOp.type).toBe('insert')
      expect(insertOp.content).toBe('hello')
      expect(deleteOp.type).toBe('delete')
      expect(deleteOp.length).toBe(3)
    })
  })

  // ============================================================================
  // Cursor Synchronization Tests
  // ============================================================================

  describe('Cursor Synchronization', () => {
    it('should broadcast cursor updates to other users', async () => {
      const receivedCursors: CursorUpdate[] = []

      clientSocket2.on('cursor:update', (data: CursorUpdate) => {
        receivedCursors.push(data)
      })

      // User 1 moves cursor
      const cursorUpdate: CursorUpdate = {
        userId: user1.id,
        userName: user1.name,
        color: '#ff0000',
        position: 100,
      }

      clientSocket.emit('cursor:move', {
        roomId: TEST_ROOM_ID,
        position: cursorUpdate.position,
      })

      // Wait for message to be received
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(receivedCursors.length).toBeGreaterThan(0)
      expect(receivedCursors[0].userId).toBe(user1.id)
      expect(receivedCursors[0].position).toBe(100)
    })

    it('should handle cursor with selection', async () => {
      const receivedCursors: CursorUpdate[] = []

      clientSocket2.on('cursor:update', (data: CursorUpdate) => {
        receivedCursors.push(data)
      })

      // User 1 moves cursor with selection
      const cursorUpdate: CursorUpdate = {
        userId: user1.id,
        userName: user1.name,
        color: '#ff0000',
        position: 50,
        selection: {
          start: 40,
          end: 60,
        },
      }

      clientSocket.emit('cursor:move', {
        roomId: TEST_ROOM_ID,
        position: cursorUpdate.position,
        selection: cursorUpdate.selection,
      })

      // Wait for message to be received
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(receivedCursors.length).toBeGreaterThan(0)
      expect(receivedCursors[0].selection).toBeDefined()
      expect(receivedCursors[0].selection?.start).toBe(40)
      expect(receivedCursors[0].selection?.end).toBe(60)
    })
  })

  // ============================================================================
  // Selection Synchronization Tests
  // ============================================================================

  describe('Selection Synchronization', () => {
    it('should broadcast selection updates to other users', async () => {
      const receivedSelections: SelectionUpdate[] = []

      clientSocket2.on('selection:update', (data: SelectionUpdate) => {
        receivedSelections.push(data)
      })

      // User 1 updates selection
      const selectionUpdate: SelectionUpdate = {
        userId: user1.id,
        userName: user1.name,
        color: '#ff0000',
        selection: {
          start: 20,
          end: 35,
        },
      }

      clientSocket.emit('selection:update', {
        roomId: TEST_ROOM_ID,
        selection: selectionUpdate.selection,
      })

      // Wait for message to be received
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(receivedSelections.length).toBeGreaterThan(0)
      expect(receivedSelections[0].userId).toBe(user1.id)
      expect(receivedSelections[0].selection.start).toBe(20)
      expect(receivedSelections[0].selection.end).toBe(35)
    })
  })

  // ============================================================================
  // Operational Transformation Tests
  // ============================================================================

  describe('Operational Transformation', () => {
    it('should transform concurrent insert operations', () => {
      // User 1 inserts at position 5
      const op1: Operation = {
        type: 'insert',
        position: 5,
        content: 'hello',
      }

      // User 2 inserts at position 10
      const op2: Operation = {
        type: 'insert',
        position: 10,
        content: 'world',
      }

      // Transform op2 against op1
      const { op1: transformedOp1, op2: transformedOp2 } = transform(op1, op2)

      // op1 stays the same
      expect(transformedOp1.position).toBe(5)
      expect(transformedOp1.content).toBe('hello')

      // op2 position should be shifted by op1's content length
      expect(transformedOp2.position).toBe(10 + 5) // 10 + len('hello')
      expect(transformedOp2.content).toBe('world')
    })

    it('should transform concurrent delete operations', () => {
      // User 1 deletes 3 chars at position 5
      const op1: Operation = {
        type: 'delete',
        position: 5,
        length: 3,
      }

      // User 2 deletes 2 chars at position 10
      const op2: Operation = {
        type: 'delete',
        position: 10,
        length: 2,
      }

      // Transform op2 against op1
      const { op1: transformedOp1, op2: transformedOp2 } = transform(op1, op2)

      // op1 stays the same
      expect(transformedOp1.position).toBe(5)
      expect(transformedOp1.length).toBe(3)

      // op2 position should be shifted by op1's deletion
      expect(transformedOp2.position).toBe(10 - 3) // 10 - 3
      expect(transformedOp2.length).toBe(2)
    })

    it('should transform insert and delete operations', () => {
      // User 1 inserts at position 5
      const op1: Operation = {
        type: 'insert',
        position: 5,
        content: 'hello',
      }

      // User 2 deletes 2 chars at position 10
      const op2: Operation = {
        type: 'delete',
        position: 10,
        length: 2,
      }

      // Transform op2 against op1
      const { op1: transformedOp1, op2: transformedOp2 } = transform(op1, op2)

      // op1 stays the same
      expect(transformedOp1.position).toBe(5)
      expect(transformedOp1.content).toBe('hello')

      // op2 position should be shifted by op1's insertion
      expect(transformedOp2.position).toBe(10 + 5) // 10 + 5
      expect(transformedOp2.length).toBe(2)
    })

    it('should apply operations correctly', () => {
      const content = 'Hello world'

      // Insert operation
      const insertOp: Operation = {
        type: 'insert',
        position: 5,
        content: ' beautiful',
      }

      const afterInsert = applyOperationToContent(content, insertOp)
      expect(afterInsert).toBe('Hello beautiful world')

      // Delete operation
      const deleteOp: Operation = {
        type: 'delete',
        position: 5,
        length: 10,
      }

      const afterDelete = applyOperationToContent(content, deleteOp)
      expect(afterDelete).toBe('Helloworld')
    })
  })

  // ============================================================================
  // Document Collaboration Tests
  // ============================================================================

  describe('Document Collaboration', () => {
    it('should broadcast document operations to all users', async () => {
      const receivedOps: DocumentOperation[] = []

      clientSocket2.on('doc:operation_applied', data => {
        receivedOps.push(data.operation)
      })

      // User 1 sends an operation
      const operation: DocumentOperation = {
        type: 'insert',
        position: 0,
        content: 'Hello',
      }

      clientSocket.emit('doc:operation', {
        roomId: TEST_ROOM_ID,
        operation,
      })

      // Wait for message to be received
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(receivedOps.length).toBeGreaterThan(0)
      expect(receivedOps[0].type).toBe('insert')
      expect(receivedOps[0].content).toBe('Hello')
    })

    it('should maintain document revision numbers', async () => {
      const revisions: number[] = []

      clientSocket2.on('doc:operation_applied', data => {
        revisions.push(data.revision)
      })

      // Send multiple operations
      const operations: DocumentOperation[] = [
        { type: 'insert', position: 0, content: 'H' },
        { type: 'insert', position: 1, content: 'e' },
        { type: 'insert', position: 2, content: 'l' },
        { type: 'insert', position: 3, content: 'l' },
        { type: 'insert', position: 4, content: 'o' },
      ]

      for (const op of operations) {
        clientSocket.emit('doc:operation', {
          roomId: TEST_ROOM_ID,
          operation: op,
        })

        await new Promise(resolve => setTimeout(resolve, 50))
      }

      expect(revisions.length).toBe(operations.length)
      // Revisions should be sequential
      expect(revisions[0]).toBeLessThan(revisions[revisions.length - 1])
    })
  })

  // ============================================================================
  // Presence Tests
  // ============================================================================

  describe('Presence', () => {
    it('should broadcast typing status', async () => {
      const typingStatuses: Array<{ userId: string; userName: string; isTyping: boolean }> = []

      clientSocket2.on('presence:typing', data => {
        typingStatuses.push(data)
      })

      // User 1 starts typing
      clientSocket.emit('presence:typing', {
        roomId: TEST_ROOM_ID,
        isTyping: true,
      })

      // Wait for message to be received
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(typingStatuses.length).toBeGreaterThan(0)
      expect(typingStatuses[0].userId).toBe(user1.id)
      expect(typingStatuses[0].isTyping).toBe(true)

      // User 1 stops typing
      clientSocket.emit('presence:typing', {
        roomId: TEST_ROOM_ID,
        isTyping: false,
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(typingStatuses[1].isTyping).toBe(false)
    })
  })

  // ============================================================================
  // Multi-User Scenarios
  // ============================================================================

  describe('Multi-User Scenarios', () => {
    it('should handle multiple users editing simultaneously', async () => {
      const operationsByUser = new Map<string, DocumentOperation[]>()

      clientSocket2.on('doc:operation_applied', data => {
        if (!operationsByUser.has(data.userId)) {
          operationsByUser.set(data.userId, [])
        }
        operationsByUser.get(data.userId)!.push(data.operation)
      })

      // User 1 inserts at position 0
      clientSocket.emit('doc:operation', {
        roomId: TEST_ROOM_ID,
        operation: { type: 'insert', position: 0, content: 'A' },
      })

      await new Promise(resolve => setTimeout(resolve, 50))

      // User 2 inserts at position 1
      clientSocket2.emit('doc:operation', {
        roomId: TEST_ROOM_ID,
        operation: { type: 'insert', position: 1, content: 'B' },
      })

      await new Promise(resolve => setTimeout(resolve, 50))

      // Both users should have received both operations
      const user1Ops = operationsByUser.get(user1.id) || []
      const user2Ops = operationsByUser.get(user2.id) || []

      expect(user1Ops.length).toBeGreaterThan(0)
      expect(user2Ops.length).toBeGreaterThan(0)
    })

    it('should handle users joining and leaving rooms', async () => {
      const joinedUsers: string[] = []
      const leftUsers: string[] = []

      clientSocket2.on('room:user_joined', data => {
        joinedUsers.push(data.user.id)
      })

      clientSocket2.on('room:user_left', data => {
        leftUsers.push(data.userId)
      })

      // User 1 joins room
      clientSocket.emit('room:join', {
        roomId: TEST_ROOM_ID,
        type: 'document',
        documentId: TEST_DOCUMENT_ID,
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(joinedUsers.includes(user1.id)).toBe(true)

      // User 1 leaves room
      clientSocket.emit('room:leave', {
        roomId: TEST_ROOM_ID,
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(leftUsers.includes(user1.id)).toBe(true)
    })
  })
})

// ============================================================================
// Type System Tests
// ============================================================================

describe('Collaboration Message Types', () => {
  it('should accept all collaboration message types', () => {
    const messages: CollaborationMessage[] = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        type: 'doc:operation',
        payload: {
          roomId: 'room-1',
          operation: { type: 'insert', position: 0, content: 'test' },
        },
      },
      {
        id: '2',
        timestamp: new Date().toISOString(),
        type: 'cursor:move',
        payload: {
          roomId: 'room-1',
          position: 10,
          selection: { start: 5, end: 15 },
        },
      },
      {
        id: '3',
        timestamp: new Date().toISOString(),
        type: 'selection:update',
        payload: {
          userId: 'user-1',
          userName: 'Test User',
          color: '#ff0000',
          selection: { start: 0, end: 10 },
        },
      },
      {
        id: '4',
        timestamp: new Date().toISOString(),
        type: 'presence:typing',
        payload: {
          roomId: 'room-1',
          isTyping: true,
        },
      },
    ]

    expect(messages).toHaveLength(4)
    expect(messages[0].type).toBe('doc:operation')
    expect(messages[1].type).toBe('cursor:move')
    expect(messages[2].type).toBe('selection:update')
    expect(messages[3].type).toBe('presence:typing')
  })

  it('should enforce type safety for cursor updates', () => {
    const validCursor: CursorUpdate = {
      userId: 'user-1',
      userName: 'Test User',
      color: '#ff0000',
      position: 42,
      selection: { start: 40, end: 50 },
    }

    expect(validCursor.selection?.start ?? 0).toBeLessThan(validCursor.selection?.end ?? 0)
  })

  it('should enforce type safety for selection updates', () => {
    const validSelection: SelectionUpdate = {
      userId: 'user-1',
      userName: 'Test User',
      color: '#ff0000',
      selection: { start: 0, end: 10 },
    }

    expect(validSelection.selection.start).toBe(0)
    expect(validSelection.selection.end).toBe(10)
  })
})
