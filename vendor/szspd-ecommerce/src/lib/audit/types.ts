/**
 * 审计日志系统 - 数据模型
 * @module lib/audit/types
 * @version 1.12.0
 */

// ============================================================================
// 核心类型定义
// ============================================================================

/**
 * 审计操作类型
 */
export type AuditAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'ADMIN';

/**
 * 审计结果状态
 */
export type AuditStatus = 'success' | 'failure';

/**
 * 审计日志条目
 */
export interface AuditLogEntry {
  /** 日志ID */
  id: string;
  /** 用户ID */
  userId: string;
  /** 用户名 (可选) */
  username?: string;
  /** 操作类型 */
  action: AuditAction;
  /** 资源类型 */
  resource: string;
  /** 资源ID */
  resourceId?: string;
  /** 操作状态 */
  status: AuditStatus;
  /** IP地址 */
  ipAddress?: string;
  /** 用户代理 */
  userAgent?: string;
  /** 元数据 */
  metadata?: Record<string, unknown>;
  /** 时间戳 */
  timestamp: Date;
  /** 错误信息 */
  error?: string;
}

/**
 * 审计日志查询过滤器
 */
export interface AuditLogFilter {
  /** 用户ID列表 */
  userId?: string;
  /** 用户名列表 */
  username?: string;
  /** 操作类型列表 */
  action?: AuditAction;
  /** 资源类型 */
  resource?: string;
  /** 资源ID */
  resourceId?: string;
  /** 操作状态 */
  status?: AuditStatus;
  /** 开始时间 */
  startTime?: Date;
  /** 结束时间 */
  endTime?: Date;
  /** IP地址 */
  ipAddress?: string;
  /** 搜索关键词 */
  search?: string;
}

/**
 * 审计日志查询选项
 */
export interface AuditLogQueryOptions extends AuditLogFilter {
  /** 排序字段 */
  sortBy?: 'timestamp' | 'userId' | 'action';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
  /** 偏移量 */
  offset?: number;
  /** 限制数量 */
  limit?: number;
}

/**
 * 审计日志查询结果
 */
export interface AuditLogQueryResult {
  /** 日志列表 */
  logs: AuditLogEntry[];
  /** 总数 */
  total: number;
  /** 偏移量 */
  offset: number;
  /** 限制数量 */
  limit: number;
}

/**
 * 审计日志导出选项
 */
export interface AuditLogExportOptions extends AuditLogFilter {
  /** 导出格式 */
  format: 'json' | 'csv';
  /** 时间范围开始 */
  startTime: Date;
  /** 时间范围结束 */
  endTime: Date;
  /** 最大导出数量 */
  maxRecords?: number;
}

/**
 * 审计日志统计信息
 */
export interface AuditLogStats {
  /** 总日志数 */
  totalLogs: number;
  /** 按操作类型统计 */
  byAction: Record<AuditAction, number>;
  /** 按状态统计 */
  byStatus: Record<AuditStatus, number>;
  /** 按用户统计 (top 10) */
  topUsers: Array<{ userId: string; username?: string; count: number }>;
  /** 按资源类型统计 */
  byResource: Record<string, number>;
}

/**
 * 审计日志配置
 */
export interface AuditLogConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 日志保留天数 (默认90天) */
  retentionDays: number;
  /** 是否异步写入 */
  asyncWrite: boolean;
  /** 批量写入大小 */
  batchSize: number;
  /** 批量写入间隔 (ms) */
  batchInterval: number;
  /** 最大日志条数 (内存存储) */
  maxLogs?: number;
}

/**
 * 审计日志存储接口
 */
export interface IAuditLogStorage {
  /** 添加日志 */
  add(log: AuditLogEntry): Promise<void>;
  /** 批量添加日志 */
  addBatch(logs: AuditLogEntry[]): Promise<void>;
  /** 查询日志 */
  query(options: AuditLogQueryOptions): Promise<AuditLogQueryResult>;
  /** 按ID获取日志 */
  getById(id: string): Promise<AuditLogEntry | null>;
  /** 删除过期日志 */
  deleteExpired(days: number): Promise<number>;
  /** 获取统计信息 */
  getStats(filter?: AuditLogFilter): Promise<AuditLogStats>;
  /** 清空所有日志 */
  clear(): Promise<void>;
}
