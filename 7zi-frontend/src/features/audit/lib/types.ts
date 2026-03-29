/**
 * Audit Log Types
 *
 * 审计日志类型定义
 */

/**
 * 审计事件类型
 */
export enum AuditEventType {
  // 认证事件
  LOGIN_SUCCESS = 'login.success',
  LOGIN_FAILED = 'login.failed',
  LOGOUT = 'logout',
  REGISTER = 'register',
  PASSWORD_RESET_REQUEST = 'password.reset.request',
  PASSWORD_RESET_SUCCESS = 'password.reset.success',
  PASSWORD_CHANGE = 'password.change',

  // 权限事件
  PERMISSION_GRANTED = 'permission.granted',
  PERMISSION_REVOKED = 'permission.revoked',
  ROLE_CHANGE = 'role.change',
  ROLE_GRANT = 'role.grant',
  ROLE_REVOKE = 'role.revoke',

  // 数据访问事件
  DATA_READ = 'data.read',
  DATA_CREATED = 'data.created',
  DATA_UPDATED = 'data.updated',
  DATA_DELETED = 'data.deleted',
  DATA_EXPORTED = 'data.exported',

  // 管理员操作
  ADMIN_ACTION = 'admin.action',
  ADMIN_SETTINGS_CHANGE = 'admin.settings.change',
  ADMIN_USER_CREATE = 'admin.user.create',
  ADMIN_USER_DELETE = 'admin.user.delete',
  ADMIN_USER_UPDATE = 'admin.user.update',

  // API 事件
  API_ACCESS = 'api.access',
  API_RATE_LIMIT_EXCEEDED = 'api.rate_limit.exceeded',
  API_ERROR = 'api.error',

  // 安全事件
  SECURITY_VIOLATION = 'security.violation',
  SECURITY_ALERT = 'security.alert',
  SUSPICIOUS_ACTIVITY = 'suspicious.activity',
}

/**
 * 审计日志级别
 */
export enum AuditLogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * 审计日志条目接口
 */
export interface AuditLogEntry {
  /**
   * 唯一标识符
   */
  id: string;

  /**
   * 事件类型
   */
  eventType: AuditEventType;

  /**
   * 日志级别
   */
  level: AuditLogLevel;

  /**
   * 用户 ID（如果已认证）
   */
  userId?: string;

  /**
   * 用户名（如果已认证）
   */
  username?: string;

  /**
   * IP 地址
   */
  ipAddress: string;

  /**
   * User-Agent
   */
  userAgent?: string;

  /**
   * 请求路径
   */
  path?: string;

  /**
   * HTTP 方法
   */
  method?: string;

  /**
   * 事件描述
   */
  message: string;

  /**
   * 事件详情（JSON 格式）
   */
  details?: Record<string, unknown>;

  /**
   * 资源类型
   */
  resourceType?: string;

  /**
   * 资源 ID
   */
  resourceId?: string;

  /**
   * 操作结果
   */
  success: boolean;

  /**
   * 错误信息（如果失败）
   */
  error?: string;

  /**
   * 时间戳
   */
  timestamp: Date;

  /**
   * 会话 ID
   */
  sessionId?: string;
}

/**
 * 审计日志查询参数
 */
export interface AuditLogQuery {
  /**
   * 用户 ID
   */
  userId?: string;

  /**
   * 事件类型
   */
  eventType?: AuditEventType | AuditEventType[];

  /**
   * 日志级别
   */
  level?: AuditLogLevel | AuditLogLevel[];

  /**
   * IP 地址
   */
  ipAddress?: string;

  /**
   * 资源类型
   */
  resourceType?: string;

  /**
   * 资源 ID
   */
  resourceId?: string;

  /**
   * 开始时间
   */
  startDate?: Date;

  /**
   * 结束时间
   */
  endDate?: Date;

  /**
   * 操作结果
   */
  success?: boolean;

  /**
   * 分页偏移量
   */
  offset?: number;

  /**
   * 分页限制
   */
  limit?: number;

  /**
   * 排序字段
   */
  sortBy?: 'timestamp' | 'level' | 'eventType';

  /**
   * 排序方向
   */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 审计日志统计
 */
export interface AuditLogStats {
  /**
   * 总日志数
   */
  totalLogs: number;

  /**
   * 成功操作数
   */
  successCount: number;

  /**
   * 失败操作数
   */
  failureCount: number;

  /**
   * 按事件类型分组统计
   */
  byEventType: Record<string, number>;

  /**
   * 按日志级别分组统计
   */
  byLevel: Record<string, number>;

  /**
   * 按用户分组统计
   */
  byUser: Record<string, number>;

  /**
   * 时间范围
   */
  dateRange: {
    start: Date;
    end: Date;
  };
}
