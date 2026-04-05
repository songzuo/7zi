/**
 * CRDT Operations for Collaborative Editing
 *
 * Provides conflict-free data types and operations for real-time collaboration
 * Based on Yjs-inspired design for offline-first collaboration
 *
 * @version 1.12.0
 */

/**
 * Version vector for conflict detection
 * Each client has a counter for each node they can modify
 */
export interface VersionVector {
  [clientId: string]: number
}

/**
 * LWW (Last-Write-Wins) Register
 * Stores a value with a timestamp and logical clock
 */
export interface LWWRegister<T> {
  value: T
  timestamp: number
  clientId: string
}

/**
 * OR-Set (Observed-Remove Set)
 * Elements can be added and removed, removed elements are tombstoned
 */
export interface ORSetElement<T> {
  value: T
  addTag: string
  removeTags: Set<string>
}

/**
 * Operation types for CRDT documents
 */
export type CRDTOperationType =
  | 'add'
  | 'update'
  | 'delete'
  | 'move'

/**
 * Base operation structure
 */
export interface BaseOperation {
  type: CRDTOperationType
  clientId: string
  timestamp: number
  vectorClock: VersionVector
}

/**
 * Add operation
 */
export interface AddOperation<T = unknown> extends BaseOperation {
  type: 'add'
  elementId: string
  value: T
}

/**
 * Update operation (LWW semantics)
 */
export interface UpdateOperation extends BaseOperation {
  type: 'update'
  elementId: string
  field: string
  value: unknown
  timestamp: number // Physical timestamp for LWW
}

/**
 * Delete operation
 */
export interface DeleteOperation extends BaseOperation {
  type: 'delete'
  elementId: string
}

/**
 * Move operation
 */
export interface MoveOperation extends BaseOperation {
  type: 'move'
  elementId: string
  position: { x: number; y: number }
}

/**
 * Combined operation union type
 */
export type CRDTOperation = AddOperation | UpdateOperation | DeleteOperation | MoveOperation

/**
 * Conflict information
 */
export interface ConflictInfo {
  hasConflict: boolean
  conflictType?: 'edit-edit' | 'edit-delete' | 'move-delete' | 'concurrent-move'
  winningOperation?: CRDTOperation
  losingOperations?: CRDTOperation[]
}

/**
 * Merge result
 */
export interface MergeResult<T = unknown> {
  value: T
  conflicts: ConflictInfo[]
  timestamp: number
}

/**
 * CRDT Utilities Class
 */
export class CRDTOperations {
  /**
   * Compare two version vectors
   * Returns:
   *  -1 if a < b (a is behind)
   *   0 if a == b (concurrent or same)
   *   1 if a > b (a is ahead)
   */
  static compareVersionVectors(a: VersionVector, b: VersionVector): -1 | 0 | 1 {
    let aAhead = false
    let aBehind = false

    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)])

    for (const key of allKeys) {
      const aVal = a[key] || 0
      const bVal = b[key] || 0

      if (aVal > bVal) {
        aAhead = true
      } else if (aVal < bVal) {
        aBehind = true
      }
    }

    if (aAhead && !aBehind) return 1
    if (aBehind && !aAhead) return -1
    return 0 // Concurrent (aAhead && aBehind) or equal (!aAhead && !aBehind)
  }

  /**
   * Merge two version vectors (take max of each component)
   */
  static mergeVersionVectors(a: VersionVector, b: VersionVector): VersionVector {
    const result: VersionVector = { ...a }
    for (const [key, val] of Object.entries(b)) {
      result[key] = Math.max(result[key] || 0, val)
    }
    return result
  }

  /**
   * Increment local clock in version vector
   */
  static incrementClock(vector: VersionVector, clientId: string): VersionVector {
    return {
      ...vector,
      [clientId]: (vector[clientId] || 0) + 1,
    }
  }

  /**
   * Create LWW Register from value
   */
  static createLWWRegister<T>(value: T, clientId: string, timestamp?: number): LWWRegister<T> {
    return {
      value,
      timestamp: timestamp ?? Date.now(),
      clientId,
    }
  }

  /**
   * Merge two LWW Registers (Last-Write-Wins)
   * Returns the one with the latest timestamp
   */
  static mergeLWWRegisters<T>(a: LWWRegister<T>, b: LWWRegister<T>): LWWRegister<T> {
    // If timestamps are equal, use clientId as tiebreaker (deterministic)
    if (a.timestamp > b.timestamp) return a
    if (b.timestamp > a.timestamp) return b
    // Tiebreaker: lexicographic clientId comparison
    return a.clientId < b.clientId ? a : b
  }

  /**
   * Check if two LWW Registers are equal
   */
  static equalsLWWRegisters<T>(a: LWWRegister<T>, b: LWWRegister<T>): boolean {
    return a.value === b.value && a.timestamp === b.timestamp && a.clientId === b.clientId
  }

  /**
   * Create a new add operation
   */
  static createAddOperation<T>(
    elementId: string,
    value: T,
    clientId: string,
    timestamp?: number
  ): AddOperation<T> {
    return {
      type: 'add',
      elementId,
      value,
      clientId,
      timestamp: timestamp ?? Date.now(),
      vectorClock: { [clientId]: 1 },
    }
  }

  /**
   * Create a new update operation
   */
  static createUpdateOperation(
    elementId: string,
    field: string,
    value: unknown,
    clientId: string,
    timestamp?: number
  ): UpdateOperation {
    return {
      type: 'update',
      elementId,
      field,
      value,
      clientId,
      timestamp: timestamp ?? Date.now(),
      vectorClock: { [clientId]: 1 },
    }
  }

  /**
   * Create a new delete operation
   */
  static createDeleteOperation(elementId: string, clientId: string, timestamp?: number): DeleteOperation {
    return {
      type: 'delete',
      elementId,
      clientId,
      timestamp: timestamp ?? Date.now(),
      vectorClock: { [clientId]: 1 },
    }
  }

  /**
   * Create a new move operation
   */
  static createMoveOperation(
    elementId: string,
    position: { x: number; y: number },
    clientId: string,
    timestamp?: number
  ): MoveOperation {
    return {
      type: 'move',
      elementId,
      position,
      clientId,
      timestamp: timestamp ?? Date.now(),
      vectorClock: { [clientId]: 1 },
    }
  }

  /**
   * Detect conflict between two operations
   * Returns conflict information if there's a conflict
   */
  static detectConflict(op1: CRDTOperation, op2: CRDTOperation): ConflictInfo {
    // Different elements - no conflict
    if (op1.elementId !== op2.elementId) {
      return { hasConflict: false }
    }

    // Same operation type - edit-edit conflict
    if (op1.type === 'update' && op2.type === 'update') {
      // Different fields - no conflict
      if (op1.field !== op2.field) {
        return { hasConflict: false }
      }

      // Same field - conflict, but LWW resolves it
      const winning = op1.timestamp >= op2.timestamp ? op1 : op2
      return {
        hasConflict: true,
        conflictType: 'edit-edit',
        winningOperation: winning,
        losingOperations: [winning === op1 ? op2 : op1],
      }
    }

    // Edit vs Delete conflict
    if ((op1.type === 'update' && op2.type === 'delete') || (op1.type === 'delete' && op2.type === 'update')) {
      // Delete wins (data protection)
      return {
        hasConflict: true,
        conflictType: 'edit-delete',
        winningOperation: op2.type === 'delete' ? op2 : op1,
        losingOperations: [op2.type === 'delete' ? op1 : op2],
      }
    }

    // Move vs Delete conflict
    if ((op1.type === 'move' && op2.type === 'delete') || (op1.type === 'delete' && op2.type === 'move')) {
      // Delete wins
      return {
        hasConflict: true,
        conflictType: 'move-delete',
        winningOperation: op2.type === 'delete' ? op2 : op1,
        losingOperations: [op2.type === 'delete' ? op1 : op2],
      }
    }

    // Move vs Move - concurrent move
    if (op1.type === 'move' && op2.type === 'move') {
      // LWW resolves - later timestamp wins
      const winning = op1.timestamp >= op2.timestamp ? op1 : op2
      return {
        hasConflict: true,
        conflictType: 'concurrent-move',
        winningOperation: winning,
        losingOperations: [winning === op1 ? op2 : op1],
      }
    }

    return { hasConflict: false }
  }

  /**
   * Apply operation to a document state
   * Returns new document state (immutable)
   */
  static applyOperation<T extends Record<string, unknown>>(
    doc: Map<string, T>,
    operation: CRDTOperation
  ): Map<string, T> {
    const newDoc = new Map(doc)

    switch (operation.type) {
      case 'add': {
        const addOp = operation as AddOperation<T>
        if (!newDoc.has(addOp.elementId)) {
          newDoc.set(addOp.elementId, {
            id: addOp.elementId,
            ...(addOp.value as Record<string, unknown>),
          } as T)
        }
        break
      }

      case 'update': {
        const updateOp = operation as UpdateOperation
        const existing = newDoc.get(updateOp.elementId)
        if (existing) {
          newDoc.set(updateOp.elementId, {
            ...existing,
            [updateOp.field]: updateOp.value,
            updatedAt: updateOp.timestamp,
            updatedBy: updateOp.clientId,
          } as T)
        }
        break
      }

      case 'delete': {
        const deleteOp = operation as DeleteOperation
        newDoc.delete(deleteOp.elementId)
        break
      }

      case 'move': {
        const moveOp = operation as MoveOperation
        const existing = newDoc.get(moveOp.elementId)
        if (existing) {
          newDoc.set(moveOp.elementId, {
            ...existing,
            position: moveOp.position,
            updatedAt: moveOp.timestamp,
            updatedBy: moveOp.clientId,
          } as T)
        }
        break
      }
    }

    return newDoc
  }

  /**
   * Merge two document states
   * Uses LWW semantics for concurrent updates
   */
  static mergeDocuments<T extends Record<string, unknown>>(
    local: Map<string, T>,
    remote: Map<string, T>
  ): Map<string, T> {
    const merged = new Map<string, T>()

    // Start with all local entries
    local.forEach((value, key) => {
      merged.set(key, value)
    })

    // Merge remote entries using LWW
    remote.forEach((remoteValue, key) => {
      const localValue = merged.get(key)

      if (!localValue) {
        // Key only in remote - add it
        merged.set(key, remoteValue)
      } else {
        // Key in both - LWW merge based on updatedAt
        const localTime = (localValue as Record<string, unknown>)['updatedAt'] as number || 0
        const remoteTime = (remoteValue as Record<string, unknown>)['updatedAt'] as number || 0

        if (remoteTime > localTime) {
          merged.set(key, remoteValue)
        }
        // Otherwise keep local value
      }
    })

    return merged
  }

  /**
   * Generate a unique element ID
   */
  static generateElementId(prefix?: string): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 10)
    return prefix ? `${prefix}_${timestamp}_${random}` : `elem_${timestamp}_${random}`
  }

  /**
   * Serialize version vector to string (for storage/transmission)
   */
  static serializeVersionVector(vector: VersionVector): string {
    return JSON.stringify(vector)
  }

  /**
   * Deserialize version vector from string
   */
  static deserializeVersionVector(str: string): VersionVector {
    try {
      return JSON.parse(str)
    } catch {
      return {}
    }
  }

  /**
   * Calculate causality depth (number of causally dependent operations)
   */
  static calculateCausalityDepth(vector: VersionVector): number {
    return Object.values(vector).reduce((sum, val) => sum + val, 0)
  }
}


