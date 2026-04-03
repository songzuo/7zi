/**
 * OpenClaw Workflow Engine v1.11.0
 * Core Type Definitions
 */

// ============================================================================
// Workflow Definition Types
// ============================================================================

/**
 * 工作流定义
 * 支持 DAG（有向无环图）结构
 */
export interface IWorkflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  status: WorkflowStatus;
  nodes: IWorkflowNode[];
  edges: IWorkflowEdge[];
  variables?: Record<string, any>;
  metadata?: IWorkflowMetadata;
  triggers?: ITrigger[];
  retryPolicy?: IRetryPolicy;
  timeout?: number;
  priority?: TaskPriority;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  tags?: string[];
}

/**
 * 工作流状态
 */
export enum WorkflowStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  DEPRECATED = 'deprecated',
  ARCHIVED = 'archived'
}

/**
 * 工作流节点基类
 */
export interface IWorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  position?: IPosition;
  config: INodeConfig;
  retryPolicy?: IRetryPolicy;
  timeout?: number;
  condition?: string;
  onError?: IErrorHandler;
  metadata?: Record<string, any>;
}

/**
 * 节点类型
 */
export enum NodeType {
  // Trigger 节点
  TRIGGER_CRON = 'trigger.cron',
  TRIGGER_WEBHOOK = 'trigger.webhook',
  TRIGGER_EVENT = 'trigger.event',
  TRIGGER_MANUAL = 'trigger.manual',
  
  // Action 节点
  ACTION_HTTP = 'action.http',
  ACTION_SCRIPT = 'action.script',
  ACTION_EMAIL = 'action.email',
  ACTION_SLACK = 'action.slack',
  ACTION_DATABASE = 'action.database',
  ACTION_TRANSFORM = 'action.transform',
  
  // Logic 节点
  LOGIC_CONDITION = 'logic.condition',
  LOGIC_SWITCH = 'logic.switch',
  LOGIC_LOOP = 'logic.loop',
  LOGIC_PARALLEL = 'logic.parallel',
  LOGIC_WAIT = 'logic.wait',
  
  // Integration 节点
  INTEGRATION_OPENAI = 'integration.openai',
  INTEGRATION_MINIMAX = 'integration.minimax',
  INTEGRATION_CLAUDE = 'integration.claude',
  INTEGRATION_CUSTOM = 'integration.custom'
}

/**
 * 节点配置
 */
export interface INodeConfig {
  // Trigger 节点配置
  cron?: ICronTriggerConfig;
  webhook?: IWebhookTriggerConfig;
  event?: IEventTriggerConfig;
  
  // Action 节点配置
  http?: IHttpActionConfig;
  script?: IScriptActionConfig;
  email?: IEmailActionConfig;
  slack?: ISlackActionConfig;
  database?: IDatabaseActionConfig;
  transform?: ITransformActionConfig;
  
  // Logic 节点配置
  condition?: IConditionLogicConfig;
  switch?: ISwitchLogicConfig;
  loop?: ILoopLogicConfig;
  parallel?: IParallelLogicConfig;
  wait?: IWaitLogicConfig;
  
  // Integration 节点配置
  openai?: IOpenAIIntegrationConfig;
  minimax?: IMinimaxIntegrationConfig;
  claude?: IClaudeIntegrationConfig;
  custom?: ICustomIntegrationConfig;
}

/**
 * 工作流边（连接）
 */
export interface IWorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
  type?: EdgeType;
  style?: IEdgeStyle;
}

export enum EdgeType {
  DEFAULT = 'default',
  CONDITIONAL = 'conditional',
  PARALLEL = 'parallel'
}

export interface IEdgeStyle {
  stroke?: string;
  strokeWidth?: number;
  animated?: boolean;
}

// ============================================================================
// Trigger 节点配置
// ============================================================================

export interface ICronTriggerConfig {
  expression: string; // Cron 表达式
  timezone?: string;
  enabled?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface IWebhookTriggerConfig {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  authentication?: IAuthentication;
  rateLimit?: IRateLimit;
}

export interface IEventTriggerConfig {
  eventType: string;
  filter?: string;
  source?: string;
}

export interface IAuthentication {
  type: 'none' | 'basic' | 'bearer' | 'api-key';
  credentials?: Record<string, string>;
}

export interface IRateLimit {
  max: number;
  window: number; // 毫秒
}

// ============================================================================
// Action 节点配置
// ============================================================================

export interface IHttpActionConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retryOnFailure?: boolean;
}

export interface IScriptActionConfig {
  language: 'javascript' | 'typescript' | 'python';
  code: string;
  timeout?: number;
}

export interface IEmailActionConfig {
  to: string | string[];
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
  attachments?: IAttachment[];
}

export interface ISlackActionConfig {
  channel: string;
  message: string;
  blocks?: any[];
}

export interface IDatabaseActionConfig {
  connection: string;
  query: string;
  params?: any[];
  operation: 'select' | 'insert' | 'update' | 'delete';
}

export interface ITransformActionConfig {
  type: 'map' | 'filter' | 'reduce' | 'custom';
  expression: string;
  input?: string;
}

// ============================================================================
// Logic 节点配置
// ============================================================================

export interface IConditionLogicConfig {
  expression: string;
  trueBranch?: string;
  falseBranch?: string;
}

export interface ISwitchLogicConfig {
  expression: string;
  cases: ISwitchCase[];
  default?: string;
}

export interface ISwitchCase {
  value: any;
  branch: string;
}

export interface ILoopLogicConfig {
  iterable: string | any[];
  maxIterations?: number;
  parallel?: boolean;
}

export interface IParallelLogicConfig {
  branches: string[];
  failFast?: boolean;
}

export interface IWaitLogicConfig {
  duration: number; // 毫秒
  until?: Date;
}

// ============================================================================
// Integration 节点配置
// ============================================================================

export interface IOpenAIIntegrationConfig {
  model: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface IMinimaxIntegrationConfig {
  model: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface IClaudeIntegrationConfig {
  model: string;
  prompt: string;
  maxTokens?: number;
}

export interface ICustomIntegrationConfig {
  connector: string;
  action: string;
  params?: Record<string, any>;
}

// ============================================================================
// 执行状态
// ============================================================================

export interface IExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  trigger: ITriggerInfo;
  variables: Record<string, any>;
  nodeExecutions: Map<string, INodeExecution>;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  error?: IExecutionError;
  checkoints: ICheckpoint[];
  priority: TaskPriority;
  metadata?: Record<string, any>;
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

export interface INodeExecution {
  nodeId: string;
  status: NodeExecutionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  output?: any;
  error?: IExecutionError;
  attempts: number;
  retries: number;
}

export enum NodeExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SKIPPED = 'skipped',
  COMPLETED = 'completed',
  FAILED = 'failed',
  TIMEOUT = 'timeout'
}

export interface IExecutionError {
  code: string;
  message: string;
  stack?: string;
  nodeId?: string;
  timestamp: Date;
}

// ============================================================================
// 调度相关
// ============================================================================

export interface ITrigger {
  id: string;
  type: TriggerType;
  config: ICronTriggerConfig | IWebhookTriggerConfig | IEventTriggerConfig;
  enabled: boolean;
  workflowId: string;
}

export enum TriggerType {
  CRON = 'cron',
  WEBHOOK = 'webhook',
  EVENT = 'event',
  MANUAL = 'manual'
}

export interface ITriggerInfo {
  type: TriggerType;
  triggerId?: string;
  payload?: any;
}

export interface ISchedule {
  id: string;
  workflowId: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  nextRun?: Date;
  lastRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// 队列相关
// ============================================================================

export enum TaskPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  CRITICAL = 20
}

export interface IQueueJob {
  id: string;
  workflowId: string;
  executionId: string;
  priority: TaskPriority;
  delay?: number;
  attempts: number;
  maxAttempts: number;
  data: any;
  opts: IJobOptions;
}

export interface IJobOptions {
  priority: TaskPriority;
  delay?: number;
  attempts?: number;
  backoff?: IBackoffStrategy;
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
  timeout?: number;
}

// ============================================================================
// 重试和错误处理
// ============================================================================

export interface IRetryPolicy {
  maxAttempts: number;
  backoffStrategy: BackoffStrategy;
  initialDelay: number;
  maxDelay: number;
  retryOnErrors?: string[];
}

export enum BackoffStrategy {
  FIXED = 'fixed',
  LINEAR = 'linear',
  EXPONENTIAL = 'exponential'
}

export interface IBackoffStrategy {
  type: BackoffStrategy;
  delay: number;
}

export interface IErrorHandler {
  strategy: ErrorHandlingStrategy;
  fallbackNode?: string;
  retryPolicy?: IRetryPolicy;
}

export enum ErrorHandlingStrategy {
  RETRY = 'retry',
  SKIP = 'skip',
  ABORT = 'abort',
  FALLBACK = 'fallback'
}

// ============================================================================
// 检查点
// ============================================================================

export interface ICheckpoint {
  id: string;
  executionId: string;
  timestamp: Date;
  nodeId: string;
  nodeStatus: NodeExecutionStatus;
  variables: Record<string, any>;
  nodeExecutions: Map<string, INodeExecution>;
}

// ============================================================================
// 辅助类型
// ============================================================================

export interface IPosition {
  x: number;
  y: number;
}

export interface IAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface IWorkflowMetadata {
  author?: string;
  version?: string;
  category?: string;
  tags?: string[];
  documentation?: string;
}

export interface IPagination {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IPaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
