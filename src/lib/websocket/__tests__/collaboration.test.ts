/**
 * WebSocket Collaboration Feature Tests
 *
 * Tests for:
 * - Cursor synchronization
 * - Selection synchronization
 * - Document operations
 * - Operational Transformation
 * - Multi-user scenarios
 */

import { describe, it, expect } from 'vitest'
import type {
  CursorUpdate,
  SelectionUpdate,
  DocumentOperation as WebSocketDocumentOperation,
  DocumentState as WebSocketDocumentState,
  CollaborationMessage,
} from '../types'
import type { Operation, DocumentState } from '@/lib/collaboration/manager'
import { transform, applyOperationToContent, composeOperations } from '@/lib/collaboration/manager'

// ============================================================================
// Cursor Synchronization Tests
// ============================================================================

describe('Cursor Synchronization', () => {
  it('should create valid cursor update messages', () => {
    const cursorUpdate: CursorUpdate = {
      userId: 'user-123',
      userName: 'Alice',
      color: '#ef4444',
      position: 42,
      selection: {
        start: 40,
        end: 50,
      },
    }

    expect(cursorUpdate.userId).toBe('user-123')
    expect(cursorUpdate.position).toBe(42)
    expect(cursorUpdate.selection?.start).toBe(40)
    expect(cursorUpdate.selection?.end).toBe(50)
    expect(cursorUpdate.color).toMatch(/^#[0-9a-fA-F]{6}$/)
  })

  it('should handle cursor without selection', () => {
    const cursorUpdate: CursorUpdate = {
      userId: 'user-456',
      userName: 'Bob',
      color: '#3b82f6',
      position: 100,
    }

    expect(cursorUpdate.selection).toBeUndefined()
    expect(cursorUpdate.position).toBe(100)
  })

  it('should validate selection boundaries', () => {
    const cursorUpdate: CursorUpdate = {
      userId: 'user-789',
      userName: 'Charlie',
      color: '#10b981',
      position: 50,
      selection: {
        start: 20,
        end: 30,
      },
    }

    expect(cursorUpdate.selection?.start ?? 0).toBeLessThan(cursorUpdate.selection?.end ?? 0)
  })

  it('should handle reversed selection', () => {
    const cursorUpdate: CursorUpdate = {
      userId: 'user-101',
      userName: 'Diana',
      color: '#f59e0b',
      position: 30,
      selection: {
        start: 30,
        end: 20, // Reversed
      },
    }

    // In production, you might want to normalize this
    expect(cursorUpdate.selection).toBeDefined()
  })
})

// ============================================================================
// Selection Synchronization Tests
// ============================================================================

describe('Selection Synchronization', () => {
  it('should create valid selection update messages', () => {
    const selectionUpdate: SelectionUpdate = {
      userId: 'user-123',
      userName: 'Alice',
      color: '#ef4444',
      selection: {
        start: 10,
        end: 25,
      },
    }

    expect(selectionUpdate.userId).toBe('user-123')
    expect(selectionUpdate.selection.start).toBe(10)
    expect(selectionUpdate.selection.end).toBe(25)
  })

  it('should handle zero-length selection', () => {
    const selectionUpdate: SelectionUpdate = {
      userId: 'user-456',
      userName: 'Bob',
      color: '#3b82f6',
      selection: {
        start: 15,
        end: 15,
      },
    }

    expect(selectionUpdate.selection.start).toBe(selectionUpdate.selection.end)
  })

  it('should handle full document selection', () => {
    const selectionUpdate: SelectionUpdate = {
      userId: 'user-789',
      userName: 'Charlie',
      color: '#10b981',
      selection: {
        start: 0,
        end: 1000,
      },
    }

    expect(selectionUpdate.selection.start).toBe(0)
    expect(selectionUpdate.selection.end).toBe(1000)
  })
})

// ============================================================================
// Document Operation Tests
// ============================================================================

describe('Document Operations', () => {
  it('should create valid insert operation', () => {
    const operation: Operation = {
      type: 'insert',
      position: 5,
      content: 'hello',
    }

    expect(operation.type).toBe('insert')
    expect(operation.position).toBe(5)
    expect(operation.content).toBe('hello')
  })

  it('should create valid delete operation', () => {
    const operation: Operation = {
      type: 'delete',
      position: 10,
      length: 3,
    }

    expect(operation.type).toBe('delete')
    expect(operation.position).toBe(10)
    expect(operation.length).toBe(3)
  })

  it('should create valid retain operation', () => {
    const operation: Operation = {
      type: 'retain',
      position: 0,
    }

    expect(operation.type).toBe('retain')
    expect(operation.position).toBe(0)
  })

  it('should apply insert operation to document', () => {
    const content = 'Hello world'
    const operation: Operation = {
      type: 'insert',
      position: 5,
      content: ' beautiful',
    }

    const result = applyOperationToContent(content, operation)

    expect(result).toBe('Hello beautiful world')
  })

  it('should apply delete operation to document', () => {
    const content = 'Hello beautiful world'
    const operation: Operation = {
      type: 'delete',
      position: 5,
      length: 10,
    }

    const result = applyOperationToContent(content, operation)

    expect(result).toBe('Hello world')
  })

  it('should apply retain operation to document', () => {
    const content = 'Hello world'
    const operation: Operation = {
      type: 'retain',
      position: 0,
    }

    const result = applyOperationToContent(content, operation)

    expect(result).toBe(content)
  })

  it('should handle insert at beginning', () => {
    const content = 'world'
    const operation: Operation = {
      type: 'insert',
      position: 0,
      content: 'Hello ',
    }

    const result = applyOperationToContent(content, operation)

    expect(result).toBe('Hello world')
  })

  it('should handle insert at end', () => {
    const content = 'Hello'
    const operation: Operation = {
      type: 'insert',
      position: 5,
      content: ' world',
    }

    const result = applyOperationToContent(content, operation)

    expect(result).toBe('Hello world')
  })
})

// ============================================================================
// Operational Transformation Tests
// ============================================================================

describe('Operational Transformation', () => {
  it('should transform concurrent insert operations', () => {
    const op1: Operation = {
      type: 'insert',
      position: 5,
      content: 'hello',
    }

    const op2: Operation = {
      type: 'insert',
      position: 10,
      content: 'world',
    }

    const { op1: transformedOp1, op2: transformedOp2 } = transform(op1, op2)

    // op1 stays the same
    expect(transformedOp1.position).toBe(5)
    expect(transformedOp1.content).toBe('hello')

    // op2 position shifts by op1's content length
    expect(transformedOp2.position).toBe(15) // 10 + 5
    expect(transformedOp2.content).toBe('world')
  })

  it('should transform concurrent delete operations', () => {
    const op1: Operation = {
      type: 'delete',
      position: 5,
      length: 3,
    }

    const op2: Operation = {
      type: 'delete',
      position: 10,
      length: 2,
    }

    const { op1: transformedOp1, op2: transformedOp2 } = transform(op1, op2)

    // op1 stays the same
    expect(transformedOp1.position).toBe(5)
    expect(transformedOp1.length).toBe(3)

    // op2 position shifts back by op1's deletion length
    expect(transformedOp2.position).toBe(7) // 10 - 3
    expect(transformedOp2.length).toBe(2)
  })

  it('should transform insert and delete', () => {
    const op1: Operation = {
      type: 'insert',
      position: 5,
      content: 'hello',
    }

    const op2: Operation = {
      type: 'delete',
      position: 10,
      length: 2,
    }

    const { op1: transformedOp1, op2: transformedOp2 } = transform(op1, op2)

    expect(transformedOp1.position).toBe(5)
    expect(transformedOp1.content).toBe('hello')

    expect(transformedOp2.position).toBe(15) // 10 + 5
    expect(transformedOp2.length).toBe(2)
  })

  it('should handle operations at same position', () => {
    const op1: Operation = {
      type: 'insert',
      position: 5,
      content: 'A',
    }

    const op2: Operation = {
      type: 'insert',
      position: 5,
      content: 'B',
    }

    const { op1: transformedOp1, op2: transformedOp2 } = transform(op1, op2)

    // Operations at same position - op1 first
    expect(transformedOp1.position).toBe(5)
    expect(transformedOp2.position).toBe(6) // op2 shifts by op1's length
  })

  it('should compose two operations', () => {
    const op1: Operation = {
      type: 'insert',
      position: 0,
      content: 'Hello',
    }

    const op2: Operation = {
      type: 'insert',
      position: 5,
      content: ' world',
    }

    const composed = composeOperations(op1, op2)

    expect(composed.type).toBe('insert')
    expect(composed.position).toBe(0)
    expect(composed.content).toBe('Hello world')
  })

  it('should compose operations with proper position adjustment', () => {
    const op1: Operation = {
      type: 'insert',
      position: 3,
      content: 'llo',
    }

    const op2: Operation = {
      type: 'insert',
      position: 0,
      content: 'He',
    }

    const composed = composeOperations(op2, op1)

    expect(composed.position).toBe(2) // op1 shifts by op2's length
  })
})

// ============================================================================
// Collaboration Message Tests
// ============================================================================

describe('Collaboration Messages', () => {
  it('should create valid cursor move message', () => {
    const message: CollaborationMessage = {
      id: 'msg-1',
      timestamp: new Date().toISOString(),
      type: 'cursor:move',
      roomId: 'room-123',
      userId: 'user-123',
      payload: {
        roomId: 'room-123',
        position: 42,
        selection: { start: 40, end: 50 },
      },
    }

    expect(message.type).toBe('cursor:move')
    expect(message.roomId).toBe('room-123')
    expect(message.userId).toBe('user-123')
  })

  it('should create valid document operation message', () => {
    const message: CollaborationMessage = {
      id: 'msg-2',
      timestamp: new Date().toISOString(),
      type: 'doc:operation',
      roomId: 'room-123',
      userId: 'user-123',
      payload: {
        roomId: 'room-123',
        operation: {
          type: 'insert',
          position: 0,
          content: 'Hello',
        },
      },
    }

    expect(message.type).toBe('doc:operation')
    expect((message.payload as { operation: { type: string } }).operation.type).toBe('insert')
  })

  it('should create valid selection update message', () => {
    const message: CollaborationMessage = {
      id: 'msg-3',
      timestamp: new Date().toISOString(),
      type: 'selection:update',
      roomId: 'room-123',
      userId: 'user-123',
      payload: {
        userId: 'user-123',
        userName: 'Alice',
        color: '#ef4444',
        selection: { start: 10, end: 20 },
      },
    }

    expect(message.type).toBe('selection:update')
    const payload = message.payload as SelectionUpdate
    expect(payload.selection.start).toBe(10)
  })

  it('should create valid presence typing message', () => {
    const message: CollaborationMessage = {
      id: 'msg-4',
      timestamp: new Date().toISOString(),
      type: 'presence:typing',
      roomId: 'room-123',
      userId: 'user-123',
      payload: {
        roomId: 'room-123',
        isTyping: true,
      },
    }

    expect(message.type).toBe('presence:typing')
    expect((message.payload as { isTyping: boolean })?.isTyping).toBe(true)
  })
})

// ============================================================================
// Document State Tests
// ============================================================================

describe('Document State', () => {
  it('should create valid document state', () => {
    const docState: DocumentState = {
      content: 'Hello world',
      revision: 5,
      operations: [],
    }

    expect(docState.content).toBe('Hello world')
    expect(docState.revision).toBe(5)
  })

  it('should increment revision numbers', () => {
    const docState1: DocumentState = {
      content: 'Hello',
      revision: 0,
      operations: [],
    }

    const docState2: DocumentState = {
      content: 'Hello world',
      revision: 1,
      operations: [],
    }

    expect(docState2.revision).toBeGreaterThan(docState1.revision)
  })

  it('should track content changes', () => {
    const initialState: DocumentState = {
      content: 'Hello',
      revision: 0,
      operations: [],
    }

    const operation: Operation = {
      type: 'insert',
      position: 5,
      content: ' world',
    }

    const newContent = applyOperationToContent(initialState.content, operation)

    const updatedState: DocumentState = {
      content: newContent,
      revision: initialState.revision + 1,
      operations: [],
    }

    expect(updatedState.content).toBe('Hello world')
    expect(updatedState.revision).toBe(1)
  })
})

// ============================================================================
// Multi-User Scenario Tests
// ============================================================================

describe('Multi-User Scenarios', () => {
  it('should handle two users editing same document', () => {
    const content = 'Hello world'

    // User 1 inserts at position 5
    const op1: Operation = {
      type: 'insert',
      position: 5,
      content: ' beautiful',
    }

    // User 2 inserts at position 10 (before transformation)
    const op2: Operation = {
      type: 'insert',
      position: 10,
      content: ' amazing',
    }

    // Transform op2 against op1
    const { op1: transformedOp1, op2: transformedOp2 } = transform(op1, op2)

    // Apply both operations
    let result = applyOperationToContent(content, transformedOp1)
    result = applyOperationToContent(result, transformedOp2)

    expect(result).toBe('Hello beautiful amazing world')
  })

  it('should handle three users editing concurrently', () => {
    const content = 'ABC'

    const op1: Operation = {
      type: 'insert',
      position: 1,
      content: 'X',
    }

    const op2: Operation = {
      type: 'insert',
      position: 2,
      content: 'Y',
    }

    const op3: Operation = {
      type: 'insert',
      position: 3,
      content: 'Z',
    }

    // Transform op2 against op1
    const { op1: t1, op2: t2 } = transform(op1, op2)

    // Transform op3 against t1 and t2
    const { op1: t3_op1, op2: t3_op2 } = transform(t1, op3)
    const { op2: t3 } = transform(t3_op2, t2)

    // Apply operations
    let result = applyOperationToContent(content, t1)
    result = applyOperationToContent(result, t3_op2)
    result = applyOperationToContent(result, t3)

    expect(result).toBe('AXY ZBC')
  })

  it('should handle conflicting deletions', () => {
    const content = 'Hello world'

    const op1: Operation = {
      type: 'delete',
      position: 0,
      length: 5,
    }

    const op2: Operation = {
      type: 'delete',
      position: 6,
      length: 5,
    }

    const { op1: transformedOp1, op2: transformedOp2 } = transform(op1, op2)

    let result = applyOperationToContent(content, transformedOp1)
    result = applyOperationToContent(result, transformedOp2)

    expect(result).toBe('')
  })
})

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe('Edge Cases', () => {
  it('should handle empty document', () => {
    const content = ''
    const operation: Operation = {
      type: 'insert',
      position: 0,
      content: 'Hello',
    }

    const result = applyOperationToContent(content, operation)

    expect(result).toBe('Hello')
  })

  it('should handle operation beyond document length', () => {
    const content = 'Hello'
    const operation: Operation = {
      type: 'insert',
      position: 100,
      content: ' world',
    }

    const result = applyOperationToContent(content, operation)

    // Should insert at end
    expect(result).toBe('Hello world')
  })

  it('should handle zero-length delete', () => {
    const content = 'Hello world'
    const operation: Operation = {
      type: 'delete',
      position: 5,
      length: 0,
    }

    const result = applyOperationToContent(content, operation)

    expect(result).toBe(content)
  })

  it('should handle empty insert', () => {
    const content = 'Hello'
    const operation: Operation = {
      type: 'insert',
      position: 5,
      content: '',
    }

    const result = applyOperationToContent(content, operation)

    expect(result).toBe(content)
  })
})
