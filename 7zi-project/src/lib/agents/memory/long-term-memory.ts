/**
 * Long-Term Memory Manager
 *
 * Manages persistent memories with semantic search capability
 * Supports episodic, semantic, and procedural memory types
 */

import type { AgentId } from './types';
import {
  MemoryEntry,
  MemoryType,
  MemoryScope,
  MemoryMetadata,
  UpdateMemoryInput,
  SemanticSearchOptions,
  DEFAULT_MEMORY_CONFIG,
  MemorySystemConfig,
} from './types';
import { randomUUID } from 'crypto';

/**
 * Long-term memory manager
 * Stores persistent memories with optional vector embeddings
 */
export class LongTermMemory {
  private memories: Map<string, MemoryEntry> = new Map();
  private agentMemories: Map<AgentId, Set<string>> = new Map();
  private embeddings: Map<string, number[]> = new Map();
  private config: MemorySystemConfig;

  constructor(config: Partial<MemorySystemConfig> = {}) {
    this.config = { ...DEFAULT_MEMORY_CONFIG, ...config };
  }

  /**
   * Store a new long-term memory
   * @param agentId - The agent ID
   * @param content - Memory content
   * @param metadata - Optional metadata
   * @returns Created memory entry
   */
  async store(
    agentId: AgentId,
    content: string,
    metadata?: Partial<MemoryMetadata>
  ): Promise<MemoryEntry> {
    const now = new Date();

    // Determine memory type based on metadata or default to semantic
    const memoryType = this.determineMemoryType(metadata);

    const memory: MemoryEntry = {
      id: randomUUID(),
      agentId,
      type: memoryType,
      scope: MemoryScope.AGENT,
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
      lastAccessedAt: now,
      accessCount: 0,
      relatedMemoryIds: [],
      isActive: true,
      isPinned: false,
    };

    // Generate embedding if requested
    // Note: In production, this would call an embedding API
    // For now, we store without embedding

    // Store memory
    this.memories.set(memory.id, memory);

    // Track by agent
    if (!this.agentMemories.has(agentId)) {
      this.agentMemories.set(agentId, new Set());
    }
    this.agentMemories.get(agentId)!.add(memory.id);

    return memory;
  }

  /**
   * Get long-term memories for an agent
   * @param agentId - The agent ID
   * @param limit - Maximum number to return
   * @returns Array of memory entries
   */
  async get(agentId: AgentId, limit?: number): Promise<MemoryEntry[]> {
    const memoryIds = this.agentMemories.get(agentId);
    if (!memoryIds) return [];

    const memories: MemoryEntry[] = [];
    const now = new Date();

    for (const id of memoryIds) {
      const memory = this.memories.get(id);
      if (memory && memory.isActive) {
        // Update access stats
        memory.lastAccessedAt = now;
        memory.accessCount++;
        memories.push(memory);
      }
    }

    // Sort by importance (highest first), then by last accessed
    memories.sort((a, b) => {
      if (a.metadata.importance !== b.metadata.importance) {
        return b.metadata.importance - a.metadata.importance;
      }
      return b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime();
    });

    // Apply limit
    const result = limit !== undefined ? memories.slice(0, limit) : memories;
    return result;
  }

  /**
   * Update an existing memory
   * @param memoryId - The memory ID
   * @param updates - Update input
   * @returns Updated memory entry
   */
  async update(memoryId: string, updates: UpdateMemoryInput): Promise<MemoryEntry> {
    const memory = this.memories.get(memoryId);
    if (!memory) {
      throw new Error(`Memory not found: ${memoryId}`);
    }

    const now = new Date();

    // Apply updates
    if (updates.content !== undefined) {
      memory.content = updates.content;
    }
    if (updates.metadata !== undefined) {
      memory.metadata = {
        ...memory.metadata,
        ...updates.metadata,
      };
    }
    if (updates.tags !== undefined) {
      memory.metadata.tags = updates.tags;
    }
    if (updates.isPinned !== undefined) {
      memory.isPinned = updates.isPinned;
    }
    
    memory.updatedAt = now;
    memory.lastAccessedAt = now;

    return memory;
  }

  /**
   * Delete a memory
   * @param memoryId - The memory ID
   */
  async delete(memoryId: string): Promise<void> {
    const memory = this.memories.get(memoryId);
    if (!memory) return;

    // Mark as inactive instead of removing
    memory.isActive = false;
    
    // Remove from agent index
    const agentMemoryIds = this.agentMemories.get(memory.agentId);
    if (agentMemoryIds) {
      agentMemoryIds.delete(memoryId);
    }

    // Remove embedding
    this.embeddings.delete(memoryId);
  }

  /**
   * Get a specific memory by ID
   * @param memoryId - The memory ID
   * @returns Memory entry or undefined
   */
  getById(memoryId: string): MemoryEntry | undefined {
    const memory = this.memories.get(memoryId);
    if (memory && memory.isActive) {
      memory.lastAccessedAt = new Date();
      memory.accessCount++;
    }
    return memory;
  }

  /**
   * Search memories by content
   * @param query - Search query
   * @param options - Search options
   * @returns Matching memories
   */
  async search(
    query: string,
    options?: SemanticSearchOptions
  ): Promise<MemoryEntry[]> {
    const results: MemoryEntry[] = [];
    const queryLower = query.toLowerCase();

    for (const memory of this.memories.values()) {
      if (!memory.isActive) continue;

      // Filter by type
      if (options?.types && !options.types.includes(memory.type)) {
        continue;
      }

      // Filter by scope
      if (options?.scopes && !options.scopes.includes(memory.scope)) {
        continue;
      }

      // Content search
      if (memory.content.toLowerCase().includes(queryLower)) {
        results.push(memory);
      }
    }

    // Sort by relevance (simple keyword match for now)
    results.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, query);
      const scoreB = this.calculateRelevanceScore(b, query);
      return scoreB - scoreA;
    });

    return results.slice(0, options?.limit ?? this.config.semanticSearchLimit);
  }

  /**
   * Semantic search using embeddings
   * @param query - Search query
   * @param options - Search options
   * @returns Matching memories with relevance scores
   * 
   * Note: This is a simplified implementation. In production,
   * it would use actual vector similarity search.
   */
  async semanticSearch(
    query: string,
    options?: SemanticSearchOptions
  ): Promise<{ memory: MemoryEntry; similarity: number }[]> {
    const results: { memory: MemoryEntry; similarity: number }[] = [];

    // Get all matching memories
    const memories = await this.search(query, options);

    // Calculate similarity scores (simplified)
    for (const memory of memories) {
      const similarity = this.calculateRelevanceScore(memory, query) / 10;
      
      if (!options?.minSimilarity || similarity >= options.minSimilarity) {
        results.push({ memory, similarity });
      }
    }

    // Sort by similarity
    results.sort((a, b) => b.similarity - a.similarity);

    return results;
  }

  /**
   * Calculate relevance score for a memory
   */
  private calculateRelevanceScore(memory: MemoryEntry, query: string): number {
    const queryLower = query.toLowerCase();
    const contentLower = memory.content.toLowerCase();

    // Count occurrences
    const occurrences = (contentLower.match(new RegExp(queryLower, 'g')) || []).length;

    // Base score from occurrences
    let score = occurrences * 2;

    // Boost by importance
    score += memory.metadata.importance;

    // Boost by access count (logarithmic)
    score += Math.log10(memory.accessCount + 1);

    // Boost by confidence
    score += memory.metadata.confidence * 2;

    return score;
  }

  /**
   * Determine memory type based on metadata
   */
  private determineMemoryType(metadata?: Partial<MemoryMetadata>): MemoryType {
    if (metadata?.category) {
      switch (metadata.category.toLowerCase()) {
        case 'event':
        case 'incident':
        case 'conversation':
          return MemoryType.EPISODIC;
        case 'skill':
        case 'workflow':
        case 'procedure':
          return MemoryType.PROCEDURAL;
        case 'fact':
        case 'knowledge':
        case 'preference':
          return MemoryType.SEMANTIC;
        default:
          return MemoryType.SEMANTIC;
      }
    }
    return MemoryType.SEMANTIC;
  }

  /**
   * Get statistics for an agent
   */
  getStats(agentId: AgentId): {
    count: number;
    episodicCount: number;
    semanticCount: number;
    proceduralCount: number;
    avgImportance: number;
    totalAccessCount: number;
  } {
    const memoryIds = this.agentMemories.get(agentId);
    if (!memoryIds) {
      return {
        count: 0,
        episodicCount: 0,
        semanticCount: 0,
        proceduralCount: 0,
        avgImportance: 0,
        totalAccessCount: 0,
      };
    }

    const memories: MemoryEntry[] = [];
    for (const id of memoryIds) {
      const memory = this.memories.get(id);
      if (memory && memory.isActive) {
        memories.push(memory);
      }
    }

    const episodicCount = memories.filter(m => m.type === MemoryType.EPISODIC).length;
    const semanticCount = memories.filter(m => m.type === MemoryType.SEMANTIC).length;
    const proceduralCount = memories.filter(m => m.type === MemoryType.PROCEDURAL).length;

    const avgImportance = memories.length > 0
      ? memories.reduce((sum, m) => sum + m.metadata.importance, 0) / memories.length
      : 0;

    const totalAccessCount = memories.reduce((sum, m) => sum + m.accessCount, 0);

    return {
      count: memories.length,
      episodicCount,
      semanticCount,
      proceduralCount,
      avgImportance,
      totalAccessCount,
    };
  }

  /**
   * Export all memories for persistence
   */
  export(): MemoryEntry[] {
    return Array.from(this.memories.values()).filter(m => m.isActive);
  }

  /**
   * Import memories from persistence
   */
  import(memories: MemoryEntry[]): void {
    for (const memory of memories) {
      if (memory.type !== MemoryType.SHORT_TERM) {
        this.memories.set(memory.id, memory);
        
        if (!this.agentMemories.has(memory.agentId)) {
          this.agentMemories.set(memory.agentId, new Set());
        }
        this.agentMemories.get(memory.agentId)!.add(memory.id);

        if (memory.embedding) {
          this.embeddings.set(memory.id, memory.embedding);
        }
      }
    }
  }

  /**
   * Promote a short-term memory to long-term
   */
  async promote(memory: MemoryEntry): Promise<MemoryEntry> {
    const promotedMemory: MemoryEntry = {
      ...memory,
      id: randomUUID(), // New ID for the promoted memory
      type: MemoryType.SEMANTIC,
      scope: MemoryScope.AGENT,
      expiresAt: undefined, // No expiration for long-term
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.memories.set(promotedMemory.id, promotedMemory);

    if (!this.agentMemories.has(promotedMemory.agentId)) {
      this.agentMemories.set(promotedMemory.agentId, new Set());
    }
    this.agentMemories.get(promotedMemory.agentId)!.add(promotedMemory.id);

    return promotedMemory;
  }
}
