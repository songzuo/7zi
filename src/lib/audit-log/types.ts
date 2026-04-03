/**
 * 审计日志系统 - 类型定义
 * @module lib/audit-log/types
 * @version 1.10.0
 */

// ============================================================================
// 核心类型定义
// ============================================================================

/**
 * 审计事件级别
 */
export type AuditLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

/**
 * 审计事件类别
 */
export type AuditEventCategory =
  | 'user' // 用户操作
  | 'system' // 系统事件
  | 'business' // 业务事件
  | 'security' // 安全事件
  | 'compliance' // 合规事件
  | 'data' // 数据操作
  | 'admin'; // 管理操作

/**
 * 审计操作类型
 */
export type AuditActionType =
  // CRUD 操作
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  // 认证操作
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'password_change'
  | 'password_reset'
  | 'mfa_enabled'
  | 'mfa_disabled'
  // 权限操作
  | 'permission_grant'
  | 'permission_revoke'
  | 'role_assign'
  | 'role_remove'
  // 业务操作
  | 'export'
  | 'import'
  | 'approve'
  | 'reject'
  | 'submit'
  | 'cancel'
  // 系统操作
  | 'config_change'
  | 'system_start'
  | 'system_stop'
  | 'backup'
  | 'restore'
  // 其他
  | 'custom';

/**
 * 审计结果状态
 */
export type AuditResultStatus = 'success' | 'failure' | 'partial' | 'pending';

/**
 * 审计事件严重程度
 */
export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * 敏感数据字段配置
 */
export interface SensitiveFieldConfig {
  /** 字段路径 (支持嵌套，如 user.password) */
  path: string;
  /** 脱敏规则 */
  mask: 'full' | 'partial' | 'hash';
  /** 是否加密存储 */
  encrypt?: boolean;
}

/**
 * 资源信息
 */
export interface AuditResource {
  /** 资源类型 */
  type: string;
  /** 资源ID */
  id?: string;
  /** 资源名称 */
  name?: string;
  /** 资源附加信息 */
  metadata?: Record<string, unknown>;
}

/**
 * 用户上下文信息
 */
export interface AuditUserContext {
  /** 用户ID */
  userId: string;
  /** 用户名 */
  username?: string;
  /** 用户邮箱 */
  email?: string;
  /** 用户角色 */
  roles?: string[];
  /** 会话ID */
  sessionId?: string;
  /** 组织ID */
  organizationId?: string;
}

/**
 * 请求上下文信息
 */
export interface AuditRequestContext {
  /** 请求ID */
  requestId?: string;
  /** 客户端IP */
  clientIp?: string;
  /** 用户代理 */
  userAgent?: string;
  /** 请求路径 */
  path?: string;
  /** 请求方法 */
  method?: string;
  /** 来源应用 */
  source?: string;
}

/**
 * 审计事件变更详情
 */
export interface AuditChangeDetail {
  /** 字段路径 */
  field: string;
  /** 旧值 */
  oldValue?: unknown;
  /** 新值 */
  newValue?: unknown;
  /** 是否敏感字段 */
  sensitive?: boolean;
}

/**
 * 审计事件主体
 */
export interface AuditEvent {
  /** 事件唯一ID */
  id: string;
  /** 事件时间戳 */
  timestamp: Date;
  /** 事件级别 */
  level: AuditLogLevel;
  /** 事件类别 */
  category: AuditEventCategory;
  /** 操作类型 */
  action: AuditActionType;
  /** 自定义操作名称 */
  actionName?: string;
  /** 结果状态 */
  status: AuditResultStatus;
  /** 严重程度 */
  severity: AuditSeverity;
  /** 事件消息 */
  message: string;
  /** 事件详情 */
  details?: Record<string, unknown>;
  /** 用户上下文 */
  user?: AuditUserContext;
  /** 请求上下文 */
  request?: AuditRequestContext;
  /** 资源信息 */
  resource?: AuditResource;
  /** 变更详情列表 */
  changes?: AuditChangeDetail[];
  /** 错误信息 */
  error?: {
    code?: string;
    message: string;
    stack?: string;
  };
  /** 关联事件ID */
  correlationId?: string;
  /** 父事件ID (用于事件链) */
  parentId?: string;
  /** 标签 */
  tags?: string[];
  /** 自定义元数据 */
  metadata?: Record<string, unknown>;
  /** 数据完整性签名 */
  signature?: string;
}

// ============================================================================
// 查询类型
// ============================================================================

/**
 * 时间范围
 */
export interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * 审计日志查询条件
 */
export interface AuditQueryFilter {
  /** 时间范围 */
  timeRange?: TimeRange;
  /** 用户ID列表 */
  userIds?: string[];
  /** 用户名列表 */
  usernames?: string[];
  /** 组织ID列表 */
  organizationIds?: string[];
  /** 事件级别列表 */
  levels?: (AuditLogLevel | string)[];
  /** 事件类别列表 */
  categories?: (AuditEventCategory | string)[];
  /** 操作类型列表 */
  actions?: (AuditActionType | string)[];
  /** 结果状态列表 */
  statuses?: (AuditResultStatus | string)[];
  /** 严重程度列表 */
  severities?: (AuditSeverity | string)[];
  /** 资源类型列表 */
  resourceTypes?: string[];
  /** 资源ID列表 */
  resourceIds?: string[];
  /** 全文搜索关键词 */
  searchQuery?: string;
  /** 标签列表 */
  tags?: string[];
  /** 会话ID列表 */
  sessionIds?: string[];
  /** 关联事件ID */
  correlationId?: string;
  /** 客户端IP列表 */
  clientIps?: string[];
}

/**
 * 排序选项
 */
export interface AuditSortOption {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * 分页选项
 */
export interface AuditPagination {
  /** 页码 (从1开始) */
  page: number;
  /** 每页数量 */
  pageSize: number;
}

/**
 * 审计日志查询选项
 */
export interface AuditQueryOptions {
  /** 查询条件 */
  filter?: AuditQueryFilter;
  /** 排序选项 */
  sort?: AuditSortOption;
  /** 分页选项 */
  pagination?: AuditPagination;
  /** 是否包含详情 */
  includeDetails?: boolean;
  /** 是否包含变更记录 */
  includeChanges?: boolean;
  /** 是否包含元数据 */
  includeMetadata?: boolean;
}

/**
 * 查询结果
 */
export interface AuditQueryResult<T = AuditEvent> {
  /** 数据列表 */
  data: T[];
  /** 总数 */
  total: number;
  /** 当前页 */
  page: number;
  /** 每页数量 */
  pageSize: number;
  /** 总页数 */
  totalPages: number;
  /** 查询耗时(ms) */
  duration: number;
}

// ============================================================================
// 统计分析类型
// ============================================================================

/**
 * 统计聚合维度
 */
export type AuditAggregationField =
  | 'user'
  | 'action'
  | 'category'
  | 'level'
  | 'severity'
  | 'status'
  | 'resource_type'
  | 'hour'
  | 'day'
  | 'week'
  | 'month';

/**
 * 统计聚合选项
 */
export interface AuditAggregationOptions {
  /** 聚合字段 */
  field: AuditAggregationField;
  /** 时间范围 */
  timeRange?: TimeRange;
  /** 额外过滤条件 */
  filter?: AuditQueryFilter;
  /** 分组数量限制 */
  limit?: number;
}

/**
 * 统计聚合结果项
 */
export interface AuditAggregationItem {
  /** 分组键值 */
  key: string;
  /** 计数 */
  count: number;
  /** 百分比 */
  percentage: number;
  /** 子聚合 (可选) */
  subAggregations?: AuditAggregationItem[];
}

/**
 * 统计聚合结果
 */
export interface AuditAggregationResult {
  /** 聚合字段 */
  field: AuditAggregationField;
  /** 时间范围 */
  timeRange: TimeRange;
  /** 总计数 */
  total: number;
  /** 聚合结果列表 */
  items: AuditAggregationItem[];
  /** 查询耗时(ms) */
  duration: number;
}

/**
 * 趋势统计点
 */
export interface AuditTrendPoint {
  /** 时间点 */
  timestamp: Date;
  /** 计数 */
  count: number;
  /** 成功数 */
  successCount: number;
  /** 失败数 */
  failureCount: number;
  /** 按级别分组 */
  byLevel?: Record<AuditLogLevel, number>;
  /** 按类别分组 */
  byCategory?: Record<AuditEventCategory, number>;
}

/**
 * 趋势统计结果
 */
export interface AuditTrendResult {
  /** 时间范围 */
  timeRange: TimeRange;
  /** 时间间隔 (小时/天/周) */
  interval: 'hour' | 'day' | 'week';
  /** 趋势数据点 */
  points: AuditTrendPoint[];
  /** 查询耗时(ms) */
  duration: number;
}

/**
 * 用户活动统计
 */
export interface UserActivityStats {
  /** 用户ID */
  userId: string;
  /** 用户名 */
  username?: string;
  /** 总操作数 */
  totalActions: number;
  /** 成功操作数 */
  successActions: number;
  /** 失败操作数 */
  failedActions: number;
  /** 最后活动时间 */
  lastActivity: Date;
  /** 最常用操作 */
  topActions: Array<{ action: AuditActionType; count: number }>;
  /** 最常访问资源 */
  topResources: Array<{ type: string; count: number }>;
}

/**
 * 资源访问统计
 */
export interface ResourceAccessStats {
  /** 资源类型 */
  resourceType: string;
  /** 资源ID */
  resourceId?: string;
  /** 总访问次数 */
  totalAccess: number;
  /** 读取次数 */
  readCount: number;
  /** 写入次数 */
  writeCount: number;
  /** 删除次数 */
  deleteCount: number;
  /** 唯一访问用户数 */
  uniqueUsers: number;
  /** 最后访问时间 */
  lastAccess: Date;
}

// ============================================================================
// 合规报告类型
// ============================================================================

/**
 * 合规报告类型
 */
export type ComplianceReportType =
  | 'user_access'
  | 'permission_changes'
  | 'data_access'
  | 'security_events'
  | 'admin_actions'
  | 'failed_operations'
  | 'custom';

/**
 * 合规报告配置
 */
export interface ComplianceReportConfig {
  /** 报告类型 */
  type: ComplianceReportType;
  /** 报告名称 */
  name: string;
  /** 描述 */
  description?: string;
  /** 时间范围 */
  timeRange: TimeRange;
  /** 过滤条件 */
  filter?: AuditQueryFilter;
  /** 包含统计摘要 */
  includeSummary?: boolean;
  /** 包含详细事件列表 */
  includeDetails?: boolean;
  /** 包含图表数据 */
  includeCharts?: boolean;
  /** 输出格式 */
  format: 'json' | 'csv' | 'pdf';
  /** 是否包含敏感数据 */
  includeSensitive?: boolean;
}

/**
 * 合规报告摘要
 */
export interface ComplianceReportSummary {
  /** 总事件数 */
  totalEvents: number;
  /** 唯一用户数 */
  uniqueUsers: number;
  /** 成功事件数 */
  successCount: number;
  /** 失败事件数 */
  failureCount: number;
  /** 关键发现 */
  keyFindings: string[];
  /** 风险评估 */
  riskAssessment?: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
}

/**
 * 合规报告
 */
export interface ComplianceReport {
  /** 报告ID */
  id: string;
  /** 生成时间 */
  generatedAt: Date;
  /** 报告配置 */
  config: ComplianceReportConfig;
  /** 摘要 */
  summary: ComplianceReportSummary;
  /** 统计数据 */
  statistics?: AuditAggregationResult[];
  /** 趋势数据 */
  trends?: AuditTrendResult;
  /** 事件列表 */
  events?: AuditEvent[];
  /** 导出文件路径 */
  exportPath?: string;
}

// ============================================================================
// 配置类型
// ============================================================================

/**
 * 日志保留策略
 */
export interface RetentionPolicy {
  /** 保留天数 */
  retentionDays: number;
  /** 是否归档 */
  archive: boolean;
  /** 归档路径 */
  archivePath?: string;
  /** 是否压缩 */
  compress: boolean;
  /** 压缩格式 */
  compressionFormat?: 'gzip' | 'zip';
  /** 删除前通知天数 */
  notifyBeforeDeleteDays?: number;
}

/**
 * 审计日志配置
 */
export interface AuditLogConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 服务名称 */
  serviceName: string;
  /** 日志级别阈值 */
  levelThreshold: AuditLogLevel;
  /** 敏感字段配置 */
  sensitiveFields: SensitiveFieldConfig[];
  /** 保留策略 */
  retention: RetentionPolicy;
  /** 是否签名验证 */
  enableSigning: boolean;
  /** 签名密钥 (用于完整性校验) */
  signingKey?: string;
  /** 是否异步写入 */
  asyncWrite: boolean;
  /** 批量写入大小 */
  batchSize?: number;
  /** 批量写入间隔 (ms) */
  batchInterval?: number;
  /** 最大存储大小 (字节) */
  maxStorageSize?: number;
  /** 是否记录请求体 */
  logRequestBody?: boolean;
  /** 是否记录响应体 */
  logResponseBody?: boolean;
  /** 请求体最大记录大小 */
  maxBodyLogSize?: number;
  /** 排除的路径 */
  excludePaths?: string[];
  /** 自定义处理器 */
  customProcessors?: string[];
}

/**
 * 审计日志存储接口
 */
export interface AuditLogStorage {
  /** 写入事件 */
  write(event: AuditEvent): Promise<void>;
  /** 批量写入 */
  writeBatch(events: AuditEvent[]): Promise<void>;
  /** 查询事件 */
  query(options: AuditQueryOptions): Promise<AuditQueryResult>;
  /** 按ID获取 */
  getById(id: string): Promise<AuditEvent | null>;
  /** 删除事件 */
  delete(id: string): Promise<boolean>;
  /** 按条件删除 */
  deleteByFilter(filter: AuditQueryFilter): Promise<number>;
  /** 获取存储统计 */
  getStats(): Promise<AuditStorageStats>;
  /** 清理过期数据 */
  cleanup(): Promise<number>;
  /** 关闭连接 */
  close(): Promise<void>;
}

/**
 * 存储统计信息
 */
export interface AuditStorageStats {
  /** 总事件数 */
  totalEvents: number;
  /** 存储大小 (字节) */
  storageSize: number;
  /** 最早事件时间 */
  earliestEvent?: Date;
  /** 最新事件时间 */
  latestEvent?: Date;
  /** 按类别统计 */
  byCategory: Record<AuditEventCategory, number>;
  /** 按级别统计 */
  byLevel: Record<AuditLogLevel, number>;
}

/**
 * 审计日志处理器接口
 */
export interface AuditLogProcessor {
  /** 处理器名称 */
  name: string;
  /** 处理事件 */
  process(event: AuditEvent): Promise<AuditEvent>;
  /** 是否异步 */
  async?: boolean;
}

/**
 * 审计日志导出选项
 */
export interface AuditExportOptions {
  /** 输出格式 */
  format: 'json' | 'csv' | 'xlsx';
  /** 时间范围 */
  timeRange?: TimeRange;
  /** 过滤条件 */
  filter?: AuditQueryFilter;
  /** 输出路径 */
  outputPath?: string;
  /** 是否包含敏感数据 */
  includeSensitive?: boolean;
  /** 是否压缩 */
  compress?: boolean;
  /** 最大记录数 */
  maxRecords?: number;
}

/**
 * 审计日志导入选项
 */
export interface AuditImportOptions {
  /** 输入文件路径 */
  inputPath: string;
  /** 格式 */
  format: 'json' | 'csv';
  /** 是否覆盖重复 */
  overwrite?: boolean;
  /** 是否验证签名 */
  verifySignature?: boolean;
  /** 是否跳过无效记录 */
  skipInvalid?: boolean;
}

/**
 * 审计日志导入结果
 */
export interface AuditImportResult {
  /** 导入成功数 */
  imported: number;
  /** 跳过数 */
  skipped: number;
  /** 失败数 */
  failed: number;
  /** 错误列表 */
  errors?: Array<{ line: number; error: string }>;
}
