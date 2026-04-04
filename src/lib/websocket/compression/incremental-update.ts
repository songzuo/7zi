/**
 * Incremental Update System
 * 
 * Features:
 * - Detect and transmit only changed data
 * - JSON diff/patch algorithm
 * - State synchronization
 * - Conflict resolution
 * 
 * Technical Stack: Node.js + custom diff algorithm
 * 
 * @author Executor Subagent
 * @date 2026-04-03
 */

import { createHash } from 'crypto'

// ============================================================================
// Types
// ============================================================================

export interface DiffConfig {
  /** Enable deep comparison */
  deep?: boolean
  /** Minimum change threshold (percentage) */
  minChangeThreshold?: number
  /** Enable compression for diffs */
  compressDiffs?: boolean
  /** Enable state caching */
  enableCache?: boolean
  /** Maximum cache size */
  maxCacheSize?: number
  /** Track field-level changes */
  trackFieldChanges?: boolean
}

export interface DiffResult<T = unknown> {
  type: 'full' | 'incremental'
  data?: T
  diff?: DiffOperation<T>[]
  originalHash: string
  newHash: string
  changeRatio: number
  changedFields?: string[]
  timestamp: number
}

export interface DiffOperation<T = unknown> {
  op: 'replace' | 'add' | 'remove' | 'move' | 'copy' | 'test'
  path: string
  value?: T
  oldValue?: T
  from?: string
}

export interface StateSnapshot<T = unknown> {
  data: T
  hash: string
  timestamp: number
  version: number
}

export interface IncrementalUpdateStats {
  totalUpdates: number
  incrementalUpdates: number
  fullUpdates: number
  averageChangeRatio: number
  totalSavedBytes: number
  diffOperations: number
  cacheHits: number
  cacheMisses: number
  fieldChangeFrequency: Map<string, number>
}

// ============================================================================
// Default Config
// ============================================================================

const DEFAULT_CONFIG: Required<DiffConfig> = {
  deep: true,
  minChangeThreshold: 0.1,  // 10% change
  compressDiffs: true,
  enableCache: true,
  maxCacheSize: 1000,
  trackFieldChanges: true
}

// ============================================================================
// Incremental Update Manager
// ============================================================================

export class IncrementalUpdateManager<T = unknown> {
  private config: Required<DiffConfig>
  private stateCache: Map<string, StateSnapshot<T>>
  private stats: IncrementalUpdateStats
  private versionCounter: number = 0

  constructor(config: DiffConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.stateCache = new Map()
    this.stats = {
      totalUpdates: 0,
      incrementalUpdates: 0,
      fullUpdates: 0,
      averageChangeRatio: 0,
      totalSavedBytes: 0,
      diffOperations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      fieldChangeFrequency: new Map()
    }
  }

  /**
   * Generate incremental update for data
   */
  public generateUpdate(
    key: string,
    newData: T,
    forceFull: boolean = false
  ): DiffResult<T> {
    this.stats.totalUpdates++
    
    const now = Date.now()
    const newHash = this.calculateHash(newData)
    
    // Get previous state
    const previousState = this.stateCache.get(key)
    
    // If no previous state or force full, send full data
    if (!previousState || forceFull) {
      this.stats.fullUpdates++
      
      const snapshot: StateSnapshot<T> = {
        data: newData,
        hash: newHash,
        timestamp: now,
        version: ++this.versionCounter
      }
      
      this.cacheState(key, snapshot)
      
      return {
        type: 'full',
        data: newData,
        originalHash: previousState?.hash || '',
        newHash,
        changeRatio: 1.0,
        timestamp: now
      }
    }
    
    // Check if data changed
    if (previousState.hash === newHash) {
      // No change
      this.stats.cacheHits++
      
      return {
        type: 'full',
        data: newData,
        originalHash: previousState.hash,
        newHash,
        changeRatio: 0,
        timestamp: now
      }
    }
    
    this.stats.cacheMisses++
    
    // Calculate diff
    const diff = this.calculateDiff(previousState.data, newData)
    const changeRatio = this.calculateChangeRatio(previousState.data, newData, diff)
    
    // Decide whether to send incremental or full
    const shouldSendIncremental = 
      changeRatio > this.config.minChangeThreshold &&
      changeRatio < 0.9 &&
      diff.length < 100  // Don't send huge diffs
    
    if (shouldSendIncremental) {
      this.stats.incrementalUpdates++
      this.stats.diffOperations += diff.length
      
      // Track field changes
      if (this.config.trackFieldChanges) {
        this.trackChanges(diff)
      }
      
      // Update stats
      const savedBytes = this.calculateSavedBytes(previousState.data, diff)
      this.stats.totalSavedBytes += savedBytes
      
      // Update average change ratio
      const prevAvg = this.stats.averageChangeRatio
      const prevCount = this.stats.totalUpdates - 1
      this.stats.averageChangeRatio = (prevAvg * prevCount + changeRatio) / this.stats.totalUpdates
      
      // Get changed fields
      const changedFields = this.getChangedFields(diff)
      
      // Cache new state
      const snapshot: StateSnapshot = {
        data: newData,
        hash: newHash,
        timestamp: now,
        version: ++this.versionCounter
      }
      
      this.cacheState(key, snapshot)
      
      return {
        type: 'incremental',
        diff,
        originalHash: previousState.hash,
        newHash,
        changeRatio,
        changedFields,
        timestamp: now
      }
    } else {
      // Send full update
      this.stats.fullUpdates++
      
      // Update average change ratio
      const prevAvg = this.stats.averageChangeRatio
      const prevCount = this.stats.totalUpdates - 1
      this.stats.averageChangeRatio = (prevAvg * prevCount + changeRatio) / this.stats.totalUpdates
      
      // Cache new state
      const snapshot: StateSnapshot = {
        data: newData,
        hash: newHash,
        timestamp: now,
        version: ++this.versionCounter
      }
      
      this.cacheState(key, snapshot)
      
      return {
        type: 'full',
        data: newData,
        originalHash: previousState.hash,
        newHash,
        changeRatio,
        timestamp: now
      }
    }
  }

  /**
   * Apply diff to data
   */
  public applyDiff(oldData: T, diff: DiffOperation<T>[]): T {
    let result = JSON.parse(JSON.stringify(oldData))
    
    for (const op of diff) {
      result = this.applyOperation(result, op)
    }
    
    return result
  }

  /**
   * Validate and apply update
   */
  public validateAndApply(
    currentData: T,
    update: DiffResult<T>
  ): { success: boolean; data: T; error?: string } {
    // Verify original hash
    const currentHash = this.calculateHash(currentData)
    
    if (update.type === 'incremental') {
      if (currentHash !== update.originalHash) {
        return {
          success: false,
          data: currentData,
          error: 'Hash mismatch: current state differs from expected state'
        }
      }
      
      // Apply diff
      const newData = this.applyDiff(currentData, update.diff || [])
      
      // Verify new hash
      const newHash = this.calculateHash(newData)
      
      if (newHash !== update.newHash) {
        return {
          success: false,
          data: currentData,
          error: 'Hash mismatch: applied diff does not match expected hash'
        }
      }
      
      return {
        success: true,
        data: newData
      }
    } else {
      // Full update, just verify new hash if data provided
      if (update.data) {
        const newHash = this.calculateHash(update.data)
        
        if (newHash !== update.newHash) {
          return {
            success: false,
            data: currentData,
            error: 'Hash mismatch: full data does not match expected hash'
          }
        }
      }
      
      return {
        success: true,
        data: update.data || currentData
      }
    }
  }

  /**
   * Get state for key
   */
  public getState(key: string): StateSnapshot<T> | undefined {
    return this.stateCache.get(key)
  }

  /**
   * Clear state for key
   */
  public clearState(key: string): void {
    this.stateCache.delete(key)
  }

  /**
   * Clear all states
   */
  public clearAllStates(): void {
    this.stateCache.clear()
  }

  /**
   * Get statistics
   */
  public getStats(): IncrementalUpdateStats {
    return {
      ...this.stats,
      fieldChangeFrequency: new Map(this.stats.fieldChangeFrequency)
    }
  }

  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.stats = {
      totalUpdates: 0,
      incrementalUpdates: 0,
      fullUpdates: 0,
      averageChangeRatio: 0,
      totalSavedBytes: 0,
      diffOperations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      fieldChangeFrequency: new Map()
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private calculateDiff(oldData: T, newData: T): DiffOperation<T>[] {
    const diff: DiffOperation<T>[] = []
    
    this.diffObjects(oldData, newData, [], diff)
    
    return diff
  }

  private diffObjects(
    oldData: T,
    newData: T,
    path: string[],
    diff: DiffOperation<T>[]
  ): void {
    const oldType = this.getValueType(oldData)
    const newType = this.getValueType(newData)
    
    // Type changed or both are primitives
    if (oldType !== newType || oldType === 'primitive') {
      if (JSON.stringify(oldData) !== JSON.stringify(newData)) {
        diff.push({
          op: 'replace',
          path: this.formatPath(path),
          value: newData,
          oldValue: oldData
        })
      }
      return
    }
    
    // Both are arrays
    if (oldType === 'array') {
      this.diffArrays(oldData as unknown[], newData as unknown[], path, diff)
      return
    }
    
    // Both are objects
    if (oldType === 'object') {
      this.diffObjectsDeep(oldData as Record<string, unknown>, newData as Record<string, unknown>, path, diff)
      return
    }
  }

  private diffArrays(
    oldArr: unknown[],
    newArr: unknown[],
    path: string[],
    diff: DiffOperation[]
  ): void {
    const maxLength = Math.max(oldArr.length, newArr.length)
    
    for (let i = 0; i < maxLength; i++) {
      const newPath = [...path, i.toString()]
      
      if (i >= oldArr.length) {
        // Added
        diff.push({
          op: 'add',
          path: this.formatPath(newPath),
          value: newArr[i]
        })
      } else if (i >= newArr.length) {
        // Removed
        diff.push({
          op: 'remove',
          path: this.formatPath(newPath),
          oldValue: oldArr[i]
        })
      } else {
        // Compare elements
        this.diffObjects(oldArr[i] as T, newArr[i] as T, newPath, diff)
      }
    }
  }

  private diffObjectsDeep(
    oldObj: Record<string, unknown>,
    newObj: Record<string, unknown>,
    path: string[],
    diff: DiffOperation[]
  ): void {
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)])
    
    for (const key of allKeys) {
      const newPath = [...path, key]
      
      if (!(key in oldObj)) {
        // Added
        diff.push({
          op: 'add',
          path: this.formatPath(newPath),
          value: newObj[key]
        })
      } else if (!(key in newObj)) {
        // Removed
        diff.push({
          op: 'remove',
          path: this.formatPath(newPath),
          oldValue: oldObj[key]
        })
      } else {
        // Compare values
        this.diffObjects(oldObj[key] as T, newObj[key] as T, newPath, diff)
      }
    }
  }

  private applyOperation(data: T, op: DiffOperation<T>): T {
    const parts = this.parsePath(op.path)
    
    switch (op.op) {
      case 'replace':
        return this.setAtPath(data, parts, op.value)
      
      case 'add':
        return this.addAtPath(data, parts, op.value)
      
      case 'remove':
        return this.removeAtPath(data, parts)
      
      case 'move':
        const movedValue = this.getAtPath(data, this.parsePath(op.from!))
        let result = this.removeAtPath(data, this.parsePath(op.from!))
        return this.addAtPath(result, parts, movedValue)
      
      case 'copy':
        const copiedValue = this.getAtPath(data, this.parsePath(op.from!))
        return this.addAtPath(data, parts, copiedValue)
      
      case 'test':
        const currentValue = this.getAtPath(data, parts)
        return currentValue === op.value ? data : undefined
      
      default:
        return data
    }
  }

  private getValueType(value: T): 'primitive' | 'array' | 'object' {
    if (value === null || value === undefined) {
      return 'primitive'
    }
    
    const type = typeof value
    
    if (type !== 'object') {
      return 'primitive'
    }
    
    if (Array.isArray(value)) {
      return 'array'
    }
    
    return 'object'
  }

  private formatPath(parts: string[]): string {
    return parts.length === 0 ? '' : `/${parts.join('/')}`
  }

  private parsePath(path: string): string[] {
    return path === '' ? [] : path.split('/').slice(1)
  }

  private getAtPath(data: T, parts: string[]): unknown {
    let current = data
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined
      }
      
      const index = /^\d+$/.test(part) ? parseInt(part, 10) : part
      current = (current as Record<string, unknown>)[index]
    }
    
    return current
  }

  private setAtPath(data: T, parts: string[], value: unknown): T {
    if (parts.length === 0) {
      return value as T
    }
    
    const [first, ...rest] = parts
    const index = /^\d+$/.test(first) ? parseInt(first, 10) : first
    
    const current = (data as Record<string, unknown>)[index]
    
    if (current === null || current === undefined) {
      ;(data as Record<string, unknown>)[index] = rest.length === 0 ? value : {}
    }
    
    if (rest.length > 0) {
      this.setAtPath((data as Record<string, unknown>)[index] as T, rest, value)
    } else {
      ;(data as Record<string, unknown>)[index] = value
    }
    
    return data
  }

  private addAtPath(data: T, parts: string[], value: unknown): T {
    if (parts.length === 0) {
      // Can't add to root
      return data
    }
    
    const [first, ...rest] = parts
    
    if (first === '-') {
      // Add to end of array
      if (Array.isArray(data)) {
        ;(data as unknown[]).push(value)
      }
    } else {
      const index = /^\d+$/.test(first) ? parseInt(first, 10) : first
      
      if (rest.length === 0) {
        ;(data as Record<string, unknown>)[index] = value
      } else {
        if (!(data as Record<string, unknown>)[index]) {
          ;(data as Record<string, unknown>)[index] = {}
        }
        this.setAtPath((data as Record<string, unknown>)[index] as T, rest, value)
      }
    }
    
    return data
  }

  private removeAtPath(data: T, parts: string[]): T {
    if (parts.length === 0) {
      return data
    }
    
    const [first, ...rest] = parts
    const index = /^\d+$/.test(first) ? parseInt(first, 10) : first
    
    if (rest.length === 0) {
      if (Array.isArray(data)) {
        ;(data as unknown[]).splice(index as number, 1)
      } else {
        delete (data as Record<string, unknown>)[index as string]
      }
    } else {
      this.removeAtPath((data as Record<string, unknown>)[index as string] as T, rest)
    }
    
    return data
  }

  private calculateChangeRatio(oldData: T, newData: T, diff: DiffOperation<T>[]): number {
    if (diff.length === 0) {
      return 0
    }
    
    const oldSize = JSON.stringify(oldData).length
    const newSize = JSON.stringify(newData).length
    const diffSize = JSON.stringify(diff).length
    
    // Change ratio = 1 - (diff size / new data size)
    // Higher ratio means more savings from using diff
    return Math.max(0, 1 - diffSize / newSize)
  }

  private calculateSavedBytes(oldData: T, diff: DiffOperation<T>[]): number {
    const oldSize = JSON.stringify(oldData).length
    const diffSize = JSON.stringify(diff).length
    
    return Math.max(0, oldSize - diffSize)
  }

  private getChangedFields(diff: DiffOperation[]): string[] {
    const fields = new Set<string>()
    
    for (const op of diff) {
      const parts = this.parsePath(op.path)
      if (parts.length > 0) {
        fields.add(parts[0])
      }
    }
    
    return Array.from(fields)
  }

  private trackChanges(diff: DiffOperation[]): void {
    for (const op of diff) {
      const parts = this.parsePath(op.path)
      if (parts.length > 0) {
        const field = parts[0]
        const count = this.stats.fieldChangeFrequency.get(field) || 0
        this.stats.fieldChangeFrequency.set(field, count + 1)
      }
    }
  }

  private calculateHash(data: T): string {
    try {
      return createHash('sha256').update(JSON.stringify(data)).digest('hex')
    } catch {
      return ''
    }
  }

  private cacheState(key: string, snapshot: StateSnapshot): void {
    // Clean old entries if cache is full
    if (this.stateCache.size >= this.config.maxCacheSize) {
      const entries = Array.from(this.stateCache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      
      const toRemove = entries.slice(0, entries.length - this.config.maxCacheSize + 1)
      for (const [key] of toRemove) {
        this.stateCache.delete(key)
      }
    }
    
    this.stateCache.set(key, snapshot as StateSnapshot<T>)
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let incrementalUpdateInstance: IncrementalUpdateManager | null = null

export function getIncrementalUpdateManager(config?: DiffConfig): IncrementalUpdateManager {
  if (!incrementalUpdateInstance) {
    incrementalUpdateInstance = new IncrementalUpdateManager(config)
  }
  return incrementalUpdateInstance
}

export function resetIncrementalUpdateManager(): void {
  incrementalUpdateInstance = null
}
