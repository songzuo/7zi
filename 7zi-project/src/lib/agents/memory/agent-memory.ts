/**
 * Agent Memory System
 *
 * Unified memory management for AI agents
 * Provides short-term, long-term, and semantic search capabilities
 */

import type { AgentId } from './types'
import {
  IAgentMemory,
  MemoryEntry,
  MemoryMetadata,
  MemorySearchQuery,
  SemanticSearchOptions,
  CleanupOptions,
  CleanupResult,
  MemoryStats,
  MemorySystemConfig,
  DEFAULT_MEMORY_CONFIG,
  UpdateMemoryInput,
} from './types'
import { ShortTermMemory } from './short-term-memory'
import { LongTermMemory } from './long-term-memory'

/**
 * Agent Memory System
 *
 * Main interface for all memory operations
 *
 * @example
 * ```typescript
 * const memory = new AgentMemory();
 *
 * // Add short-term memory
 * const shortMemory = await memory.shortTerm.add('agent-1', 'User asked about weather');
 *
 * // Store long-term memory
 * const longMemory = await memory.longTerm.store('agent-1', 'User prefers Celsius units');
 *
 * // Recall memories
 * const memories = await memory.recall('agent-1', 'weather preferences');
 * ```
 */
export class AgentMemory implements IAgentMemory {
  private shortTermMemory: ShortTermMemory
  private longTermMemory: LongTermMemory
  private config: MemorySystemConfig

  constructor(config: Partial<MemorySystemConfig> = {}) {
    this.config = { ...DEFAULT_MEMORY_CONFIG, ...config }
    this.shortTermMemory = new ShortTermMemory(this.config)
    this.longTermMemory = new LongTermMemory(this.config)
  }

  /**
   * Short-term memory operations
   */
  get shortTerm() {
    return {
      /**
       * Add a new short-term memory
       * @param agentId - The agent ID
       * @param content - Memory content
       * @param metadata - Optional metadata
       * @returns Created memory entry
       */
      add: async (
        agentId: AgentId,
        content: string,
        metadata?: Partial<MemoryMetadata>
      ): Promise<MemoryEntry> => {
        return this.shortTermMemory.add(agentId, content, metadata)
      },

      /**
       * Get short-term memories for an agent
       * @param agentId - The agent ID
       * @param limit - Maximum number to return
       * @returns Array of memory entries
       */
      get: async (agentId: AgentId, limit?: number): Promise<MemoryEntry[]> => {
        return this.shortTermMemory.get(agentId, limit)
      },

      /**
       * Clear all short-term memories for an agent
       * @param agentId - The agent ID
       */
      clear: async (agentId: AgentId): Promise<void> => {
        return this.shortTermMemory.clear(agentId)
      },
    }
  }

  /**
   * Long-term memory operations
   */
  get longTerm() {
    return {
      /**
       * Store a new long-term memory
       * @param agentId - The agent ID
       * @param content - Memory content
       * @param metadata - Optional metadata
       * @returns Created memory entry
       */
      store: async (
        agentId: AgentId,
        content: string,
        metadata?: Partial<MemoryMetadata>
      ): Promise<MemoryEntry> => {
        return this.longTermMemory.store(agentId, content, metadata)
      },

      /**
       * Get long-term memories for an agent
       * @param agentId - The agent ID
       * @param limit - Maximum number to return
       * @returns Array of memory entries
       */
      get: async (agentId: AgentId, limit?: number): Promise<MemoryEntry[]> => {
        return this.longTermMemory.get(agentId, limit)
      },

      /**
       * Update an existing long-term memory
       * @param memoryId - The memory ID
       * @param updates - Update input
       * @returns Updated memory entry
       */
      update: async (memoryId: string, updates: UpdateMemoryInput): Promise<MemoryEntry> => {
        return this.longTermMemory.update(memoryId, updates)
      },

      /**
       * Delete a long-term memory
       * @param memoryId - The memory ID
       */
      delete: async (memoryId: string): Promise<void> => {
        return this.longTermMemory.delete(memoryId)
      },
    }
  }

  /**
   * Unified recall operation
   * Searches both short-term and long-term memories
   * @param agentId - The agent ID
   * @param query - Search query
   * @param options - Search options
   * @returns Combined results from both memory types
   */
  async recall(
    agentId: AgentId,
    query: string,
    options?: SemanticSearchOptions
  ): Promise<MemoryEntry[]> {
    // Get recent short-term memories
    const shortTermResults = await this.shortTermMemory.get(agentId, 20)

    // Search long-term memories
    const longTermResults = await this.longTermMemory.semanticSearch(query, {
      ...options,
      limit: options?.limit ?? 10,
    })

    // Combine results
    const results: { memory: MemoryEntry; source: 'short' | 'long'; score: number }[] = []

    // Add short-term memories that match
    for (const memory of shortTermResults) {
      const relevanceScore = this.calculateRelevanceScore(memory, query)
      if (relevanceScore > 0) {
        results.push({
          memory,
          source: 'short',
          score: relevanceScore,
        })
      }
    }

    // Add long-term memories
    for (const { memory, similarity } of longTermResults) {
      results.push({
        memory,
        source: 'long',
        score: similarity * 10,
      })
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score)

    // Return unique memories
    const seen = new Set<string>()
    const uniqueResults: MemoryEntry[] = []

    for (const result of results) {
      if (!seen.has(result.memory.id)) {
        seen.add(result.memory.id)
        uniqueResults.push(result.memory)
      }
    }

    return uniqueResults.slice(0, options?.limit ?? 20)
  }

  /**
   * Calculate relevance score for a memory
   */
  private calculateRelevanceScore(memory: MemoryEntry, query: string): number {
    const queryLower = query.toLowerCase()
    const contentLower = memory.content.toLowerCase()

    // Check for keyword matches
    const keywords = queryLower.split(/\s+/)
    let matchCount = 0

    for (const keyword of keywords) {
      if (keyword.length < 3) continue
      if (contentLower.includes(keyword)) {
        matchCount++
      }
    }

    if (matchCount === 0) return 0

    // Calculate score
    let score = matchCount * 2
    score += memory.metadata.importance
    score += Math.log10(memory.accessCount + 1)
    score += memory.metadata.confidence * 2

    // Boost recent memories
    const hoursSinceAccess = (Date.now() - memory.lastAccessedAt.getTime()) / (1000 * 60 * 60)
    if (hoursSinceAccess < 1) score *= 2
    else if (hoursSinceAccess < 24) score *= 1.5

    return score
  }

  /**
   * Cleanup expired and low-importance memories
   * @param options - Cleanup options
   * @returns Cleanup result
   */
  async cleanup(options?: CleanupOptions): Promise<CleanupResult> {
    const result: CleanupResult = {
      deletedCount: 0,
      expiredCount: 0,
      lowImportanceCount: 0,
    }

    // Clean short-term expired memories
    if (options?.deleteExpired !== false) {
      result.expiredCount = this.shortTermMemory.cleanup()
    }

    // Note: Long-term memories are not automatically deleted
    // They need to be explicitly managed

    result.deletedCount = result.expiredCount + result.lowImportanceCount

    return result
  }

  /**
   * Get memory statistics for an agent
   * @param agentId - The agent ID
   * @returns Memory statistics
   */
  async getStats(agentId: AgentId): Promise<MemoryStats> {
    const shortTermStats = this.shortTermMemory.getStats(agentId)
    const longTermStats = this.longTermMemory.getStats(agentId)

    return {
      agentId,
      totalMemories: shortTermStats.count + longTermStats.count,
      shortTermCount: shortTermStats.count,
      longTermCount: longTermStats.count,
      workingCount: 0, // Working memory is not implemented yet
      avgImportance: (shortTermStats.avgImportance + longTermStats.avgImportance) / 2,
      totalAccessCount: longTermStats.totalAccessCount,
    }
  }

  /**
   * Get all memories for an agent
   * @param agentId - The agent ID
   * @returns All memory entries
   */
  async getAll(agentId: AgentId): Promise<MemoryEntry[]> {
    const [shortTerm, longTerm] = await Promise.all([
      this.shortTermMemory.get(agentId),
      this.longTermMemory.get(agentId),
    ])

    return [...shortTerm, ...longTerm]
  }

  /**
   * Search memories with full query options
   * @param agentId - The agent ID
   * @param query - Search query
   * @param options - Search options
   * @returns Matching memories
   */
  async search(
    agentId: AgentId,
    query: string,
    options?: MemorySearchQuery
  ): Promise<MemoryEntry[]> {
    return this.recall(agentId, query, {
      types: options?.type
        ? Array.isArray(options.type)
          ? options.type
          : [options.type]
        : undefined,
      scopes: options?.scope
        ? Array.isArray(options.scope)
          ? options.scope
          : [options.scope]
        : undefined,
      minSimilarity: options?.minConfidence,
      limit: options?.limit,
    })
  }

  /**
   * Export all memories
   * @returns All memory entries
   */
  export(): MemoryEntry[] {
    return [...this.shortTermMemory.export(), ...this.longTermMemory.export()]
  }

  /**
   * Import memories from export
   * @param memories - Memory entries to import
   */
  import(memories: MemoryEntry[]): void {
    this.shortTermMemory.import(memories)
    this.longTermMemory.import(memories)
  }

  /**
   * Get memory configuration
   */
  getConfig(): MemorySystemConfig {
    return { ...this.config }
  }
}

/**
 * Factory function to create AgentMemory instance
 */
export function createAgentMemory(config?: Partial<MemorySystemConfig>): AgentMemory {
  return new AgentMemory(config)
}

// Export singleton instance for convenience
let memoryInstance: AgentMemory | null = null

export function getMemoryInstance(config?: Partial<MemorySystemConfig>): AgentMemory {
  if (!memoryInstance) {
    memoryInstance = new AgentMemory(config)
  }
  return memoryInstance
}

export function resetMemoryInstance(): void {
  memoryInstance = null
}
