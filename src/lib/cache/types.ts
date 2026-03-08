/**
 * 缓存系统类型定义
 */

export interface CacheOptions {
  /** 缓存键前缀 */
  prefix?: string;
  /** 默认 TTL (秒) */
  defaultTTL?: number;
  /** 最大条目数 (内存缓存) */
  maxEntries?: number;
  /** 是否启用压缩 */
  compression?: boolean;
  /** Redis 连接 URL */
  redisUrl?: string;
  /** Redis 键前缀 */
  redisPrefix?: string;
}

export interface CacheEntry<T = unknown> {
  /** 缓存值 */
  value: T;
  /** 过期时间戳 (毫秒) */
  expiresAt: number;
  /** 创建时间戳 */
  createdAt: number;
  /** 最后访问时间戳 */
  accessedAt: number;
  /** 访问次数 */
  accessCount: number;
  /** 标签 (用于批量失效) */
  tags?: string[];
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

export interface CacheStats {
  /** 总请求数 */
  totalRequests: number;
  /** 缓存命中数 */
  hits: number;
  /** 缓存未命中数 */
  misses: number;
  /** 命中率 */
  hitRate: number;
  /** 当前条目数 */
  entries: number;
  /** 内存使用 (字节) */
  memoryUsage: number;
  /** 驱逐次数 */
  evictions: number;
  /** 过期清理次数 */
  expirations: number;
}

export interface CacheInvalidateOptions {
  /** 按键模式匹配 */
  pattern?: string;
  /** 按标签失效 */
  tags?: string[];
  /** 强制删除所有 */
  all?: boolean;
}

export type CacheProvider = 'memory' | 'redis' | 'layered';

export interface CacheProviderConfig {
  type: CacheProvider;
  memory?: {
    maxEntries: number;
    defaultTTL: number;
    cleanupInterval: number;
  };
  redis?: {
    url: string;
    prefix: string;
    defaultTTL: number;
    retryStrategy: 'exponential' | 'linear' | 'fixed';
    maxRetries: number;
  };
  layered?: {
    l1: CacheProviderConfig;
    l2: CacheProviderConfig;
    writeStrategy: 'write-through' | 'write-behind' | 'write-around';
    readStrategy: 'look-aside' | 'read-through';
  };
}

export type TTL = number | string;

/**
 * 预定义缓存键
 */
export const CacheKeys = {
  // 任务相关
  TASKS_LIST: 'tasks:list',
  TASK_BY_ID: (id: string) => `task:${id}`,
  TASKS_BY_STATUS: (status: string) => `tasks:status:${status}`,
  TASKS_BY_ASSIGNEE: (assignee: string) => `tasks:assignee:${assignee}`,

  // 仪表盘相关
  DASHBOARD_STATS: 'dashboard:stats',
  DASHBOARD_MEMBERS: 'dashboard:members',
  DASHBOARD_ACTIVITY: 'dashboard:activity',

  // 知识图谱相关
  KNOWLEDGE_NODES: 'knowledge:nodes',
  KNOWLEDGE_EDGES: 'knowledge:edges',
  KNOWLEDGE_NODE: (id: string) => `knowledge:node:${id}`,

  // 健康检查
  HEALTH_STATUS: 'health:status',

  // 日志相关
  LOGS_LIST: 'logs:list',
  LOGS_BY_DATE: (date: string) => `logs:date:${date}`,
} as const;

/**
 * 预定义 TTL (秒)
 */
export const CacheTTL = {
  // 短期缓存
  SHORT: 60, // 1 分钟
  MINUTE_5: 300, // 5 分钟
  MINUTE_15: 900, // 15 分钟

  // 中期缓存
  HOUR_1: 3600, // 1 小时
  HOUR_6: 21600, // 6 小时
  HOUR_12: 43200, // 12 小时

  // 长期缓存
  DAY_1: 86400, // 1 天
  DAY_7: 604800, // 7 天
  DAY_30: 2592000, // 30 天

  // 永久 (实际为 1 年)
  FOREVER: 31536000,
} as const;