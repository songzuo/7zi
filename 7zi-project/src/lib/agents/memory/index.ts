/**
 * Agent Memory System Module
 *
 * Provides memory management capabilities for AI agents
 */

// Main exports
export { AgentMemory, createAgentMemory, getMemoryInstance, resetMemoryInstance } from './agent-memory';
export { ShortTermMemory } from './short-term-memory';
export { LongTermMemory } from './long-term-memory';

// Type exports
export {
  // Enums
  MemoryType,
  MemoryScope,
  
  // Interfaces
  type MemoryEntry,
  type MemoryMetadata,
  type CreateMemoryInput,
  type UpdateMemoryInput,
  type MemorySearchQuery,
  type SemanticSearchOptions,
  type MemorySearchResult,
  type CleanupOptions,
  type CleanupResult,
  type MemorySystemConfig,
  type IAgentMemory,
  type MemoryStats,
  
  // Constants
  DEFAULT_MEMORY_CONFIG,
} from './types';
