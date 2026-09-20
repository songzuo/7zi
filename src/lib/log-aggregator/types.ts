/**
 * Log Aggregator Types - v1.10.0
 * 企业级日志聚合和分析系统核心类型定义
 */

// ==================== 基础类型 ====================

/**
 * 日志级别
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * 日志来源类型
 */
export type LogSourceType = 'file' | 'stdout' | 'http' | 'syslog' | 'kafka' | 'websocket';

/**
 * 日志格式类型
 */
export type LogFormatType = 'json' | 'nginx' | 'apache' | 'application' | 'syslog' | 'custom';

/**
 * 告警严重程度
 */
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * 告警状态
 */
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

/**
 * 聚合时间粒度
 */
export type AggregationGranularity = 'minute' | 'hour' | 'day' | 'week' | 'month';

// ==================== 核心接口 ====================

/**
 * 日志条目 - 核心数据结构
 */
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  source: LogSource;
  metadata: LogMetadata;
  parsed?: ParsedLogData;
  tags: string[];
  traceId?: string;
  spanId?: string;
  parentId?: string;
  raw?: string;
}

/**
 * 日志来源
 */
export interface LogSource {
  type: LogSourceType;
  name: string;
  host?: string;
  service?: string;
  environment?: string;
  path?: string;
  offset?: number;
}

/**
 * 日志元数据
 */
export interface LogMetadata {
  [key: string]: unknown;
  userId?: string;
  tenantId?: string;
  requestId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  statusCode?: number;
  errorStack?: string;
  componentName?: string;
}

/**
 * 解析后的日志数据
 */
export interface ParsedLogData {
  fields: Record<string, unknown>;
  timestamp?: Date;
  level?: LogLevel;
  message?: string;
  parser: string;
  confidence: number;
}

// ==================== 收集器接口 ====================

/**
 * 日志收集器配置
 */
export interface LogCollectorConfig {
  id: string;
  type: LogSourceType;
  enabled: boolean;
  batchSize: number;
  flushInterval: number;
  retryAttempts: number;
  retryDelay: number;
  bufferSize: number;
  filePath?: string;
  filePattern?: string;
  encoding?: BufferEncoding;
  httpEndpoint?: string;
  httpMethod?: 'GET' | 'POST' | 'PUT';
  httpHeaders?: Record<string, string>;
  kafkaTopic?: string;
  kafkaBroker?: string;
  kafkaGroupId?: string;
}

/**
 * 日志收集器接口
 */
export interface ILogCollector {
  readonly id: string;
  readonly type: LogSourceType;
  readonly config: LogCollectorConfig;
  
  start(): Promise<void>;
  stop(): Promise<void>;
  collect(): AsyncGenerator<LogEntry[], void, unknown>;
  getStatus(): CollectorStatus;
  getStats(): CollectorStats;
  on(event: string, listener: (...args: unknown[]) => void): this;
  emit(event: string, ...args: unknown[]): boolean;
}

/**
 * 收集器状态
 */
export interface CollectorStatus {
  isRunning: boolean;
  lastCollection?: Date;
  errors: number;
  lastError?: string;
  uptime: number;
}

/**
 * 收集器统计
 */
export interface CollectorStats {
  totalCollected: number;
  totalErrors: number;
  avgBatchSize: number;
  throughput: number;
  bufferSize: number;
  lastHourCount: number;
}

// ==================== 解析器接口 ====================

/**
 * 日志解析器配置
 */
export interface LogParserConfig {
  type: LogFormatType;
  enabled: boolean;
  pattern?: string;
  timestampFormat?: string;
  levelMapping?: Record<string, LogLevel>;
  fieldMapping?: Record<string, string>;
  customRegex?: string;
}

/**
 * 日志解析器接口
 */
export interface ILogParser {
  readonly type: LogFormatType;
  readonly config: LogParserConfig;
  
  parse(raw: string): Promise<ParsedLogData | null>;
  detectFormat(raw: string): LogFormatType | null;
  validate(parsed: ParsedLogData): boolean;
}

// ==================== 存储接口 ====================

/**
 * 日志存储配置
 */
export interface LogStorageConfig {
  type: 'memory' | 'file' | 'elasticsearch' | 'clickhouse' | 'timescaledb';
  retentionDays: number;
  indexPattern: string;
  shardCount: number;
  replicaCount: number;
  compressionEnabled: boolean;
  compressionAlgorithm: 'gzip' | 'lz4' | 'zstd';
  maxStorageSize?: number;
  warmStoragePath?: string;
  coldStoragePath?: string;
}

/**
 * 日志存储接口
 */
export interface ILogStorage {
  readonly config: LogStorageConfig;
  
  store(entries: LogEntry[]): Promise<StoreResult>;
  query(query: LogQuery): Promise<QueryResult>;
  aggregate(query: AggregateQuery): Promise<AggregateResult>;
  delete(query: DeleteQuery): Promise<DeleteResult>;
  getStats(): StorageStats;
  optimize(): Promise<void>;
  backup(path: string): Promise<BackupResult>;
  restore(path: string): Promise<RestoreResult>;
}

/**
 * 存储结果
 */
export interface StoreResult {
  success: boolean;
  stored: number;
  failed: number;
  errors?: string[];
  ids?: string[];
}

/**
 * 查询结果
 */
export interface QueryResult {
  entries: LogEntry[];
  total: number;
  took: number;
  aggregations?: Record<string, unknown>;
  scrollId?: string;
}

/**
 * 聚合查询
 */
export interface AggregateQuery {
  timeRange: TimeRange;
  groupBy: string[];
  aggregations: AggregationSpec[];
  filters?: QueryFilter[];
  granularity: AggregationGranularity;
  limit?: number;
}

/**
 * 聚合规格
 */
export interface AggregationSpec {
  type: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'percentile' | 'cardinality';
  field: string;
  name: string;
  percentile?: number;
}

/**
 * 聚合结果
 */
export interface AggregateResult {
  buckets: AggregateBucket[];
  took: number;
  totalBuckets: number;
}

/**
 * 聚合桶
 */
export interface AggregateBucket {
  key: Record<string, unknown>;
  values: Record<string, number>;
  docCount: number;
}

/**
 * 存储统计
 */
export interface StorageStats {
  totalEntries: number;
  totalSize: number;
  indexCount: number;
  avgEntrySize: number;
  oldestEntry?: Date;
  newestEntry?: Date;
  compressionRatio: number;
  throughput: number;
}

/**
 * 备份结果
 */
export interface BackupResult {
  success: boolean;
  path: string;
  size: number;
  entries: number;
  timestamp: Date;
}

/**
 * 恢复结果
 */
export interface RestoreResult {
  success: boolean;
  entries: number;
  errors: number;
  timestamp: Date;
}

// ==================== 查询接口 ====================

/**
 * 日志查询
 */
export interface LogQuery {
  timeRange: TimeRange;
  filters?: QueryFilter[];
  textQuery?: string;
  sort?: QuerySort[];
  pagination?: Pagination;
  fields?: string[];
  highlight?: boolean;
}

/**
 * 时间范围
 */
export interface TimeRange {
  start: Date;
  end: Date;
  timezone?: string;
}

/**
 * 查询过滤器
 */
export interface QueryFilter {
  field: string;
  operator: FilterOperator;
  value: unknown;
  negate?: boolean;
}

/**
 * 过滤操作符
 */
export type FilterOperator = 
  | 'eq' | 'neq' 
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'in' | 'notin'
  | 'exists' | 'missing'
  | 'contains' | 'startswith' | 'endswith'
  | 'regex' | 'wildcard';

/**
 * 查询排序
 */
export interface QuerySort {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * 分页
 */
export interface Pagination {
  offset: number;
  limit: number;
}

/**
 * 删除查询
 */
export interface DeleteQuery {
  timeRange?: TimeRange;
  filters?: QueryFilter[];
  dryRun?: boolean;
}

/**
 * 删除结果
 */
export interface DeleteResult {
  deleted: number;
  took: number;
}

// ==================== 分析引擎接口 ====================

/**
 * 分析引擎配置
 */
export interface AnalysisEngineConfig {
  enabled: boolean;
  anomalyDetection: AnomalyDetectionConfig;
  trendAnalysis: TrendAnalysisConfig;
  statisticalReport: StatisticalReportConfig;
}

/**
 * 异常检测配置
 */
export interface AnomalyDetectionConfig {
  enabled: boolean;
  algorithms: ('zscore' | 'isolation_forest' | 'kmeans' | 'dbscan')[];
  sensitivity: number;
  windowSize: number;
  minSamples: number;
}

/**
 * 趋势分析配置
 */
export interface TrendAnalysisConfig {
  enabled: boolean;
  methods: ('linear' | 'exponential' | 'moving_avg' | 'arima')[];
  forecastHorizon: number;
  confidenceLevel: number;
}

/**
 * 统计报告配置
 */
export interface StatisticalReportConfig {
  enabled: boolean;
  schedule: string;
  metrics: string[];
  comparison: 'previous_period' | 'same_last_year' | 'average';
}

/**
 * 分析引擎接口
 */
export interface IAnalysisEngine {
  readonly config: AnalysisEngineConfig;
  
  detectAnomalies(timeRange: TimeRange): Promise<AnomalyResult[]>;
  analyzeTrends(timeRange: TimeRange): Promise<TrendResult[]>;
  generateReport(timeRange: TimeRange): Promise<AnalysisReport>;
  getInsights(timeRange: TimeRange): Promise<Insight[]>;
}

/**
 * 异常结果
 */
export interface AnomalyResult {
  id: string;
  timestamp: Date;
  type: 'spike' | 'drop' | 'pattern_change' | 'outlier';
  severity: AlertSeverity;
  score: number;
  field: string;
  expectedValue: number;
  actualValue: number;
  context: Record<string, unknown>;
}

/**
 * 趋势结果
 */
export interface TrendResult {
  field: string;
  direction: 'up' | 'down' | 'stable';
  changeRate: number;
  confidence: number;
  forecast?: number[];
  startDate: Date;
  endDate: Date;
}

/**
 * 分析报告
 */
export interface AnalysisReport {
  id: string;
  generatedAt: Date;
  timeRange: TimeRange;
  summary: ReportSummary;
  sections: ReportSection[];
  metrics: ReportMetric[];
}

/**
 * 报告摘要
 */
export interface ReportSummary {
  totalLogs: number;
  errorRate: number;
  avgResponseTime: number;
  topErrors: ErrorSummary[];
  topSources: SourceSummary[];
}

/**
 * 错误摘要
 */
export interface ErrorSummary {
  message: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  trend: 'increasing' | 'decreasing' | 'stable';
}

/**
 * 来源摘要
 */
export interface SourceSummary {
  source: string;
  count: number;
  errorCount: number;
  avgSize: number;
}

/**
 * 报告章节
 */
export interface ReportSection {
  title: string;
  type: 'chart' | 'table' | 'text' | 'list';
  data: unknown;
}

/**
 * 报告指标
 */
export interface ReportMetric {
  name: string;
  value: number;
  unit: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

/**
 * 洞察
 */
export interface Insight {
  id: string;
  type: 'anomaly' | 'trend' | 'correlation' | 'recommendation';
  title: string;
  description: string;
  importance: 'low' | 'medium' | 'high';
  actionable: boolean;
  suggestedActions?: string[];
  relatedLogs?: string[];
}

// ==================== 告警接口 ====================

/**
 * 告警规则配置
 */
export interface AlertRuleConfig {
  id: string;
  name: string;
  enabled: boolean;
  severity: AlertSeverity;
  condition: AlertCondition;
  actions: AlertAction[];
  throttle: ThrottleConfig;
  notification: NotificationConfig;
  tags: string[];
}

/**
 * 告警条件
 */
export interface AlertCondition {
  type: 'threshold' | 'rate' | 'absence' | 'pattern' | 'ml';
  field: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
  value: unknown;
  timeWindow: number;
  minOccurrences?: number;
  query?: LogQuery;
  mlModel?: MLModelConfig;
}

/**
 * ML 模型配置
 */
export interface MLModelConfig {
  type: 'isolation_forest' | 'autoencoder' | 'prophet';
  features: string[];
  trainingWindow: number;
  sensitivity: number;
}

/**
 * 告警动作
 */
export interface AlertAction {
  type: 'email' | 'webhook' | 'slack' | 'pagerduty' | 'sms' | 'log';
  config: Record<string, unknown>;
  template?: string;
}

/**
 * 节流配置
 */
export interface ThrottleConfig {
  enabled: boolean;
  period: number;
  maxAlerts: number;
  groupBy?: string[];
}

/**
 * 通知配置
 */
export interface NotificationConfig {
  channels: string[];
  escalationPolicy?: EscalationPolicy;
  quietHours?: QuietHours;
}

/**
 * 升级策略
 */
export interface EscalationPolicy {
  levels: EscalationLevel[];
  autoEscalateAfter: number;
}

/**
 * 升级级别
 */
export interface EscalationLevel {
  level: number;
  delay: number;
  channels: string[];
}

/**
 * 静默时间
 */
export interface QuietHours {
  start: string;
  end: string;
  timezone: string;
  excludeSeverity: AlertSeverity[];
}

/**
 * 告警实例
 */
export interface AlertInstance {
  id: string;
  ruleId: string;
  status: AlertStatus;
  severity: AlertSeverity;
  title: string;
  message: string;
  startTime: Date;
  endTime?: Date;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  occurrences: number;
  lastOccurrence: Date;
  context: Record<string, unknown>;
  relatedLogs: string[];
  history: AlertHistoryEntry[];
}

/**
 * 告警历史条目
 */
export interface AlertHistoryEntry {
  timestamp: Date;
  action: 'created' | 'acknowledged' | 'escalated' | 'resolved' | 'snoozed';
  user?: string;
  details?: string;
}

/**
 * 告警管理器接口
 */
export interface IAlertManager {
  addRule(rule: AlertRuleConfig): Promise<void>;
  updateRule(rule: AlertRuleConfig): Promise<void>;
  removeRule(ruleId: string): Promise<void>;
  getRules(): Promise<AlertRuleConfig[]>;
  evaluate(logs: LogEntry[]): Promise<AlertInstance[]>;
  getActiveAlerts(): Promise<AlertInstance[]>;
  acknowledge(alertId: string, user: string): Promise<void>;
  resolve(alertId: string, user: string): Promise<void>;
  getAlertHistory(query: AlertHistoryQuery): Promise<AlertInstance[]>;
  startPeriodicEvaluation(intervalMs?: number): void;
  stopPeriodicEvaluation(): void;
  on(event: string, listener: (...args: unknown[]) => void): this;
  emit(event: string, ...args: unknown[]): boolean;
}

/**
 * 告警历史查询
 */
export interface AlertHistoryQuery {
  timeRange: TimeRange;
  severity?: AlertSeverity[];
  status?: AlertStatus[];
  ruleId?: string;
  limit?: number;
}

// ==================== 搜索 API 接口 ====================

/**
 * 搜索 API 配置
 */
export interface SearchApiConfig {
  enabled: boolean;
  port: number;
  maxResults: number;
  timeout: number;
  cacheEnabled: boolean;
  cacheTTL: number;
  rateLimit?: RateLimitConfig;
}

/**
 * 速率限制配置
 */
export interface RateLimitConfig {
  enabled: boolean;
  requestsPerMinute: number;
  burstSize: number;
}

/**
 * 搜索请求
 */
export interface SearchRequest {
  query: string;
  filters?: QueryFilter[];
  timeRange: TimeRange;
  sort?: QuerySort[];
  pagination?: Pagination;
  aggregations?: AggregationSpec[];
  highlight?: HighlightConfig;
}

/**
 * 高亮配置
 */
export interface HighlightConfig {
  enabled: boolean;
  fields: string[];
  preTag?: string;
  postTag?: string;
  fragmentSize?: number;
}

/**
 * 搜索响应
 */
export interface SearchResponse {
  took: number;
  timedOut: boolean;
  hits: SearchResultHit[];
  total: number;
  aggregations?: Record<string, unknown>;
  suggest?: SuggestResult[];
}

/**
 * 搜索结果命中
 */
export interface SearchResultHit {
  entry: LogEntry;
  score: number;
  highlight?: Record<string, string[]>;
}

/**
 * 建议结果
 */
export interface SuggestResult {
  text: string;
  offset: number;
  length: number;
  options: SuggestOption[];
}

/**
 * 建议选项
 */
export interface SuggestOption {
  text: string;
  score: number;
  frequency?: number;
}

/**
 * 搜索 API 接口
 */
export interface ISearchApi {
  search(request: SearchRequest): Promise<SearchResponse>;
  suggest(text: string, field: string): Promise<SuggestResult>;
  explain(request: SearchRequest, id: string): Promise<ExplainResult>;
  validate(query: string): Promise<ValidateResult>;
  stop(): void;
}

/**
 * 解释结果
 */
export interface ExplainResult {
  score: number;
  description: string;
  details: ExplainDetail[];
}

/**
 * 解释详情
 */
export interface ExplainDetail {
  value: number;
  description: string;
  details?: ExplainDetail[];
}

/**
 * 验证结果
 */
export interface ValidateResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

// ==================== 系统配置 ====================

/**
 * 日志聚合器主配置
 */
export interface LogAggregatorConfig {
  collectors: LogCollectorConfig[];
  parser: LogParserConfig[];
  storage: LogStorageConfig;
  analysis: AnalysisEngineConfig;
  alerting: AlertRuleConfig[];
  search: SearchApiConfig;
  performance: PerformanceConfig;
  monitoring: MonitoringConfig;
}

/**
 * 性能配置
 */
export interface PerformanceConfig {
  maxMemoryMB: number;
  workerCount: number;
  batchSize: number;
  queueSize: number;
  processingTimeout: number;
}

/**
 * 监控配置
 */
export interface MonitoringConfig {
  enabled: boolean;
  metricsPort: number;
  healthCheckPort: number;
  prometheusEnabled: boolean;
}

// ==================== 事件类型 ====================

/**
 * 日志事件
 */
export type LogEvent = 
  | { type: 'log_collected'; collectorId: string; count: number }
  | { type: 'log_parsed'; parserType: LogFormatType; count: number }
  | { type: 'log_stored'; count: number; size: number }
  | { type: 'query_executed'; took: number; hits: number }
  | { type: 'alert_triggered'; alertId: string; severity: AlertSeverity }
  | { type: 'anomaly_detected'; anomaly: AnomalyResult }
  | { type: 'error'; component: string; error: Error };

/**
 * 事件监听器
 */
export type LogEventListener = (event: LogEvent) => void | Promise<void>;
