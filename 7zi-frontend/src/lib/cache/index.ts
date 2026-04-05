/**
 * Performance API Index
 *
 * 导出所有性能优化相关模块
 */

// Hot Data Cache
export * from './hot-data-cache'
export { createHotDataCache, CachePresets } from './hot-data-cache'

export type {
  CacheKeyConfig,
  CacheConfig,
  CacheStats,
} from './hot-data-cache'

// Query Optimizer (from db directory)
// Note: This is imported from @/lib/db/query-optimizer directly
export type {
  QueryType,
  QueryLog,
  OptimizationSuggestion,
  QueryCacheConfig,
  BatchConfig,
  QueryStats,
} from '../db/query-optimizer'

// REMOVED: The following export referenced non-existent file:
// - createCompressionMiddleware, withCompression, CompressionPresets from '@/middleware/response-compression'
// - CompressionAlgorithm, CompressionConfig, CompressionStats, CompressionResult types
//
// This file does not exist in the current codebase. If compression middleware is needed,
// it should be implemented first before being exported from here.