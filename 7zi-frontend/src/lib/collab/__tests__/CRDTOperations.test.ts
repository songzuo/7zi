/**
 * CRDTOperations Unit Tests
 *
 * Tests for CRDT (Conflict-free Replicated Data Types) operations
 *
 * @version 1.12.0
 */

import { describe, it, expect } from 'vitest'
import {
  CRDTOperations,
  VersionVector,
  LWWRegister,
  CRDTOperation,
  ConflictInfo,
} from '../CRDTOperations'

describe('CRDTOperations', () => {
  describe('Version Vector Operations', () => {
    it('should compare equal version vectors', () => {
      const a: VersionVector = { client1: 1, client2: 2 }
      const b: VersionVector = { client1: 1, client2: 2 }

      expect(CRDTOperations.compareVersionVectors(a, b)).toBe(0)
    })

    it('should detect when a is ahead of b', () => {
      const a: VersionVector = { client1: 2, client2: 2 }
      const b: VersionVector = { client1: 1, client2: 2 }

      expect(CRDTOperations.compareVersionVectors(a, b)).toBe(1)
    })

    it('should detect when a is behind b', () => {
      const a: VersionVector = { client1: 1, client2: 2 }
      const b: VersionVector = { client1: 2, client2: 2 }

      expect(CRDTOperations.compareVersionVectors(a, b)).toBe(-1)
    })

    it('should handle concurrent modifications', () => {
      const a: VersionVector = { client1: 2, client2: 1 }
      const b: VersionVector = { client1: 1, client2: 2 }

      expect(CRDTOperations.compareVersionVectors(a, b)).toBe(0)
    })

    it('should merge version vectors correctly', () => {
      const a: VersionVector = { client1: 2, client2: 1 }
      const b: VersionVector = { client1: 1, client2: 2 }

      const merged = CRDTOperations.mergeVersionVectors(a, b)

      expect(merged.client1).toBe(2)
      expect(merged.client2).toBe(2)
    })

    it('should increment clock correctly', () => {
      const vector: VersionVector = { client1: 1, client2: 2 }
      const incremented = CRDTOperations.incrementClock(vector, 'client1')

      expect(incremented.client1).toBe(2)
      expect(incremented.client2).toBe(2)
    })

    it('should handle missing client in increment', () => {
      const vector: VersionVector = { client1: 1 }
      const incremented = CRDTOperations.incrementClock(vector, 'client2')

      expect(incremented.client1).toBe(1)
      expect(incremented.client2).toBe(1)
    })
  })

  describe('LWW Register Operations', () => {
    it('should create LWW Register', () => {
      const register = CRDTOperations.createLWWRegister('value', 'client1', 1000)

      expect(register.value).toBe('value')
      expect(register.timestamp).toBe(1000)
      expect(register.clientId).toBe('client1')
    })

    it('should merge LWW Registers with later timestamp', () => {
      const a: LWWRegister<string> = { value: 'a', timestamp: 1000, clientId: 'client1' }
      const b: LWWRegister<string> = { value: 'b', timestamp: 2000, clientId: 'client2' }

      const merged = CRDTOperations.mergeLWWRegisters(a, b)

      expect(merged.value).toBe('b')
      expect(merged.timestamp).toBe(2000)
    })

    it('should use clientId as tiebreaker when timestamps equal', () => {
      const a: LWWRegister<string> = { value: 'a', timestamp: 1000, clientId: 'client1' }
      const b: LWWRegister<string> = { value: 'b', timestamp: 1000, clientId: 'client2' }

      const merged = CRDTOperations.mergeLWWRegisters(a, b)

      // client1 < client2 lexicographically
      expect(merged.value).toBe('a')
      expect(merged.clientId).toBe('client1')
    })

    it('should detect equal LWW Registers', () => {
      const a: LWWRegister<string> = { value: 'a', timestamp: 1000, clientId: 'client1' }
      const b: LWWRegister<string> = { value: 'a', timestamp: 1000, clientId: 'client1' }

      expect(CRDTOperations.equalsLWWRegisters(a, b)).toBe(true)
    })

    it('should detect unequal LWW Registers', () => {
      const a: LWWRegister<string> = { value: 'a', timestamp: 1000, clientId: 'client1' }
      const b: LWWRegister<string> = { value: 'b', timestamp: 1000, clientId: 'client1' }

      expect(CRDTOperations.equalsLWWRegisters(a, b)).toBe(false)
    })
  })

  describe('Operation Creation', () => {
    it('should create add operation', () => {
      const op = CRDTOperations.createAddOperation('elem1', { data: 'test' }, 'client1', 1000)

      expect(op.type).toBe('add')
      expect(op.elementId).toBe('elem1')
      expect((op.value as { data: string }).data).toBe('test')
      expect(op.clientId).toBe('client1')
      expect(op.timestamp).toBe(1000)
      expect(op.vectorClock.client1).toBe(1)
    })

    it('should create update operation', () => {
      const op = CRDTOperations.createUpdateOperation('elem1', 'field1', 'value', 'client1', 1000)

      expect(op.type).toBe('update')
      expect(op.elementId).toBe('elem1')
      expect(op.field).toBe('field1')
      expect(op.value).toBe('value')
      expect(op.clientId).toBe('client1')
      expect(op.timestamp).toBe(1000)
    })

    it('should create delete operation', () => {
      const op = CRDTOperations.createDeleteOperation('elem1', 'client1', 1000)

      expect(op.type).toBe('delete')
      expect(op.elementId).toBe('elem1')
      expect(op.clientId).toBe('client1')
      expect(op.timestamp).toBe(1000)
    })

    it('should create move operation', () => {
      const op = CRDTOperations.createMoveOperation('elem1', { x: 100, y: 200 }, 'client1', 1000)

      expect(op.type).toBe('move')
      expect(op.elementId).toBe('elem1')
      expect(op.position).toEqual({ x: 100, y: 200 })
      expect(op.clientId).toBe('client1')
      expect(op.timestamp).toBe(1000)
    })
  })

  describe('Conflict Detection', () => {
    it('should detect no conflict for different elements', () => {
      const op1 = CRDTOperations.createUpdateOperation('elem1', 'field1', 'value', 'client1', 1000)
      const op2 = CRDTOperations.createUpdateOperation('elem2', 'field1', 'value', 'client2', 1000)

      const conflict = CRDTOperations.detectConflict(op1, op2)

      expect(conflict.hasConflict).toBe(false)
    })

    it('should detect edit-edit conflict with LWW resolution', () => {
      const op1 = CRDTOperations.createUpdateOperation('elem1', 'field1', 'value1', 'client1', 1000)
      const op2 = CRDTOperations.createUpdateOperation('elem1', 'field1', 'value2', 'client2', 2000)

      const conflict = CRDTOperations.detectConflict(op1, op2)

      expect(conflict.hasConflict).toBe(true)
      expect(conflict.conflictType).toBe('edit-edit')
      expect(conflict.winningOperation).toBe(op2) // Later timestamp wins
    })

    it('should detect no conflict for different fields', () => {
      const op1 = CRDTOperations.createUpdateOperation('elem1', 'field1', 'value1', 'client1', 1000)
      const op2 = CRDTOperations.createUpdateOperation('elem1', 'field2', 'value2', 'client2', 2000)

      const conflict = CRDTOperations.detectConflict(op1, op2)

      expect(conflict.hasConflict).toBe(false)
    })

    it('should detect edit-delete conflict', () => {
      const updateOp = CRDTOperations.createUpdateOperation('elem1', 'field1', 'value', 'client1', 1000)
      const deleteOp = CRDTOperations.createDeleteOperation('elem1', 'client2', 2000)

      const conflict = CRDTOperations.detectConflict(updateOp, deleteOp)

      expect(conflict.hasConflict).toBe(true)
      expect(conflict.conflictType).toBe('edit-delete')
      expect(conflict.winningOperation).toBe(deleteOp) // Delete wins
    })

    it('should detect move-delete conflict', () => {
      const moveOp = CRDTOperations.createMoveOperation('elem1', { x: 100, y: 200 }, 'client1', 1000)
      const deleteOp = CRDTOperations.createDeleteOperation('elem1', 'client2', 2000)

      const conflict = CRDTOperations.detectConflict(moveOp, deleteOp)

      expect(conflict.hasConflict).toBe(true)
      expect(conflict.conflictType).toBe('move-delete')
      expect(conflict.winningOperation).toBe(deleteOp) // Delete wins
    })

    it('should detect concurrent move conflict', () => {
      const moveOp1 = CRDTOperations.createMoveOperation('elem1', { x: 100, y: 200 }, 'client1', 1000)
      const moveOp2 = CRDTOperations.createMoveOperation('elem1', { x: 300, y: 400 }, 'client2', 2000)

      const conflict = CRDTOperations.detectConflict(moveOp1, moveOp2)

      expect(conflict.hasConflict).toBe(true)
      expect(conflict.conflictType).toBe('concurrent-move')
      expect(conflict.winningOperation).toBe(moveOp2) // Later timestamp wins
    })
  })

  describe('Document Operations', () => {
    it('should apply add operation', () => {
      const doc = new Map<string, { id: string; data: string }>()
      const op = CRDTOperations.createAddOperation('elem1', { id: 'elem1', data: 'test' }, 'client1')

      const newDoc = CRDTOperations.applyOperation(doc, op)

      expect(newDoc.has('elem1')).toBe(true)
      expect(newDoc.get('elem1')?.data).toBe('test')
    })

    it('should apply update operation', () => {
      const doc = new Map<string, { id: string; data: string; updatedAt?: number }>()
      doc.set('elem1', { id: 'elem1', data: 'original' })

      const op = CRDTOperations.createUpdateOperation('elem1', 'data', 'updated', 'client1', 1000)

      const newDoc = CRDTOperations.applyOperation(doc, op)

      expect(newDoc.get('elem1')?.data).toBe('updated')
      expect(newDoc.get('elem1')?.updatedAt).toBe(1000)
    })

    it('should apply delete operation', () => {
      const doc = new Map<string, { id: string; data: string }>()
      doc.set('elem1', { id: 'elem1', data: 'test' })

      const op = CRDTOperations.createDeleteOperation('elem1', 'client1')

      const newDoc = CRDTOperations.applyOperation(doc, op)

      expect(newDoc.has('elem1')).toBe(false)
    })

    it('should apply move operation', () => {
      const doc = new Map<string, { id: string; position?: { x: number; y: number }; updatedAt?: number }>()
      doc.set('elem1', { id: 'elem1', position: { x: 0, y: 0 } })

      const op = CRDTOperations.createMoveOperation('elem1', { x: 100, y: 200 }, 'client1', 1000)

      const newDoc = CRDTOperations.applyOperation(doc, op)

      expect(newDoc.get('elem1')?.position).toEqual({ x: 100, y: 200 })
    })

    it('should not modify original document when applying operation', () => {
      const doc = new Map<string, { id: string; data: string }>()
      doc.set('elem1', { id: 'elem1', data: 'original' })

      const op = CRDTOperations.createUpdateOperation('elem1', 'data', 'updated', 'client1', 1000)

      CRDTOperations.applyOperation(doc, op)

      // Original should be unchanged
      expect(doc.get('elem1')?.data).toBe('original')
    })
  })

  describe('Document Merging', () => {
    it('should merge documents with LWW', () => {
      const local = new Map<string, { id: string; data: string; updatedAt: number }>()
      local.set('elem1', { id: 'elem1', data: 'local', updatedAt: 1000 })

      const remote = new Map<string, { id: string; data: string; updatedAt: number }>()
      remote.set('elem1', { id: 'elem1', data: 'remote', updatedAt: 2000 })

      const merged = CRDTOperations.mergeDocuments(local, remote)

      // Remote has later timestamp, should win
      expect(merged.get('elem1')?.data).toBe('remote')
    })

    it('should keep local value when local is newer', () => {
      const local = new Map<string, { id: string; data: string; updatedAt: number }>()
      local.set('elem1', { id: 'elem1', data: 'local', updatedAt: 2000 })

      const remote = new Map<string, { id: string; data: string; updatedAt: number }>()
      remote.set('elem1', { id: 'elem1', data: 'remote', updatedAt: 1000 })

      const merged = CRDTOperations.mergeDocuments(local, remote)

      // Local has later timestamp, should win
      expect(merged.get('elem1')?.data).toBe('local')
    })

    it('should add remote-only elements', () => {
      const local = new Map<string, { id: string; data: string; updatedAt: number }>()
      local.set('elem1', { id: 'elem1', data: 'local', updatedAt: 1000 })

      const remote = new Map<string, { id: string; data: string; updatedAt: number }>()
      remote.set('elem1', { id: 'elem1', data: 'local', updatedAt: 1000 })
      remote.set('elem2', { id: 'elem2', data: 'remote-only', updatedAt: 1000 })

      const merged = CRDTOperations.mergeDocuments(local, remote)

      expect(merged.size).toBe(2)
      expect(merged.get('elem2')?.data).toBe('remote-only')
    })

    it('should not lose local-only elements during merge', () => {
      const local = new Map<string, { id: string; data: string; updatedAt: number }>()
      local.set('elem1', { id: 'elem1', data: 'local', updatedAt: 1000 })
      local.set('elem2', { id: 'elem2', data: 'local-only', updatedAt: 1000 })

      const remote = new Map<string, { id: string; data: string; updatedAt: number }>()
      remote.set('elem1', { id: 'elem1', data: 'remote', updatedAt: 2000 })

      const merged = CRDTOperations.mergeDocuments(local, remote)

      expect(merged.size).toBe(2)
      expect(merged.get('elem2')?.data).toBe('local-only')
    })
  })

  describe('Utility Functions', () => {
    it('should generate unique element IDs', () => {
      const id1 = CRDTOperations.generateElementId()
      const id2 = CRDTOperations.generateElementId()

      expect(id1).not.toBe(id2)
    })

    it('should generate prefixed element IDs', () => {
      const id = CRDTOperations.generateElementId('node')

      expect(id.startsWith('node_')).toBe(true)
    })

    it('should serialize version vector', () => {
      const vector: VersionVector = { client1: 1, client2: 2 }
      const serialized = CRDTOperations.serializeVersionVector(vector)

      expect(JSON.parse(serialized)).toEqual(vector)
    })

    it('should deserialize version vector', () => {
      const vector: VersionVector = { client1: 1, client2: 2 }
      const serialized = CRDTOperations.serializeVersionVector(vector)
      const deserialized = CRDTOperations.deserializeVersionVector(serialized)

      expect(deserialized).toEqual(vector)
    })

    it('should handle invalid JSON in deserialize', () => {
      const result = CRDTOperations.deserializeVersionVector('invalid json')

      expect(result).toEqual({})
    })

    it('should calculate causality depth', () => {
      const vector: VersionVector = { client1: 3, client2: 2 }

      const depth = CRDTOperations.calculateCausalityDepth(vector)

      expect(depth).toBe(5)
    })

    it('should calculate causality depth with empty vector', () => {
      const vector: VersionVector = {}

      const depth = CRDTOperations.calculateCausalityDepth(vector)

      expect(depth).toBe(0)
    })
  })
})
