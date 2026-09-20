/**
 * @fileoverview 智能调试系统 - 类型定义
 * @version v1.10.0
 */

// ============================================
// 错误分类类型
// ============================================

/**
 * 错误类别
 */
export type ErrorCategory =
  | 'syntax' // 语法错误
  | 'runtime' // 运行时错误
  | 'logic' // 逻辑错误
  | 'system' // 系统错误
  | 'network' // 网络错误
  | 'database' // 数据库错误
  | 'validation' // 验证错误
  | 'auth' // 认证错误
  | 'resource' // 资源错误
  | 'unknown' // 未知错误

/**
 * 错误严重程度
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

/**
 * 错误子类型
 */
export type ErrorSubtype =
  // 语法错误子类型
  | 'unexpected-token'
  | 'missing-bracket'
  | 'invalid-syntax'
  | 'type-mismatch'
  // 运行时错误子类型
  | 'null-reference'
  | 'undefined-reference'
  | 'type-error'
  | 'range-error'
  | 'reference-error'
  // 逻辑错误子类型
  | 'infinite-loop'
  | 'off-by-one'
  | 'race-condition'
  | 'deadlock'
  // 系统错误子类型
  | 'out-of-memory'
  | 'stack-overflow'
  | 'permission-denied'
  | 'file-not-found'
  // 网络错误子类型
  | 'timeout'
  | 'connection-refused'
  | 'dns-error'
  | 'ssl-error'
  // 数据库错误子类型
  | 'query-timeout'
  | 'connection-pool-exhausted'
  | 'deadlock-detected'
  | 'constraint-violation'
  // 其他
  | 'unknown'

/**
 * 分类结果
 */
export interface ErrorClassification {
  category: ErrorCategory
  subtype: ErrorSubtype
  severity: ErrorSeverity
  confidence: number // 0.0 - 1.0
  description: string
  tags: string[]
}

// ============================================
// 堆栈分析类型
// ============================================

/**
 * 堆栈帧
 */
export interface StackFrame {
  id: string
  functionName: string
  fileName: string
  lineNumber: number
  columnNumber: number
  isNative: boolean
  isConstructor: boolean
  source?: string // 源代码片段
  context?: SourceContext
}

/**
 * 源代码上下文
 */
export interface SourceContext {
  before: string[] // 错误行之前的代码
  line: string // 错误行
  after: string[] // 错误行之后的代码
  highlightLine: number
}

/**
 * 堆栈分析结果
 */
export interface StackAnalysis {
  frames: StackFrame[]
  rootFrame: StackFrame | null // 最可能的错误源头
  errorChain: ErrorChainItem[]
  entryPoint: StackFrame | null // 应用入口点
  isRecoverable: boolean
  suggestions: string[]
}

/**
 * 错误链项目
 */
export interface ErrorChainItem {
  frame: StackFrame
  type: 'cause' | 'propagation' | 'handler'
  description: string
}

// ============================================
// 上下文分析类型
// ============================================

/**
 * 上下文变量
 */
export interface ContextVariable {
  name: string
  type: string
  value: string
  isDefined: boolean
  scope: 'local' | 'closure' | 'global'
}

/**
 * 上下文分析结果
 */
export interface ContextAnalysis {
  variables: ContextVariable[]
  relatedCode: CodeReference[]
  dependencies: Dependency[]
  stateSnapshot: Record<string, unknown>
  suspiciousPatterns: SuspiciousPattern[]
}

/**
 * 代码引用
 */
export interface CodeReference {
  filePath: string
  startLine: number
  endLine: number
  content: string
  relevance: number // 0.0 - 1.0
  reason: string
}

/**
 * 依赖关系
 */
export interface Dependency {
  name: string
  version?: string
  type: 'import' | 'require' | 'global'
  isUsed: boolean
  potentialIssue?: string
}

/**
 * 可疑模式
 */
export interface SuspiciousPattern {
  pattern: string
  location: string
  description: string
  risk: 'low' | 'medium' | 'high'
  suggestion: string
}

// ============================================
// 修复方案类型
// ============================================

/**
 * 修复方案
 */
export interface FixSuggestion {
  id: string
  title: string
  description: string
  priority: 'immediate' | 'high' | 'medium' | 'low'
  effort: 'easy' | 'moderate' | 'complex'
  confidence: number // 0.0 - 1.0
  codeChanges?: CodeChange[]
  steps: FixStep[]
  relatedDocs: string[]
  testSuggestion?: string
}

/**
 * 代码变更
 */
export interface CodeChange {
  filePath: string
  type: 'replace' | 'insert' | 'delete'
  startLine: number
  endLine?: number
  originalCode?: string
  newCode: string
  explanation: string
}

/**
 * 修复步骤
 */
export interface FixStep {
  order: number
  action: string
  detail: string
  verificationMethod?: string
}

// ============================================
// 根因分析类型
// ============================================

/**
 * 根因类型
 */
export type RootCauseType =
  | 'code-defect' // 代码缺陷
  | 'configuration-error' // 配置错误
  | 'dependency-issue' // 依赖问题
  | 'environment-issue' // 环境问题
  | 'resource-exhaustion' // 资源耗尽
  | 'concurrency-issue' // 并发问题
  | 'data-issue' // 数据问题
  | 'integration-issue' // 集成问题
  | 'design-flaw' // 设计缺陷
  | 'unknown'

/**
 * 根因分析结果
 */
export interface RootCauseAnalysis {
  type: RootCauseType
  description: string
  confidence: number
  evidence: Evidence[]
  contributingFactors: ContributingFactor[]
  timeline: TimelineEvent[]
  affectedComponents: string[]
  propagationPath: PropagationStep[]
}

/**
 * 证据
 */
export interface Evidence {
  id: string
  type: 'code' | 'log' | 'metric' | 'trace' | 'state'
  source: string
  content: string
  relevance: number
  timestamp?: string
}

/**
 * 贡献因素
 */
export interface ContributingFactor {
  factor: string
  impact: 'major' | 'moderate' | 'minor'
  description: string
  remediation?: string
}

/**
 * 时间线事件
 */
export interface TimelineEvent {
  timestamp: string
  type: 'cause' | 'effect' | 'mitigation'
  description: string
  metadata?: Record<string, unknown>
}

/**
 * 传播步骤
 */
export interface PropagationStep {
  from: string
  to: string
  mechanism: string
  timestamp?: string
}

// ============================================
// 诊断报告类型
// ============================================

/**
 * 诊断报告
 */
export interface DiagnosticReport {
  id: string
  timestamp: string
  error: ErrorSummary
  classification: ErrorClassification
  stackAnalysis: StackAnalysis
  contextAnalysis: ContextAnalysis
  rootCauseAnalysis: RootCauseAnalysis
  fixSuggestions: FixSuggestion[]
  metadata: ReportMetadata
}

/**
 * 错误摘要
 */
export interface ErrorSummary {
  name: string
  message: string
  stack?: string
  code?: string
  timestamp: string
  environment: EnvironmentInfo
}

/**
 * 环境信息
 */
export interface EnvironmentInfo {
  platform?: string
  nodeVersion?: string
  browser?: string
  appVersion?: string
  buildId?: string
}

/**
 * 报告元数据
 */
export interface ReportMetadata {
  analysisDuration: number // ms
  analysisVersion: string
  modelUsed?: string
  traceId?: string
  sessionId?: string
  userId?: string
}

// ============================================
// 分析器接口
// ============================================

/**
 * 错误分析器接口
 */
export interface ErrorAnalyzer {
  analyze(error: Error, context?: AnalysisContext): Promise<DiagnosticReport>
}

/**
 * 分析上下文
 */
export interface AnalysisContext {
  sourceCode?: Map<string, string> // 文件路径 -> 源代码
  logs?: LogEntry[]
  metrics?: MetricData[]
  traces?: TraceData[]
  state?: Record<string, unknown>
  environment?: EnvironmentInfo
}

/**
 * 日志条目
 */
export interface LogEntry {
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  meta?: Record<string, unknown>
}

/**
 * 指标数据
 */
export interface MetricData {
  name: string
  value: number
  timestamp: string
  tags?: Record<string, string>
}

/**
 * 追踪数据
 */
export interface TraceData {
  traceId: string
  spanId: string
  operation: string
  duration: number
  status: 'ok' | 'error'
  attributes?: Record<string, unknown>
}

// ============================================
// 配置类型
// ============================================

/**
 * 调试系统配置
 */
export interface DebugSystemConfig {
  enableSourceContext: boolean
  maxStackFrames: number
  maxFixSuggestions: number
  minConfidence: number
  includeExperimentalFixes: boolean
  logAnalysis: boolean
  traceIntegration: boolean
  alertIntegration: boolean
}

/**
 * 默认配置
 */
export const DEFAULT_DEBUG_CONFIG: DebugSystemConfig = {
  enableSourceContext: true,
  maxStackFrames: 50,
  maxFixSuggestions: 5,
  minConfidence: 0.3,
  includeExperimentalFixes: false,
  logAnalysis: true,
  traceIntegration: true,
  alertIntegration: true,
}
