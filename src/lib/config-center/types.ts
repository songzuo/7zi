/**
 * 配置中心类型定义
 * @module config-center/types
 * @version 1.10.0
 */

/**
 * 配置环境类型
 */
export type ConfigEnvironment = 'development' | 'staging' | 'production' | 'test';

/**
 * 配置值类型
 */
export type ConfigValueType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'json';

/**
 * 配置状态
 */
export type ConfigStatus = 'active' | 'deprecated' | 'archived' | 'draft';

/**
 * 配置变更操作类型
 */
export type ConfigChangeAction = 'create' | 'update' | 'delete' | 'rollback' | 'import';

/**
 * 配置项定义
 */
export interface ConfigItem {
  /** 配置项唯一标识 */
  id: string;
  /** 配置键名 */
  key: string;
  /** 配置值 */
  value: unknown;
  /** 值类型 */
  valueType: ConfigValueType;
  /** 所属环境 */
  environment: ConfigEnvironment;
  /** 所属分组 */
  group: string;
  /** 配置描述 */
  description?: string;
  /** 配置状态 */
  status: ConfigStatus;
  /** 是否敏感配置 */
  sensitive: boolean;
  /** 是否可动态更新 */
  dynamic: boolean;
  /** 默认值 */
  defaultValue?: unknown;
  /** 验证规则 */
  validation?: ConfigValidation;
  /** 元数据 */
  metadata?: Record<string, unknown>;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 创建者 */
  createdBy: string;
  /** 更新者 */
  updatedBy: string;
  /** 版本号 */
  version: number;
  /** 标签 */
  tags?: string[];
}

/**
 * 配置验证规则
 */
export interface ConfigValidation {
  /** 必填 */
  required?: boolean;
  /** 最小值/最小长度 */
  min?: number;
  /** 最大值/最大长度 */
  max?: number;
  /** 正则表达式 */
  pattern?: string;
  /** 枚举值 */
  enum?: unknown[];
  /** 自定义验证函数 */
  customValidator?: string;
  /** 错误提示信息 */
  errorMessage?: string;
}

/**
 * 配置版本记录
 */
export interface ConfigVersion {
  /** 版本号 */
  version: number;
  /** 配置项ID */
  configId: string;
  /** 配置键名 */
  key: string;
  /** 配置值 */
  value: unknown;
  /** 变更描述 */
  changeDescription?: string;
  /** 变更类型 */
  changeAction: ConfigChangeAction;
  /** 变更者 */
  changedBy: string;
  /** 变更时间 */
  changedAt: Date;
  /** 是否为回滚版本 */
  isRollback?: boolean;
  /** 回滚自版本 */
  rollbackFrom?: number;
  /** 审计追踪ID */
  auditId?: string;
}

/**
 * 配置分组
 */
export interface ConfigGroup {
  /** 分组ID */
  id: string;
  /** 分组名称 */
  name: string;
  /** 分组标识 */
  key: string;
  /** 父分组ID */
  parentId?: string;
  /** 分组描述 */
  description?: string;
  /** 排序 */
  order: number;
  /** 图标 */
  icon?: string;
  /** 元数据 */
  metadata?: Record<string, unknown>;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 配置模板
 */
export interface ConfigTemplate {
  /** 模板ID */
  id: string;
  /** 模板名称 */
  name: string;
  /** 模板标识 */
  key: string;
  /** 模板描述 */
  description?: string;
  /** 模板配置项 */
  configs: Omit<ConfigItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'version'>[];
  /** 继承的模板ID */
  inherits?: string[];
  /** 元数据 */
  metadata?: Record<string, unknown>;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 创建者 */
  createdBy: string;
}

/**
 * 配置权限
 */
export interface ConfigPermission {
  /** 权限ID */
  id: string;
  /** 用户ID或角色ID */
  principalId: string;
  /** 主体类型 */
  principalType: 'user' | 'role' | 'group';
  /** 资源类型 */
  resourceType: 'config' | 'group' | 'environment' | 'template';
  /** 资源ID */
  resourceId: string;
  /** 权限操作 */
  actions: ConfigPermissionAction[];
  /** 是否允许 */
  allow: boolean;
  /** 条件 */
  conditions?: PermissionCondition[];
  /** 创建时间 */
  createdAt: Date;
  /** 过期时间 */
  expiresAt?: Date;
}

/**
 * 权限操作类型
 */
export type ConfigPermissionAction = 
  | 'read' 
  | 'write' 
  | 'delete' 
  | 'admin' 
  | 'publish' 
  | 'rollback';

/**
 * 权限条件
 */
export interface PermissionCondition {
  /** 条件类型 */
  type: 'environment' | 'time' | 'ip' | 'custom';
  /** 操作符 */
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'range';
  /** 值 */
  value: unknown;
}

/**
 * API 密钥
 */
export interface ApiKey {
  /** 密钥ID */
  id: string;
  /** 密钥名称 */
  name: string;
  /** 密钥值 (hash) */
  keyHash: string;
  /** 密钥前缀 (用于识别) */
  keyPrefix: string;
  /** 关联用户ID */
  userId: string;
  /** 权限范围 */
  scopes: string[];
  /** 环境限制 */
  environments?: ConfigEnvironment[];
  /** IP白名单 */
  ipWhitelist?: string[];
  /** 请求限制 */
  rateLimit?: RateLimitConfig;
  /** 是否启用 */
  enabled: boolean;
  /** 创建时间 */
  createdAt: Date;
  /** 过期时间 */
  expiresAt?: Date;
  /** 最后使用时间 */
  lastUsedAt?: Date;
  /** 使用次数 */
  usageCount: number;
}

/**
 * 速率限制配置
 */
export interface RateLimitConfig {
  /** 时间窗口 (秒) */
  windowMs: number;
  /** 最大请求数 */
  maxRequests: number;
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 审计日志
 */
export interface ConfigAuditLog {
  /** 日志ID */
  id: string;
  /** 操作类型 */
  action: ConfigChangeAction;
  /** 资源类型 */
  resourceType: 'config' | 'group' | 'template' | 'api_key' | 'permission';
  /** 资源ID */
  resourceId: string;
  /** 资源名称 */
  resourceName: string;
  /** 操作前数据 */
  before?: unknown;
  /** 操作后数据 */
  after?: unknown;
  /** 操作者ID */
  operatorId: string;
  /** 操作者类型 */
  operatorType: 'user' | 'api_key' | 'system';
  /** 操作者IP */
  operatorIp?: string;
  /** 用户代理 */
  userAgent?: string;
  /** 操作时间 */
  timestamp: Date;
  /** 操作结果 */
  result: 'success' | 'failed';
  /** 错误信息 */
  errorMessage?: string;
  /** 请求ID */
  requestId?: string;
  /** 环境信息 */
  environment?: ConfigEnvironment;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 配置缓存项
 */
export interface ConfigCacheItem {
  /** 配置键 */
  key: string;
  /** 配置值 */
  value: unknown;
  /** 环境 */
  environment: ConfigEnvironment;
  /** 缓存时间 */
  cachedAt: Date;
  /** 过期时间 */
  expiresAt: Date;
  /** 版本号 */
  version: number;
  /** 命中次数 */
  hitCount: number;
}

/**
 * 配置同步状态
 */
export interface ConfigSyncStatus {
  /** 同步ID */
  id: string;
  /** 源节点 */
  sourceNode: string;
  /** 目标节点 */
  targetNode: string;
  /** 同步状态 */
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  /** 同步配置数量 */
  configCount: number;
  /** 成功数量 */
  successCount: number;
  /** 失败数量 */
  failedCount: number;
  /** 开始时间 */
  startedAt: Date;
  /** 完成时间 */
  completedAt?: Date;
  /** 错误信息 */
  errorMessage?: string;
  /** 重试次数 */
  retryCount: number;
}

/**
 * 配置中心选项
 */
export interface ConfigCenterOptions {
  /** 默认环境 */
  defaultEnvironment?: ConfigEnvironment;
  /** 启用缓存 */
  enableCache?: boolean;
  /** 缓存TTL (秒) */
  cacheTtl?: number;
  /** 启用审计日志 */
  enableAuditLog?: boolean;
  /** 启用版本管理 */
  enableVersioning?: boolean;
  /** 最大版本数 */
  maxVersions?: number;
  /** 启用访问控制 */
  enableAccessControl?: boolean;
  /** 启用高可用 */
  enableHighAvailability?: boolean;
  /** 同步节点列表 */
  syncNodes?: string[];
  /** 数据存储适配器 */
  storageAdapter?: StorageAdapter;
}

/**
 * 存储适配器接口
 */
export interface StorageAdapter {
  /** 初始化 */
  initialize(): Promise<void>;
  /** 获取配置 */
  getConfig(key: string, environment: ConfigEnvironment): Promise<ConfigItem | null>;
  /** 设置配置 */
  setConfig(config: ConfigItem): Promise<void>;
  /** 删除配置 */
  deleteConfig(key: string, environment: ConfigEnvironment): Promise<void>;
  /** 批量获取配置 */
  getConfigs(keys: string[], environment: ConfigEnvironment): Promise<ConfigItem[]>;
  /** 获取所有配置 */
  getAllConfigs(environment: ConfigEnvironment): Promise<ConfigItem[]>;
  /** 查询配置 */
  queryConfigs(query: ConfigQuery): Promise<ConfigItem[]>;
  /** 关闭连接 */
  close(): Promise<void>;
}

/**
 * 配置查询条件
 */
export interface ConfigQuery {
  /** 环境过滤 */
  environment?: ConfigEnvironment;
  /** 分组过滤 */
  group?: string;
  /** 键名过滤 (支持通配符) */
  keyPattern?: string;
  /** 状态过滤 */
  status?: ConfigStatus;
  /** 标签过滤 */
  tags?: string[];
  /** 创建者过滤 */
  createdBy?: string;
  /** 创建时间范围 */
  createdAtRange?: {
    start: Date;
    end: Date;
  };
  /** 更新时间范围 */
  updatedAtRange?: {
    start: Date;
    end: Date;
  };
  /** 分页 */
  pagination?: {
    offset: number;
    limit: number;
  };
  /** 排序 */
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

/**
 * 配置变更事件
 */
export interface ConfigChangeEvent {
  /** 事件ID */
  id?: string;
  /** 事件类型 */
  type: 'created' | 'updated' | 'deleted' | 'rollback';
  /** 配置项 */
  config: ConfigItem;
  /** 旧值 */
  oldValue?: unknown;
  /** 新值 */
  newValue?: unknown;
  /** 变更时间 */
  timestamp: Date;
  /** 变更者 */
  changedBy: string;
  /** 环境 */
  environment: ConfigEnvironment;
}

/**
 * 配置变更监听器
 */
export type ConfigChangeListener = (event: ConfigChangeEvent) => void | Promise<void>;

/**
 * 配置热加载结果
 */
export interface HotReloadResult {
  /** 是否成功 */
  success: boolean;
  /** 重新加载的配置数量 */
  reloadedCount: number;
  /** 失败的配置 */
  failedConfigs?: Array<{
    key: string;
    error: string;
  }>;
  /** 耗时 (毫秒) */
  duration: number;
}

/**
 * 配置导出选项
 */
export interface ConfigExportOptions {
  /** 导出格式 */
  format: 'json' | 'yaml' | 'env' | 'properties';
  /** 包含版本历史 */
  includeHistory?: boolean;
  /** 包含审计日志 */
  includeAuditLogs?: boolean;
  /** 环境过滤 */
  environments?: ConfigEnvironment[];
  /** 分组过滤 */
  groups?: string[];
  /** 是否加密敏感配置 */
  encryptSensitive?: boolean;
}

/**
 * 配置导入选项
 */
export interface ConfigImportOptions {
  /** 冲突处理策略 */
  conflictStrategy: 'skip' | 'overwrite' | 'merge';
  /** 是否验证配置 */
  validate?: boolean;
  /** 是否创建不存在的分组 */
  createMissingGroups?: boolean;
  /** 导入者 */
  importedBy: string;
  /** 是否为回滚导入 */
  isRollback?: boolean;
}

/**
 * 配置导入结果
 */
export interface ConfigImportResult {
  /** 是否成功 */
  success: boolean;
  /** 导入数量 */
  importedCount: number;
  /** 跳过数量 */
  skippedCount: number;
  /** 失败数量 */
  failedCount: number;
  /** 错误详情 */
  errors?: Array<{
    key: string;
    error: string;
  }>;
}

/**
 * 配置健康检查结果
 */
export interface ConfigHealthCheck {
  /** 是否健康 */
  healthy: boolean;
  /** 检查时间 */
  timestamp: Date;
  /** 各项检查结果 */
  checks: {
    storage: HealthCheckResult;
    cache: HealthCheckResult;
    sync: HealthCheckResult;
    version: HealthCheckResult;
  };
  /** 统计信息 */
  stats?: {
    totalConfigs: number;
    totalGroups: number;
    totalVersions: number;
    cacheHitRate: number;
  };
}

/**
 * 健康检查结果
 */
export interface HealthCheckResult {
  /** 状态 */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** 消息 */
  message?: string;
  /** 详情 */
  details?: Record<string, unknown>;
}

/**
 * 配置中心统计信息
 */
export interface ConfigCenterStats {
  /** 总配置数 */
  totalConfigs: number;
  /** 按环境统计 */
  byEnvironment: Record<ConfigEnvironment, number>;
  /** 按分组统计 */
  byGroup: Record<string, number>;
  /** 总版本数 */
  totalVersions: number;
  /** 审计日志数量 */
  auditLogCount: number;
  /** API密钥数量 */
  apiKeyCount: number;
  /** 缓存命中率 */
  cacheHitRate: number;
  /** 平均响应时间 (毫秒) */
  avgResponseTime: number;
}
