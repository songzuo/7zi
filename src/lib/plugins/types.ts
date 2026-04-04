/**
 * Plugin System Type Definitions
 * Core interfaces and types for the plugin architecture
 */

import { EventEmitter } from 'events';

// ============================================================================
// Plugin Metadata
// ============================================================================

export interface PluginAuthor {
  name: string;
  email?: string;
  url?: string;
}

export interface PluginRepository {
  type: 'git' | 'svn' | 'hg';
  url: string;
  directory?: string;
}

export interface PluginLicense {
  type: string;
  url?: string;
}

export interface PluginMetadata {
  /** Unique plugin identifier (e.g., @scope/plugin-name) */
  id: string;
  
  /** Human-readable plugin name */
  name: string;
  
  /** Plugin version (semver) */
  version: string;
  
  /** Plugin description */
  description: string;
  
  /** Plugin author(s) */
  author?: PluginAuthor | PluginAuthor[];
  
  /** Plugin contributors */
  contributors?: PluginAuthor[];
  
  /** Plugin homepage URL */
  homepage?: string;
  
  /** Repository information */
  repository?: PluginRepository | string;
  
  /** License information */
  license?: PluginLicense | string;
  
  /** Keywords for search */
  keywords?: string[];
  
  /** Plugin category */
  category?: PluginCategory;
  
  /** Plugin tags */
  tags?: string[];
  
  /** Minimum required core version */
  minCoreVersion?: string;
  
  /** Maximum supported core version */
  maxCoreVersion?: string;
  
  /** Plugin dependencies */
  dependencies?: PluginDependency[];
  
  /** Plugin peer dependencies */
  peerDependencies?: Record<string, string>;
  
  /** Plugin icon URL */
  icon?: string;
  
  /** Plugin screenshots */
  screenshots?: string[];
  
  /** Plugin readme URL */
  readme?: string;
  
  /** Plugin changelog URL */
  changelog?: string;
  
  /** Plugin creation date */
  createdAt?: Date;
  
  /** Plugin last update date */
  updatedAt?: Date;
  
  /** Download count */
  downloads?: number;
  
  /** Plugin rating */
  rating?: {
    average: number;
    count: number;
  };
  
  /** Plugin status */
  status?: PluginStatus;
}

export type PluginCategory = 
  | 'logging'
  | 'caching'
  | 'authentication'
  | 'webhook'
  | 'analytics'
  | 'monitoring'
  | 'notification'
  | 'integration'
  | 'workflow'
  | 'ai'
  | 'security'
  | 'performance'
  | 'ui'
  | 'data'
  | 'utility'
  | 'other';

export type PluginStatus = 
  | 'active'
  | 'inactive'
  | 'disabled'
  | 'deprecated'
  | 'beta'
  | 'alpha'
  | 'experimental';

// ============================================================================
// Plugin Dependency
// ============================================================================

export interface PluginDependency {
  /** Dependency plugin ID */
  id: string;
  
  /** Version range (semver) */
  version?: string;
  
  /** Is this dependency optional? */
  optional?: boolean;
  
  /** Compatibility check function */
  compatible?: (version: string) => boolean;
}

// ============================================================================
// Plugin Configuration
// ============================================================================

export interface PluginConfig {
  /** Plugin ID */
  id: string;
  
  /** Plugin enabled/disabled */
  enabled: boolean;
  
  /** Plugin priority (higher = more important) */
  priority?: number;
  
  /** Plugin configuration data */
  config?: Record<string, unknown>;
  
  /** Plugin environment variables */
  env?: Record<string, string>;
  
  /** Plugin hooks configuration */
  hooks?: Record<string, HookConfig>;
  
  /** Plugin permissions */
  permissions?: PluginPermission[];
  
  /** Plugin resource limits */
  limits?: PluginResourceLimits;
  
  /** Plugin scheduling */
  schedule?: PluginSchedule;
  
  /** Plugin retry configuration */
  retry?: PluginRetryConfig;
}

export interface PluginPermission {
  /** Permission name */
  name: string;
  
  /** Permission scope */
  scope?: 'read' | 'write' | 'execute' | 'admin';
  
  /** Permission constraints */
  constraints?: Record<string, unknown>;
}

export interface PluginResourceLimits {
  /** Maximum memory (MB) */
  maxMemory?: number;
  
  /** Maximum CPU time (ms) */
  maxCpuTime?: number;
  
  /** Maximum execution time (ms) */
  maxExecutionTime?: number;
  
  /** Maximum file descriptors */
  maxFileDescriptors?: number;
  
  /** Maximum network connections */
  maxConnections?: number;
  
  /** Maximum request size (bytes) */
  maxRequestSize?: number;
}

export interface PluginSchedule {
  /** Cron expression */
  cron?: string;
  
  /** Run interval (ms) */
  interval?: number;
  
  /** Run on startup */
  runOnStartup?: boolean;
  
  /** Run on schedule */
  enabled?: boolean;
}

export interface PluginRetryConfig {
  /** Maximum retry attempts */
  maxAttempts?: number;
  
  /** Retry delay (ms) */
  delay?: number;
  
  /** Exponential backoff */
  exponentialBackoff?: boolean;
  
  /** Max retry delay (ms) */
  maxDelay?: number;
}

// ============================================================================
// Plugin Hooks
// ============================================================================

export type HookName = 
  | 'beforeInit'
  | 'afterInit'
  | 'beforeStart'
  | 'afterStart'
  | 'beforeStop'
  | 'afterStop'
  | 'beforeDestroy'
  | 'afterDestroy'
  | 'beforeExecute'
  | 'afterExecute'
  | 'onError'
  | 'onConfigChange'
  | 'onHealthCheck'
  | 'onMetrics'
  | 'onLog'
  | 'onRequest'
  | 'onResponse'
  | 'onMessage'
  | 'onEvent'
  | 'onDatabaseQuery'
  | 'onCacheHit'
  | 'onCacheMiss'
  | 'onAuthAttempt'
  | 'onAuthSuccess'
  | 'onAuthFailure'
  | 'onWebhookReceived'
  | string;

export interface HookConfig {
  /** Hook enabled */
  enabled?: boolean;
  
  /** Hook priority */
  priority?: number;
  
  /** Hook timeout (ms) */
  timeout?: number;
  
  /** Hook async */
  async?: boolean;
  
  /** Hook retry on failure */
  retry?: boolean;
}

export interface HookContext {
  /** Hook name */
  hook: HookName;
  
  /** Plugin ID */
  pluginId: string;
  
  /** Timestamp */
  timestamp: Date;
  
  /** Input data */
  input?: unknown;
  
  /** Output data */
  output?: unknown;
  
  /** Error (if any) */
  error?: Error;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export type HookHandler<TInput = unknown, TOutput = unknown> = (
  context: HookContext,
  input: TInput
) => Promise<TOutput> | TOutput;

// ============================================================================
// Plugin Lifecycle
// ============================================================================

export type PluginState = 
  | 'unloaded'
  | 'loading'
  | 'loaded'
  | 'initializing'
  | 'initialized'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'error'
  | 'disabled';

export interface PluginLifecycle {
  /** Initialize plugin */
  init(context: PluginContext): Promise<void>;
  
  /** Start plugin */
  start(): Promise<void>;
  
  /** Stop plugin */
  stop(): Promise<void>;
  
  /** Destroy plugin */
  destroy(): Promise<void>;
  
  /** Health check */
  healthCheck?(): Promise<PluginHealthStatus>;
  
  /** Get metrics */
  getMetrics?(): Promise<PluginMetrics>;
}

export interface PluginContext {
  /** Plugin configuration */
  config: PluginConfig;
  
  /** Plugin metadata */
  metadata: PluginMetadata;
  
  /** Logger instance */
  logger: PluginLogger;
  
  /** Plugin manager */
  manager: PluginManager;
  
  /** Plugin registry */
  registry: PluginRegistry;
  
  /** Plugin sandbox */
  sandbox: PluginSandbox;
  
  /** Plugin SDK */
  sdk: PluginSDK;
  
  /** Event emitter */
  events: EventEmitter;
  
  /** Plugin state */
  state: PluginState;
  
  /** Plugin storage */
  storage: PluginStorage;
}

// ============================================================================
// Plugin Interface
// ============================================================================

export interface Plugin extends PluginLifecycle {
  /** Plugin metadata */
  metadata: PluginMetadata;
  
  /** Plugin configuration */
  config: PluginConfig;
  
  /** Register hooks */
  registerHooks?(registry: HookRegistry): void;
  
  /** Execute plugin action */
  execute?<TInput = unknown, TOutput = unknown>(
    action: string,
    input?: TInput
  ): Promise<TOutput>;
  
  /** Get plugin info */
  getInfo?(): PluginInfo;
}

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  state: PluginState;
  uptime: number;
  health: PluginHealthStatus;
  metrics?: PluginMetrics;
  lastError?: Error;
}

// ============================================================================
// Plugin Health & Metrics
// ============================================================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface PluginHealthStatus {
  status: HealthStatus;
  message?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  checks?: Record<string, {
    status: HealthStatus;
    message?: string;
  }>;
}

export interface PluginMetrics {
  /** Total execution count */
  executionCount?: number;
  
  /** Successful executions */
  successCount?: number;
  
  /** Failed executions */
  failureCount?: number;
  
  /** Average execution time (ms) */
  avgExecutionTime?: number;
  
  /** Memory usage (bytes) */
  memoryUsage?: number;
  
  /** CPU usage (percentage) */
  cpuUsage?: number;
  
  /** Custom metrics */
  custom?: Record<string, number | string>;
  
  /** Timestamp */
  timestamp: Date;
}

// ============================================================================
// Plugin Logger
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface PluginLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  fatal(message: string, meta?: Record<string, unknown>): void;
  log(level: LogLevel, message: string, meta?: Record<string, unknown>): void;
}

// ============================================================================
// Plugin Storage
// ============================================================================

export interface PluginStorage {
  /** Get value */
  get<T = any>(key: string): Promise<T | undefined>;
  
  /** Set value */
  set<T = any>(key: string, value: T, ttl?: number): Promise<void>;
  
  /** Delete value */
  delete(key: string): Promise<void>;
  
  /** Clear all values */
  clear(): Promise<void>;
  
  /** Check if key exists */
  has(key: string): Promise<boolean>;
  
  /** Get all keys */
  keys(): Promise<string[]>;
}

// ============================================================================
// Plugin Manager
// ============================================================================

export interface PluginManager {
  /** Load plugin */
  loadPlugin(id: string, config?: Partial<PluginConfig>): Promise<Plugin>;
  
  /** Unload plugin */
  unloadPlugin(id: string): Promise<void>;
  
  /** Reload plugin */
  reloadPlugin(id: string): Promise<Plugin>;
  
  /** Get plugin */
  getPlugin(id: string): Plugin | undefined;
  
  /** Get all plugins */
  getPlugins(): Plugin[];
  
  /** Get plugin by state */
  getPluginsByState(state: PluginState): Plugin[];
  
  /** Enable plugin */
  enablePlugin(id: string): Promise<void>;
  
  /** Disable plugin */
  disablePlugin(id: string): Promise<void>;
  
  /** Execute plugin action */
  execute<TInput = unknown, TOutput = unknown>(
    pluginId: string,
    action: string,
    input?: TInput
  ): Promise<TOutput>;
  
  /** Execute hook */
  executeHook<TInput = unknown, TOutput = unknown>(
    hook: HookName,
    input?: TInput
  ): Promise<TOutput[]>;
  
  /** Get health status */
  getHealthStatus(pluginId: string): Promise<PluginHealthStatus>;
  
  /** Get metrics */
  getMetrics(pluginId: string): Promise<PluginMetrics>;
}

// ============================================================================
// Plugin Registry
// ============================================================================

export interface PluginRegistry {
  /** Register plugin */
  register(plugin: Plugin): void;
  
  /** Unregister plugin */
  unregister(pluginId: string): void;
  
  /** Get plugin */
  get(pluginId: string): Plugin | undefined;
  
  /** Get all plugins */
  getAll(): Plugin[];
  
  /** Check if plugin exists */
  has(pluginId: string): boolean;
  
  /** Search plugins */
  search(query: PluginSearchQuery): Plugin[];
}

export interface PluginSearchQuery {
  name?: string;
  category?: PluginCategory;
  tags?: string[];
  status?: PluginStatus;
  author?: string;
  keywords?: string[];
}

// ============================================================================
// Hook Registry
// ============================================================================

export interface HookRegistry {
  /** Register hook handler */
  register<TInput = unknown, TOutput = unknown>(
    hook: HookName,
    handler: HookHandler<TInput, TOutput>,
    config?: HookConfig
  ): void;
  
  /** Unregister hook handler */
  unregister(hook: HookName, handler: HookHandler): void;
  
  /** Get hook handlers */
  getHandlers(hook: HookName): Array<{
    handler: HookHandler;
    config: HookConfig;
  }>;
  
  /** Execute hook */
  execute<TInput = unknown, TOutput = unknown>(
    hook: HookName,
    input?: TInput
  ): Promise<TOutput[]>;
  
  /** Clear all hooks */
  clear(): void;
}

// ============================================================================
// Plugin Sandbox
// ============================================================================

export interface PluginSandbox {
  /** Create sandbox for plugin */
  create(pluginId: string, permissions: PluginPermission[]): Promise<SandboxContext>;
  
  /** Destroy sandbox */
  destroy(pluginId: string): Promise<void>;
  
  /** Execute code in sandbox */
  execute<T = unknown>(
    pluginId: string,
    code: string | Function,
    context?: Record<string, unknown>
  ): Promise<T>;
  
  /** Validate plugin code */
  validate(code: string): Promise<ValidationResult>;
  
  /** Get sandbox status */
  getStatus(pluginId: string): SandboxStatus;
}

export interface SandboxContext {
  /** Global scope */
  global: Record<string, unknown>;
  
  /** Module require */
  require: (module: string) => unknown;
  
  /** Console */
  console: Console;
  
  /** Timer functions */
  setTimeout: (callback: (...args: unknown[]) => void, delay: number, ...args: unknown[]) => NodeJS.Timeout;
  setInterval: (callback: (...args: unknown[]) => void, delay: number, ...args: unknown[]) => NodeJS.Timeout;
  clearTimeout: typeof clearTimeout;
  clearInterval: typeof clearInterval;
  
  /** Process */
  process: {
    env: Record<string, string>;
    nextTick: typeof process.nextTick;
  };
}

export interface SandboxStatus {
  pluginId: string;
  active: boolean;
  memoryUsage: number;
  cpuUsage: number;
  uptime: number;
  errors: Error[];
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    line: number;
    column: number;
    message: string;
  }>;
  warnings: Array<{
    line: number;
    column: number;
    message: string;
  }>;
}

// ============================================================================
// Plugin SDK
// ============================================================================

export interface PluginSDK {
  /** Logger */
  logger: PluginLogger;
  
  /** Storage */
  storage: PluginStorage;
  
  /** HTTP client */
  http: PluginHTTPClient;
  
  /** Event bus */
  events: EventEmitter;
  
  /** Database client */
  db: PluginDatabaseClient;
  
  /** Cache client */
  cache: PluginCacheClient;
  
  /** Queue client */
  queue: PluginQueueClient;
  
  /** Config helper */
  config: PluginConfigHelper;
  
  /** Utility functions */
  utils: PluginUtils;
}

export interface PluginHTTPClient {
  fetch(url: string, options?: RequestInit): Promise<Response>;
  get(url: string, options?: RequestInit): Promise<Response>;
  post(url: string, body?: unknown, options?: RequestInit): Promise<Response>;
  put(url: string, body?: unknown, options?: RequestInit): Promise<Response>;
  delete(url: string, options?: RequestInit): Promise<Response>;
}

export interface PluginDatabaseClient {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T>;
  transaction<T>(callback: (tx: PluginTransaction) => Promise<T>): Promise<T>;
  insert<T = unknown>(table: string, data: Record<string, unknown>): Promise<T>;
  update<T = unknown>(table: string, data: Record<string, unknown>, where: Record<string, unknown>): Promise<T>;
  delete(table: string, where: Record<string, unknown>): Promise<number>;
  find<T = unknown>(table: string, where: Record<string, unknown>): Promise<T[]>;
  findOne<T = unknown>(table: string, where: Record<string, unknown>): Promise<T | null>;
}

export interface PluginTransaction {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface PluginCacheClient {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set<T = unknown>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
}

export interface PluginQueueClient {
  publish(queue: string, message: unknown): Promise<void>;
  subscribe(queue: string, handler: (message: unknown) => Promise<void>): Promise<void>;
  unsubscribe(queue: string): Promise<void>;
}

export interface PluginConfigHelper {
  get<T = unknown>(key: string, defaultValue?: T): T;
  set(key: string, value: unknown): void;
  has(key: string): boolean;
  getAll(): Record<string, unknown>;
  reload(): Promise<void>;
}

export interface PluginUtils {
  debounce<T extends (...args: unknown[]) => any>(fn: T, delay: number): T;
  throttle<T extends (...args: unknown[]) => any>(fn: T, delay: number): T;
  retry<T>(fn: () => Promise<T>, attempts: number, delay: number): Promise<T>;
  timeout<T>(promise: Promise<T>, ms: number): Promise<T>;
  sleep(ms: number): Promise<void>;
  generateId(): string;
  deepClone<T>(obj: T): T;
  merge<T>(target: T, source: Partial<T>): T;
}

// ============================================================================
// Plugin Market
// ============================================================================

export interface PluginMarketEntry extends PluginMetadata {
  /** Marketplace ID */
  marketplaceId: string;
  
  /** Download URL */
  downloadUrl: string;
  
  /** Install count */
  installCount: number;
  
  /** Rating */
  rating: {
    average: number;
    count: number;
  };
  
  /** Verified plugin */
  verified: boolean;
  
  /** Featured plugin */
  featured: boolean;
  
  /** Official plugin */
  official: boolean;
  
  /** Security scan result */
  securityScan?: PluginSecurityScan;
}

export interface PluginSecurityScan {
  status: 'passed' | 'warning' | 'failed';
  issues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
  }>;
  scannedAt: Date;
}

// ============================================================================
// Plugin Events
// ============================================================================

export interface PluginEvents {
  'plugin:loaded': { pluginId: string };
  'plugin:unloaded': { pluginId: string };
  'plugin:started': { pluginId: string };
  'plugin:stopped': { pluginId: string };
  'plugin:error': { pluginId: string; error: Error };
  'plugin:config:changed': { pluginId: string; config: PluginConfig };
  'hook:executed': { hook: HookName; pluginId: string; result: unknown };
  'hook:error': { hook: HookName; pluginId: string; error: Error };
}

// ============================================================================
// Plugin Errors
// ============================================================================

export class PluginError extends Error {
  constructor(
    message: string,
    public pluginId: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'PluginError';
  }
}

export class PluginLoadError extends PluginError {
  constructor(pluginId: string, message: string, details?: unknown) {
    super(message, pluginId, 'PLUGIN_LOAD_ERROR', details);
    this.name = 'PluginLoadError';
  }
}

export class PluginInitError extends PluginError {
  constructor(pluginId: string, message: string, details?: unknown) {
    super(message, pluginId, 'PLUGIN_INIT_ERROR', details);
    this.name = 'PluginInitError';
  }
}

export class PluginExecuteError extends PluginError {
  constructor(pluginId: string, message: string, details?: unknown) {
    super(message, pluginId, 'PLUGIN_EXECUTE_ERROR', details);
    this.name = 'PluginExecuteError';
  }
}

export class PluginDependencyError extends PluginError {
  constructor(pluginId: string, message: string, details?: unknown) {
    super(message, pluginId, 'PLUGIN_DEPENDENCY_ERROR', details);
    this.name = 'PluginDependencyError';
  }
}

export class PluginPermissionError extends PluginError {
  constructor(pluginId: string, message: string, details?: unknown) {
    super(message, pluginId, 'PLUGIN_PERMISSION_ERROR', details);
    this.name = 'PluginPermissionError';
  }
}

export class PluginSandboxError extends PluginError {
  constructor(pluginId: string, message: string, details?: unknown) {
    super(message, pluginId, 'PLUGIN_SANDBOX_ERROR', details);
    this.name = 'PluginSandboxError';
  }
}

export class PluginValidationError extends PluginError {
  constructor(pluginId: string, message: string, details?: unknown) {
    super(message, pluginId, 'PLUGIN_VALIDATION_ERROR', details);
    this.name = 'PluginValidationError';
  }
}
