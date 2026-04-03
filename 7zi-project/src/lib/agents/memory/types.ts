/**
 * Agent Memory System Types
 *
 * Type definitions for the Agent Memory System
 * Based on AGENT_MEMORY_ARCHITECTURE.md design
 */

/**
 * Agent identifier type
 */
export type AgentId = string;

/**
 * Memory types supported by the system
 */
export enum MemoryType {
  SHORT_TERM = 'short_term',
  WORKING = 'working',
  EPISODIC = 'episodic',
  SEMANTIC = 'semantic',
  PROCEDURAL = 'procedural',
  SHARED = 'shared',
}

/**
 * Memory scope defines visibility and persistence
 */
export enum MemoryScope {
  PRIVATE = 'private',    // Only current agent
  SESSION = 'session',   // Within current session
  AGENT = 'agent',       // All sessions of the agent
  TEAM = 'team',         // Shared within team
  PUBLIC = 'public',     // Globally shared
}

/**
 * Memory entry metadata
 */
export interface MemoryMetadata {
  importance: number;       // 1-10 importance score
  confidence: number;       // 0-1 confidence level
  source: 'user' | 'system' | 'agent';
  category?: string;
  subCategory?: string;
  tags?: string[];
}

/**
 * Core memory entry structure
 */
export interface MemoryEntry {
  id: string;
  agentId: AgentId;
  sessionId?: string;
  type: MemoryType;
  scope: MemoryScope;
  content: string;
  embedding?: number[];     // Vector embedding for semantic search
  metadata: MemoryMetadata;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;         // Expiration for short-term memories
  lastAccessedAt: Date;
  accessCount: number;
  relatedMemoryIds: string[];
  isActive: boolean;
  isPinned: boolean;
}

/**
 * Input for creating new memory
 */
export interface CreateMemoryInput {
  type: MemoryType;
  scope?: MemoryScope;
  agentId: AgentId;
  sessionId?: string;
  content: string;
  metadata?: Partial<MemoryMetadata>;
  tags?: string[];
  expiresAt?: Date;
  generateEmbedding?: boolean;
  relatedMemoryIds?: string[];
}

/**
 * Input for updating existing memory
 */
export interface UpdateMemoryInput {
  content?: string;
  metadata?: Partial<MemoryMetadata>;
  tags?: string[];
  expiresAt?: Date;
  isPinned?: boolean;
}

/**
 * Query parameters for memory search
 */
export interface MemorySearchQuery {
  type?: MemoryType | MemoryType[];
  scope?: MemoryScope | MemoryScope[];
  agentId?: AgentId;
  sessionId?: string;
  tags?: string[];
  contentContains?: string;
  minImportance?: number;
  minConfidence?: number;
  category?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'updated_at' | 'importance' | 'access_count';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Semantic search options
 */
export interface SemanticSearchOptions {
  types?: MemoryType[];
  scopes?: MemoryScope[];
  minSimilarity?: number;
  limit?: number;
  includeContent?: boolean;
}

/**
 * Search result with relevance score
 */
export interface MemorySearchResult {
  memory: MemoryEntry;
  relevanceScore: number;
}

/**
 * Cleanup options for memory maintenance
 */
export interface CleanupOptions {
  deleteExpired?: boolean;
  deleteLowImportance?: boolean;
  minImportanceThreshold?: number;
  deleteOldShortTerm?: boolean;
  shortTermRetentionDays?: number;
}

/**
 * Cleanup result
 */
export interface CleanupResult {
  deletedCount: number;
  expiredCount: number;
  lowImportanceCount: number;
}

/**
 * Memory system configuration
 */
export interface MemorySystemConfig {
  shortTermMaxItems: number;
  shortTermRetentionDays: number;
  workingMemoryMaxItems: number;
  embeddingModel: string;
  embeddingDimensions: number;
  semanticSearchLimit: number;
  defaultImportance: number;
  autoCleanupIntervalMs: number;
}

/**
 * Default configuration
 */
export const DEFAULT_MEMORY_CONFIG: MemorySystemConfig = {
  shortTermMaxItems: 100,
  shortTermRetentionDays: 7,
  workingMemoryMaxItems: 50,
  embeddingModel: 'text-embedding-3-small',
  embeddingDimensions: 1536,
  semanticSearchLimit: 10,
  defaultImportance: 5,
  autoCleanupIntervalMs: 60 * 60 * 1000, // 1 hour
};

/**
 * AgentMemory interface - main API
 */
export interface IAgentMemory {
  // Short-term memory operations
  shortTerm: {
    add(agentId: AgentId, content: string, metadata?: Partial<MemoryMetadata>): Promise<MemoryEntry>;
    get(agentId: AgentId, limit?: number): Promise<MemoryEntry[]>;
    clear(agentId: AgentId): Promise<void>;
  };

  // Long-term memory operations
  longTerm: {
    store(agentId: AgentId, content: string, metadata?: Partial<MemoryMetadata>): Promise<MemoryEntry>;
    get(agentId: AgentId, limit?: number): Promise<MemoryEntry[]>;
    update(memoryId: string, updates: UpdateMemoryInput): Promise<MemoryEntry>;
    delete(memoryId: string): Promise<void>;
  };

  // Unified recall operation
  recall(agentId: AgentId, query: string, options?: SemanticSearchOptions): Promise<MemoryEntry[]>;

  // Maintenance operations
  cleanup(options?: CleanupOptions): Promise<CleanupResult>;
  getStats(agentId: AgentId): Promise<MemoryStats>;
}

/**
 * Memory statistics for an agent
 */
export interface MemoryStats {
  agentId: AgentId;
  totalMemories: number;
  shortTermCount: number;
  longTermCount: number;
  workingCount: number;
  avgImportance: number;
  totalAccessCount: number;
}
