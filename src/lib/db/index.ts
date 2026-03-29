/**
 * Database Module - Public API
 *
 * NOTE: This module re-exports core database functionality from connection.ts
 * to maintain backward compatibility while avoiding circular dependencies.
 *
 * For advanced database operations, import directly from specific modules:
 * - Batch operations: import { batchInsert } from '@/lib/db/batch-operations'
 * - Query optimizations: import { getOptimizedFeedbackStats } from '@/lib/db/query-optimizations'
 * - Migrations: import { migrate } from '@/lib/db/migrations'
 */

// Import functions first
import {
  getDatabase,
  getDatabaseAsync,
  closeDatabase,
  getDatabaseStats,
  vacuumDatabase,
  analyzeDatabase,
  getDatabaseSize,
  type DatabaseConnection,
  type DatabaseResult,
  type DatabaseStatement,
} from './connection';

import {
  migrate,
  optimizeDatabase,
  getDatabaseHealth,
} from './migrations';

// Re-export for named exports
export {
  getDatabase,
  getDatabaseAsync,
  closeDatabase,
  getDatabaseStats,
  vacuumDatabase,
  analyzeDatabase,
  getDatabaseSize,
  migrate,
  optimizeDatabase,
  getDatabaseHealth,
  type DatabaseConnection,
  type DatabaseResult,
  type DatabaseStatement,
};

// Re-export batch operations
export * from './batch-operations';

// Re-export query optimizations
export * from './query-optimizations';

// Export default for backward compatibility
export default {
  getDatabase,
  getDatabaseAsync,
  closeDatabase,
  getDatabaseStats,
  vacuumDatabase,
  analyzeDatabase,
  getDatabaseSize,
  migrate,
  optimizeDatabase,
  getDatabaseHealth,
};
