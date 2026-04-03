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

export interface DiffResult {
  type: 'full' | 'incremental'
  data?: any
  diff?: DiffOperation[]
  originalHash: string
  newHash: string
  changeRatio: number
  changedFields?: string[]
  timestamp: number
}

export interface DiffOperation {
  op: 'replace' | 'add' | 'remove' | 'move' | 'copy' | 'test'
  path: string
  value?: any
  oldValue?: any
  from?: string
}

export interface StateSnapshot {
  data: any
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

export class IncrementalUpdateManager {
  private config: Required<DiffConfig>
  private stateCache: Map<string, StateSnapshot>
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
    newData: any,
    forceFull: boolean = false
  ): DiffResult {
    this.stats.totalUpdates++
    
    const now = Date.now()
    const newHash = this.calculateHash(newData)
    
    // Get previous state
    const previousState = this.stateCache.get(key)
    
    // If no previous state or force full, send full data
    if (!previousState || forceFull) {
      this.stats.fullUpdates++
      
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
  public applyDiff(oldData: any, diff: DiffOperation[]): any {
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
    currentData: any,
    update: DiffResult
  ): { success: boolean; data: any; error?: string } {
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
  public getState(key: string): StateSnapshot | undefined {
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

  private calculateDiff(oldData: any, newData: any): DiffOperation[] {
    const diff: DiffOperation[] = []
    
    this.diffObjects(oldData, newData, [], diff)
    
    return diff
  }

  private diffObjects(
    oldData: any,
    newData: any,
    path: string[],
    diff: DiffOperation[]
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
      this.diffArrays(oldData, newData, path, diff)
      return
    }
    
    // Both are objects
    if (oldType === 'object') {
      this.diffObjectsDeep(oldData, newData, path, diff)
      return
    }
  }

  private diffArrays(
    oldArr: any[],
    newArr: any[],
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
        this.diffObjects(oldArr[i], newArr[i], newPath, diff)
      }
    }
  }

  private diffObjectsDeep(
    oldObj: Record<string, any>,
    newObj: Record<string, any>,
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
        this.diffObjects(oldObj[key], newObj[key], newPath, diff)
      }
    }
  }

  private applyOperation(data: any, op: DiffOperation): any {
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

  private getValueType(value: any): 'primitive' | 'array' | 'object' {
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

  private getAtPath(data: any, parts: string[]): any {
    let current = data
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined
      }
      
      const index = /^\d+$/.test(part) ? parseInt(part, 10) : part
      current = current[index]
    }
    
    return current
  }

  private setAtPath(data: any, parts: string[], value: any): any {
    if (parts.length === 0) {
      return value
    }
    
    const [first, ...rest] = parts
    const index = /^\d+$/.test(first) ? parseInt(first, 10) : first
    
    const current = data[index]
    
    if (current === null || current === undefined) {
      data[index] = rest.length === 0 ? value : {}
    }
    
    if (rest.length > 0) {
      this.setAtPath(data[index], rest, value)
    } else {
      data[index] = value
    }
    
    return data
  }

  private addAtPath(data: any, parts: string[], value: any): any {
    if (parts.length === 0) {
      // Can't add to root
      return data
    }
    
    const [first, ...rest] = parts
    
    if (first === '-') {
      // Add to end of array
      if (Array.isArray(data)) {
        data.push(value)
      }
    } else {
      const index = /^\d+$/.test(first) ? parseInt(first, 10) : first
      
      if (rest.length === 0) {
        data[index] = value
      } else {
        if (!data[index]) {
          data[index] = {}
        }
        this.setAtPath(data[index], rest, value)
      }
    }
    
    return data
  }

  private removeAtPath(data: any, parts: string[]): any {
    if (parts.length === 0) {
      return data
    }
    
    const [first, ...rest] = parts
    const index = /^\d+$/.test(first) ? parseInt(first, 10) : first
    
    if (rest.length === 0) {
      if (Array.isArray(data)) {
        data.splice(index, 1)
      } else {
        delete data[index]
      }
    } else {
      this.removeAtPath(data[index], rest)
    }
    
    return data
  }

  private calculateChangeRatio(oldData: any, newData: any, diff: DiffOperation[]): number {
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

  private calculateSavedBytes(oldData: any, diff: DiffOperation[]): number {
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

  private calculateHash(data: any): string {
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
    
    this.stateCache.set(key, snapshot)
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
