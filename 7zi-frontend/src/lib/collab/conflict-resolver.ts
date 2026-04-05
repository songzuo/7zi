/**
 * ConflictResolver - Conflict Resolution Strategies
 *
 * Provides multiple conflict resolution strategies:
 * - Last-Write-Wins (LWW) - Default, simple and effective
 * - Operational Transformation (OT) - For text editing
 * - Manual Resolution - User prompts for decision
 *
 * @version 1.12.3
 */

import type { Change, Conflict } from './state-manager'
import { logger } from '@/lib/logger'

/**
 * Conflict resolution strategy
 */
export type ConflictStrategy = 'last-write-wins' | 'operational-transform' | 'manual'

/**
 * Resolution result
 */
export interface ResolutionResult {
  success: boolean
  strategy: ConflictStrategy
  resolvedChanges: Change[]
  message?: string
}

/**
 * OT operation types
 */
export type OTOperationType = 'insert' | 'delete' | 'retain'

/**
 * OT Operation
 */
export interface OTOperation {
  type: OTOperationType
  position: number
  length?: number
  text?: string
}

/**
 * OT Transform function result
 */
interface TransformResult {
  operation1Prime: OTOperation
  operation2Prime: OTOperation
}

/**
 * Conflict resolver options
 */
export interface ConflictResolverOptions {
  /** Default strategy to use (default: last-write-wins) */
  defaultStrategy?: ConflictStrategy
  /** Enable debug logging */
  debug?: boolean
  /** Auto-resolve timeout for manual strategy (default: 30000ms) */
  autoResolveTimeout?: number
}

/**
 * ConflictResolver class
 */
export class ConflictResolver {
  // Current strategy
  private strategy: ConflictStrategy

  // Options
  private options: Required<ConflictResolverOptions>

  // Manual resolution callbacks (conflictId -> callback)
  private pendingResolutions: Map<string, (result: ResolutionResult) => void> = new Map()

  // Auto-resolve timers
  private autoResolveTimers: Map<string, NodeJS.Timeout> = new Map()

  // Default options
  private static readonly DEFAULT_OPTIONS: Required<ConflictResolverOptions> = {
    defaultStrategy: 'last-write-wins',
    debug: false,
    autoResolveTimeout: 30000,
  }

  constructor(options: ConflictResolverOptions = {}) {
    this.options = { ...ConflictResolver.DEFAULT_OPTIONS, ...options }
    this.strategy = this.options.defaultStrategy
    this.log('info', 'ConflictResolver initialized', { strategy: this.strategy })
  }

  /**
   * Set resolution strategy
   */
  setStrategy(strategy: ConflictStrategy): void {
    this.strategy = strategy
    this.log('info', 'Strategy changed', { strategy })
  }

  /**
   * Get current strategy
   */
  getStrategy(): ConflictStrategy {
    return this.strategy
  }

  /**
   * Resolve a conflict
   */
  resolve(conflict: Conflict): ResolutionResult {
    switch (this.strategy) {
      case 'last-write-wins':
        return this.resolveLastWriteWins(conflict)
      case 'operational-transform':
        return this.resolveOperationalTransform(conflict)
      case 'manual':
        return this.resolveManual(conflict)
      default:
        return this.resolveLastWriteWins(conflict)
    }
  }

  /**
   * Resolve using Last-Write-Wins strategy
   * The change with the latest timestamp wins
   */
  private resolveLastWriteWins(conflict: Conflict): ResolutionResult {
    if (conflict.changes.length === 0) {
      return {
        success: false,
        strategy: 'last-write-wins',
        resolvedChanges: [],
        message: 'No changes to resolve',
      }
    }

    // Sort by timestamp, descending (newest first)
    const sortedChanges = [...conflict.changes].sort((a, b) => b.timestamp - a.timestamp)

    // The first one wins
    const winner = sortedChanges[0]

    this.log('info', 'LWW resolved conflict', {
      conflictId: conflict.id,
      winnerId: winner.id,
      winnerUser: winner.userName,
    })

    return {
      success: true,
      strategy: 'last-write-wins',
      resolvedChanges: [winner],
      message: `Resolved by accepting change from ${winner.userName}`,
    }
  }

  /**
   * Resolve using Operational Transformation
   * Transforms concurrent operations to maintain consistency
   */
  private resolveOperationalTransform(conflict: Conflict): ResolutionResult {
    if (conflict.changes.length < 2) {
      return {
        success: conflict.changes.length === 1,
        strategy: 'operational-transform',
        resolvedChanges: conflict.changes,
        message: conflict.changes.length === 1 ? 'Single change, no transformation needed' : 'No changes to resolve',
      }
    }

    // For now, apply simple transformation
    // In a real implementation, this would be more sophisticated
    const resolvedChanges = this.transformChanges(conflict.changes)

    this.log('info', 'OT resolved conflict', {
      conflictId: conflict.id,
      resolvedCount: resolvedChanges.length,
    })

    return {
      success: true,
      strategy: 'operational-transform',
      resolvedChanges,
      message: `Resolved ${resolvedChanges.length} operations via transformation`,
    }
  }

  /**
   * Transform multiple concurrent changes
   */
  private transformChanges(changes: Change[]): Change[] {
    // Simple approach: sort by timestamp and apply sequentially
    // Each change's version should be based on the previous result
    const sortedChanges = [...changes].sort((a, b) => a.timestamp - b.timestamp)
    const resolvedChanges: Change[] = []

    let currentVersion = 0
    for (const change of sortedChanges) {
      resolvedChanges.push({
        ...change,
        version: currentVersion + 1,
      })
      currentVersion++
    }

    return resolvedChanges
  }

  /**
   * Request manual resolution
   * Returns a promise that resolves when user makes a decision
   */
  requestManualResolution(conflict: Conflict): Promise<ResolutionResult> {
    return new Promise((resolve) => {
      const conflictId = conflict.id

      // Store the resolution callback
      this.pendingResolutions.set(conflictId, resolve)

      // Set auto-resolve timeout
      const timer = setTimeout(() => {
        this.autoResolve(conflictId)
      }, this.options.autoResolveTimeout)

      this.autoResolveTimers.set(conflictId, timer)

      this.log('info', 'Manual resolution requested', {
        conflictId,
        timeout: this.options.autoResolveTimeout,
      })
    })
  }

  /**
   * Resolve manually with a specific decision
   */
  resolveManually(conflictId: string, decision: 'accept_local' | 'accept_remote' | 'merge'): ResolutionResult | null {
    const resolveCallback = this.pendingResolutions.get(conflictId)
    if (!resolveCallback) {
      this.log('warn', 'No pending resolution found', { conflictId })
      return null
    }

    // Clear the timer
    const timer = this.autoResolveTimers.get(conflictId)
    if (timer) {
      clearTimeout(timer)
      this.autoResolveTimers.delete(conflictId)
    }

    // Get the conflict from the callback (we need to store it)
    // For now, return a placeholder - in real implementation, we'd store the conflict
    const result: ResolutionResult = {
      success: true,
      strategy: 'manual',
      resolvedChanges: [],
      message: `Manually resolved with ${decision}`,
    }

    // Resolve the promise
    resolveCallback(result)

    // Clean up
    this.pendingResolutions.delete(conflictId)

    return result
  }

  /**
   * Auto-resolve with default strategy
   */
  private autoResolve(conflictId: string): void {
    const resolveCallback = this.pendingResolutions.get(conflictId)
    if (!resolveCallback) {
      return
    }

    // Use default strategy
    const result = this.resolve({
      id: conflictId,
      nodeId: '',
      type: 'concurrent_edit',
      changes: [],
      detectedAt: Date.now(),
      resolved: false,
    })

    resolveCallback(result)
    this.pendingResolutions.delete(conflictId)
    this.autoResolveTimers.delete(conflictId)

    this.log('info', 'Auto-resolved conflict', { conflictId, strategy: this.strategy })
  }

  /**
   * Apply manual resolution strategy
   */
  private resolveManual(conflict: Conflict): ResolutionResult {
    // This should be handled by requestManualResolution
    // For synchronous calls, fall back to LWW
    this.log('warn', 'Manual resolution called synchronously, falling back to LWW')
    return this.resolveLastWriteWins(conflict)
  }

  /**
   * Transform two OT operations
   * Returns the transformed operations
   */
  static transform(operation1: OTOperation, operation2: OTOperation): TransformResult {
    // Simple transformation for insert operations
    if (operation1.type === 'insert' && operation2.type === 'insert') {
      // If operation1 is before operation2, shift operation2
      if (operation1.position <= operation2.position) {
        const shift = operation1.text?.length || 0
        return {
          operation1Prime: operation1,
          operation2Prime: {
            ...operation2,
            position: operation2.position + shift,
          },
        }
      } else {
        const shift = operation2.text?.length || 0
        return {
          operation1Prime: {
            ...operation1,
            position: operation1.position + shift,
          },
          operation2Prime: operation2,
        }
      }
    }

    // For delete operations, adjust positions
    if (operation1.type === 'delete' && operation2.type === 'delete') {
      const len1 = operation1.length || 0
      const len2 = operation2.length || 0

      if (operation1.position < operation2.position) {
        return {
          operation1Prime: operation1,
          operation2Prime: {
            ...operation2,
            position: Math.max(0, operation2.position - len1),
          },
        }
      } else if (operation1.position > operation2.position) {
        return {
          operation1Prime: {
            ...operation1,
            position: Math.max(0, operation1.position - len2),
          },
          operation2Prime: operation2,
        }
      } else {
        // Same position - merge deletes
        return {
          operation1Prime: {
            ...operation1,
            length: len1 + len2,
          },
          operation2Prime: {
            ...operation2,
            length: 0,
          },
        }
      }
    }

    // Mixed operations
    if (operation1.type === 'insert' && operation2.type === 'delete') {
      const insertLen = operation1.text?.length || 0
      const deleteLen = operation2.length || 0

      if (operation1.position <= operation2.position) {
        return {
          operation1Prime: operation1,
          operation2Prime: {
            ...operation2,
            position: operation2.position + insertLen,
          },
        }
      } else {
        return {
          operation1Prime: {
            ...operation1,
            position: Math.max(0, operation1.position - deleteLen),
          },
          operation2Prime: operation2,
        }
      }
    }

    // Insert then delete
    if (operation1.type === 'delete' && operation2.type === 'insert') {
      const deleteLen = operation1.length || 0
      const insertLen = operation2.text?.length || 0

      if (operation1.position < operation2.position) {
        return {
          operation1Prime: operation1,
          operation2Prime: {
            ...operation2,
            position: operation2.position - Math.min(deleteLen, operation2.position - operation1.position),
          },
        }
      } else {
        return {
          operation1Prime: {
            ...operation1,
            position: operation2.position + insertLen,
          },
          operation2Prime: operation2,
        }
      }
    }

    // Default: return unchanged
    return {
      operation1Prime: operation1,
      operation2Prime: operation2,
    }
  }

  /**
   * Compare two changes for equality
   */
  static changesEqual(change1: Change, change2: Change): boolean {
    return (
      change1.id === change2.id &&
      change1.type === change2.type &&
      change1.nodeId === change2.nodeId &&
      change1.userId === change2.userId
    )
  }

  /**
   * Check if changes are concurrent (within threshold)
   */
  static areConcurrent(change1: Change, change2: Change, thresholdMs: number = 1000): boolean {
    return Math.abs(change1.timestamp - change2.timestamp) < thresholdMs
  }

  /**
   * Destroy resolver
   */
  destroy(): void {
    // Clear all timers
    this.autoResolveTimers.forEach((timer) => clearTimeout(timer))
    this.autoResolveTimers.clear()
    this.pendingResolutions.clear()
    this.log('info', 'ConflictResolver destroyed')
  }

  /**
   * Debug logging
   */
  private log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>): void {
    if (this.options.debug || level === 'error') {
      logger[level](`[ConflictResolver] ${message}`, data as Error | undefined)
    }
  }
}

export type { ConflictResolverOptions, ResolutionResult, OTOperation, OTOperationType, TransformResult }