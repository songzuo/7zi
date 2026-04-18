/**
 * Short-Term Memory Manager
 *
 * Manages temporary memories with expiration and limited capacity
 * Implements LRU eviction when capacity is reached
 */

import type { AgentId } from './types'
import {
  MemoryEntry,
  MemoryType,
  MemoryScope,
  CreateMemoryInput,
  MemoryMetadata,
  DEFAULT_MEMORY_CONFIG,
  MemorySystemConfig,
} from './types'
import { randomUUID } from 'crypto'

/**
 * Short-term memory manager
 * Stores temporary memories with automatic expiration
 */
export class ShortTermMemory {
  private memories: Map<string, MemoryEntry> = new Map()
  private agentMemories: Map<AgentId, Set<string>> = new Map()
  private config: MemorySystemConfig

  constructor(config: Partial<MemorySystemConfig> = {}) {
    this.config = { ...DEFAULT_MEMORY_CONFIG, ...config }

    // Start periodic cleanup
    this.startPeriodicCleanup()
  }

  /**
   * Add a new short-term memory
   * @param agentId - The agent ID
   * @param content - Memory content
   * @param metadata - Optional metadata
   * @returns Created memory entry
   */
  async add(
    agentId: AgentId,
    content: string,
    metadata?: Partial<MemoryMetadata>
  ): Promise<MemoryEntry> {
    // Check capacity and evict if needed
    await this.ensureCapacity(agentId)

    const now = new Date()
    const expiresAt = new Date(
      now.getTime() + this.config.shortTermRetentionDays * 24 * 60 * 60 * 1000
    )

    const memory: MemoryEntry = {
      id: randomUUID(),
      agentId,
      type: MemoryType.SHORT_TERM,
      scope: MemoryScope.SESSION,
      content,
      metadata: {
        importance: metadata?.importance ?? this.config.defaultImportance,
        confidence: metadata?.confidence ?? 1.0,
        source: metadata?.source ?? 'system',
        category: metadata?.category,
        subCategory: metadata?.subCategory,
        tags: metadata?.tags ?? [],
      },
      createdAt: now,
      updatedAt: now,
      expiresAt,
      lastAccessedAt: now,
      accessCount: 0,
      relatedMemoryIds: [],
      isActive: true,
      isPinned: false,
    }

    // Store memory
    this.memories.set(memory.id, memory)

    // Track by agent
    if (!this.agentMemories.has(agentId)) {
      this.agentMemories.set(agentId, new Set())
    }
    this.agentMemories.get(agentId)!.add(memory.id)

    return memory
  }

  /**
   * Get short-term memories for an agent
   * @param agentId - The agent ID
   * @param limit - Maximum number to return
   * @returns Array of memory entries
   */
  async get(agentId: AgentId, limit?: number): Promise<MemoryEntry[]> {
    const memoryIds = this.agentMemories.get(agentId)
    if (!memoryIds) return []

    const memories: MemoryEntry[] = []
    const now = new Date()

    for (const id of memoryIds) {
      const memory = this.memories.get(id)
      if (memory && memory.isActive && !this.isExpired(memory, now)) {
        // Update access stats
        memory.lastAccessedAt = now
        memory.accessCount++
        memories.push(memory)
      }
    }

    // Sort by last accessed (most recent first)
    memories.sort((a, b) => b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime())

    // Apply limit
    const result = limit !== undefined ? memories.slice(0, limit) : memories
    return result
  }

  /**
   * Clear all short-term memories for an agent
   * @param agentId - The agent ID
   */
  async clear(agentId: AgentId): Promise<void> {
    const memoryIds = this.agentMemories.get(agentId)
    if (!memoryIds) return

    for (const id of memoryIds) {
      this.memories.delete(id)
    }

    this.agentMemories.delete(agentId)
  }

  /**
   * Get a specific memory by ID
   * @param memoryId - The memory ID
   * @returns Memory entry or undefined
   */
  getById(memoryId: string): MemoryEntry | undefined {
    const memory = this.memories.get(memoryId)
    if (memory && memory.isActive) {
      memory.lastAccessedAt = new Date()
      memory.accessCount++
    }
    return memory
  }

  /**
   * Delete a specific memory
   * @param memoryId - The memory ID
   * @returns True if deleted
   */
  delete(memoryId: string): boolean {
    const memory = this.memories.get(memoryId)
    if (!memory) return false

    this.memories.delete(memoryId)

    const agentMemoryIds = this.agentMemories.get(memory.agentId)
    if (agentMemoryIds) {
      agentMemoryIds.delete(memoryId)
    }

    return true
  }

  /**
   * Check if memory is expired
   */
  private isExpired(memory: MemoryEntry, now: Date): boolean {
    if (!memory.expiresAt) return false
    return memory.expiresAt.getTime() < now.getTime()
  }

  /**
   * Ensure capacity by evicting old memories if needed
   */
  private async ensureCapacity(agentId: AgentId): Promise<void> {
    const memoryIds = this.agentMemories.get(agentId)
    if (!memoryIds || memoryIds.size < this.config.shortTermMaxItems) {
      return
    }

    // Find memories to evict (excluding pinned ones)
    const memories: MemoryEntry[] = []
    const now = new Date()

    for (const id of memoryIds) {
      const memory = this.memories.get(id)
      if (memory && !memory.isPinned) {
        memories.push(memory)
      }
    }

    // Sort by access time (oldest first) and importance (lowest first)
    memories.sort((a, b) => {
      // First sort by importance (lower importance evicted first)
      if (a.metadata.importance !== b.metadata.importance) {
        return a.metadata.importance - b.metadata.importance
      }
      // Then by access time (oldest first)
      return a.lastAccessedAt.getTime() - b.lastAccessedAt.getTime()
    })

    // Evict oldest 20% or until under capacity
    const toEvict = Math.max(1, Math.floor(memories.length * 0.2))

    for (let i = 0; i < toEvict && i < memories.length; i++) {
      this.delete(memories[i].id)
    }
  }

  /**
   * Cleanup expired memories
   * @returns Number of cleaned up memories
   */
  cleanup(): number {
    const now = new Date()
    let cleaned = 0

    for (const [id, memory] of this.memories) {
      if (this.isExpired(memory, now)) {
        this.delete(id)
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * Start periodic cleanup interval
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanup()
    }, this.config.autoCleanupIntervalMs)
  }

  /**
   * Get statistics
   */
  getStats(agentId: AgentId): { count: number; avgImportance: number } {
    const memoryIds = this.agentMemories.get(agentId)
    if (!memoryIds) return { count: 0, avgImportance: 0 }

    const memories: MemoryEntry[] = []
    const now = new Date()

    for (const id of memoryIds) {
      const memory = this.memories.get(id)
      if (memory && memory.isActive && !this.isExpired(memory, now)) {
        memories.push(memory)
      }
    }

    const avgImportance =
      memories.length > 0
        ? memories.reduce((sum, m) => sum + m.metadata.importance, 0) / memories.length
        : 0

    return {
      count: memories.length,
      avgImportance,
    }
  }

  /**
   * Export all memories for persistence
   */
  export(): MemoryEntry[] {
    return Array.from(this.memories.values()).filter(m => m.isActive)
  }

  /**
   * Import memories from persistence
   */
  import(memories: MemoryEntry[]): void {
    for (const memory of memories) {
      if (memory.type === MemoryType.SHORT_TERM) {
        this.memories.set(memory.id, memory)

        if (!this.agentMemories.has(memory.agentId)) {
          this.agentMemories.set(memory.agentId, new Set())
        }
        this.agentMemories.get(memory.agentId)!.add(memory.id)
      }
    }
  }
}
