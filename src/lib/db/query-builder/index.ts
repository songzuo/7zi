/**
 * Query Builder - 统一导出
 *
 * 导出所有查询构建器相关的类型、类和函数
 * 保持向后兼容，所有原有的导入路径仍然有效
 */

// 核心类型和类
export type {
  QueryCondition,
  JoinConfig,
  SubqueryConfig,
  PaginationOptions,
  SortOptions,
  QueryBuilderConfig,
  BuiltQuery,
  BatchResult,
  QueryCacheConfig,
} from './query-builder'

export { QueryBuilder, buildQuery, buildWhereQuery } from './query-builder'

// 缓存相关
export { PreparedStatementCache } from './query-cache'

// 重新导出缓存函数，保持向后兼容
export { getCacheStats, clearAllCaches } from './query-cache'

// 执行相关
export { executeQuery, batchInsert, batchUpdate, batchDelete } from './query-executor'
