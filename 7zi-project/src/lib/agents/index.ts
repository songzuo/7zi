/**
 * Agents Module Exports
 */

export { AgentRegistry, Agent, AgentFilter } from './AgentRegistry';

// Memory System
export {
  AgentMemory,
  createAgentMemory,
  getMemoryInstance,
  resetMemoryInstance,
  ShortTermMemory,
  LongTermMemory,
  MemoryType,
  MemoryScope,
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
  DEFAULT_MEMORY_CONFIG,
} from './memory';
