/**
 * Type definitions for database health and performance metrics
 */

export interface DatabaseHealth {
  size: {
    sizeInMB: number;
    fragmentationPercent: number;
  };
  migrationVersion: number;
  latestMigration: number;
  needsMigration: boolean;
}

export interface PerformanceReport {
  timestamp: string;
  slowQueries: SlowQuery[];
  tableAnalyses: TableAnalysis[];
  recommendations: string[];
  databaseSize: DatabaseSizeInfo;
  missingIndexes: MissingIndex[];
}

export interface SlowQuery {
  sql: string;
  executionTime: number;
  threshold: number;
  suggestedIndex?: string;
  tableName?: string;
}

export interface TableAnalysis {
  name: string;
  rowCount: number;
  indexes: TableIndex[];
  size: number;
  suggestions: string[];
}

export interface TableIndex {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface DatabaseSizeInfo {
  pageSize: number;
  pageCount: number;
  freePages: number;
  sizeInMB: number;
}

export interface MissingIndex {
  table: string;
  columns: string[];
  reason: string;
}

export interface CacheStatistics {
  hits: number;
  misses: number;
  hitRate: number;
  entries: number;
  totalSize: number;
  evictions: number;
}
