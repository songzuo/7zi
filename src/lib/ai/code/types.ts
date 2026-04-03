/**
 * @fileoverview 代码增强系统类型定义
 */

/**
 * 支持的编程语言
 */
export type SupportedLanguage = 'typescript' | 'javascript' | 'python' | 'go' | 'rust' | 'java' | 'csharp'

/**
 * 代码位置
 */
export interface CodePosition {
  line: number
  column: number
}

/**
 * 代码范围
 */
export interface CodeRange {
  start: CodePosition
  end: CodePosition
}

/**
 * 代码分析结果
 */
export interface CodeAnalysis {
  /** 语言 */
  language: string
  /** 复杂度 */
  complexity: {
    cyclomatic: number
    cognitive: number
    maintainability: number
  }
  /** 统计信息 */
  stats: {
    linesOfCode: number
    blankLines: number
    commentLines: number
    functions: number
    classes: number
  }
  /** 依赖 */
  dependencies: string[]
  /** 导出 */
  exports: string[]
  /** 导入 */
  imports: string[]
}

/**
 * 代码补全建议
 */
export interface CompletionSuggestion {
  /** 补全文本 */
  text: string
  /** 显示文本 */
  displayText: string
  /** 类型 */
  kind: 'function' | 'variable' | 'snippet' | 'method' | 'class' | 'interface'
  /** 文档 */
  documentation?: string
  /** 置信度 */
  confidence: number
  /** 优先级 */
  priority: number
}

/**
 * 代码审查问题
 */
export interface CodeReviewIssue {
  /** 问题类型 */
  type: 'error' | 'warning' | 'info' | 'style'
  /** 严重程度 */
  severity: 'critical' | 'high' | 'medium' | 'low'
  /** 消息 */
  message: string
  /** 位置 */
  location: CodeRange
  /** 规则ID */
  ruleId?: string
  /** 修复建议 */
  suggestion?: string
  /** 代码示例 */
  example?: {
    bad: string
    good: string
  }
}

/**
 * 代码审查结果
 */
export interface CodeReviewResult {
  /** 问题列表 */
  issues: CodeReviewIssue[]
  /** 评分 */
  score: {
    overall: number
    readability: number
    maintainability: number
    security: number
    performance: number
  }
  /** 统计 */
  stats: {
    total: number
    critical: number
    high: number
    medium: number
    low: number
  }
}

/**
 * Bug 检测结果
 */
export interface BugDetection {
  /** Bug 类型 */
  type: string
  /** 严重程度 */
  severity: 'critical' | 'high' | 'medium' | 'low'
  /** 描述 */
  message: string
  /** 位置 */
  location: CodeRange
  /** 可能的原因 */
  possibleCauses: string[]
  /** 检测方法 */
  detectionMethod: 'pattern' | 'static' | 'ai'
}

/**
 * 修复建议
 */
export interface FixSuggestion {
  /** ID */
  id: string
  /** 描述 */
  description: string
  /** 代码变更 */
  changes: CodeChange[]
  /** 风险等级 */
  riskLevel: 'safe' | 'moderate' | 'risky'
  /** 预估成功率 */
  estimatedSuccessRate: number
  /** 解释 */
  explanation: string
  /** 应用前 */
  before?: string
  /** 应用后 */
  after?: string
}

/**
 * 代码变更
 */
export interface CodeChange {
  /** 文件路径 */
  filePath: string
  /** 范围 */
  range: CodeRange
  /** 原代码 */
  oldCode: string
  /** 新代码 */
  newCode: string
  /** 原因 */
  reason: string
}

/**
 * Diff 格式
 */
export interface Diff {
  /** 文件路径 */
  filePath: string
  /** Diff 内容 */
  diff: string
  /** 变更统计 */
  stats: {
    additions: number
    deletions: number
    changes: number
  }
}

/**
 * 代码解释
 */
export interface CodeExplanation {
  /** 摘要 */
  summary: string
  /** 详细解释 */
  details: string[]
  /** 关键概念 */
  concepts: string[]
  /** 代码片段解释 */
  snippetExplanations: {
    range: CodeRange
    explanation: string
  }[]
  /** 复杂度分析 */
  complexity: {
    time: string
    space: string
  }
}

/**
 * 代码上下文
 */
export interface CodeContext {
  /** 当前代码 */
  code: string
  /** 语言 */
  language: string
  /** 光标位置 */
  position?: CodePosition
  /** 文件路径 */
  filePath?: string
  /** 项目结构 */
  projectStructure?: {
    files: string[]
    dependencies: string[]
  }
  /** 相关文件 */
  relatedFiles?: string[]
}

/**
 * 代码生成请求
 */
export interface CodeGenerationRequest {
  /** 描述 */
  description: string
  /** 语言 */
  language: SupportedLanguage
  /** 上下文 */
  context?: CodeContext
  /** 选项 */
  options?: {
    /** 是否包含注释 */
    includeComments?: boolean
    /** 是否包含测试 */
    includeTests?: boolean
    /** 是否包含文档 */
    includeDocs?: boolean
    /** 代码风格 */
    style?: 'functional' | 'object-oriented' | 'procedural'
  }
}

/**
 * 代码生成结果
 */
export interface CodeGenerationResult {
  /** 生成的代码 */
  code: string
  /** 语言 */
  language: string
  /** 导入 */
  imports: string[]
  /** 依赖 */
  dependencies: string[]
  /** 解释 */
  explanation: string
  /** 替代方案 */
  alternatives?: CodeAlternative[]
}

/**
 * 代码替代方案
 */
export interface CodeAlternative {
  /** 描述 */
  description: string
  /** 代码 */
  code: string
  /** 优缺点 */
  pros: string[]
  cons: string[]
}

/**
 * 重构类型
 */
export type RefactorType =
  | 'extract-function'
  | 'inline-function'
  | 'rename-variable'
  | 'extract-variable'
  | 'extract-constant'
  | 'convert-arrow-function'
  | 'convert-to-arrow-function'
  | 'simplify-ternary'
  | 'merge-if-statements'
  | 'split-if-statement'

/**
 * 重构选项
 */
export interface RefactorOptions {
  /** 是否保留注释 */
  preserveComments?: boolean
  /** 是否格式化 */
  format?: boolean
  /** 是否生成测试 */
  generateTests?: boolean
}

/**
 * 重构结果
 */
export interface RefactoredCode {
  /** 重构后的代码 */
  code: string
  /** 变更 */
  changes: CodeChange[]
  /** 解释 */
  explanation: string
  /** 风险评估 */
  riskAssessment: {
    level: 'low' | 'medium' | 'high'
    reasons: string[]
  }
}

/**
 * 测试框架
 */
export type TestFramework = 'jest' | 'vitest' | 'mocha' | 'pytest' | 'go-test' | 'rust-test'

/**
 * 文档风格
 */
export type DocStyle = 'jsdoc' | 'tSDoc' | 'docstring' | 'godoc' | 'rustdoc'

/**
 * 错误类型
 */
export type ErrorType =
  | 'syntax'
  | 'type'
  | 'runtime'
  | 'logic'
  | 'security'
  | 'performance'
  | 'concurrency'

/**
 * 错误分析
 */
export interface ErrorAnalysis {
  /** 错误类型 */
  errorType: ErrorType
  /** 根本原因 */
  rootCause: string
  /** 置信度 */
  confidence: number
  /** 受影响的文件 */
  affectedFiles: string[]
  /** 严重程度 */
  severity: 'low' | 'medium' | 'high' | 'critical'
  /** 相似的历史错误 */
  similarHistoricalErrors: HistoricalError[]
  /** 建议的修复 */
  suggestedFixes: FixSuggestion[]
}

/**
 * 历史错误
 */
export interface HistoricalError {
  /** 错误消息 */
  message: string
  /** 发生时间 */
  timestamp: Date
  /** 修复方法 */
  fixMethod: string
  /** 成功率 */
  successRate: number
}

/**
 * UI 分析结果
 */
export interface UIAnalysisResult {
  /** 组件 */
  components: UIComponent[]
  /** 布局分析 */
  layout: LayoutAnalysis
  /** 可访问性问题 */
  accessibility: AccessibilityIssue[]
  /** 建议 */
  suggestions: UISuggestion[]
  /** 置信度 */
  confidence: number
}

/**
 * UI 组件
 */
export interface UIComponent {
  /** 类型 */
  type: string
  /** 位置 */
  position: CodeRange
  /** 属性 */
  attributes: Record<string, string>
  /** 文本内容 */
  text?: string
}

/**
 * 布局分析
 */
export interface LayoutAnalysis {
  /** 布局类型 */
  type: 'flex' | 'grid' | 'absolute' | 'relative'
  /** 响应式 */
  responsive: boolean
  /** 问题 */
  issues: string[]
}

/**
 * 可访问性问题
 */
export interface AccessibilityIssue {
  /** 类型 */
  type: string
  /** 严重程度 */
  severity: 'critical' | 'high' | 'medium' | 'low'
  /** 描述 */
  description: string
  /** 位置 */
  location: CodeRange
  /** 修复建议 */
  suggestion: string
}

/**
 * UI 建议
 */
export interface UISuggestion {
  /** 类型 */
  type: 'improvement' | 'fix' | 'optimization'
  /** 描述 */
  description: string
  /** 优先级 */
  priority: 'high' | 'medium' | 'low'
  /** 影响 */
  impact: string
}

/**
 * 组件规范值
 */
export interface ComponentSpec {
  name: string
  description?: string
  props?: Record<string, ComponentPropSpec>
  variants?: string[]
  defaultValue?: string
}

/**
 * 组件属性规范
 */
export interface ComponentPropSpec {
  type: string
  required?: boolean
  defaultValue?: string
  description?: string
}

/**
 * 设计指南
 */
export interface DesignGuidelines {
  /** 颜色规范 */
  colors?: Record<string, string>
  /** 字体规范 */
  typography?: {
    fontFamily: string
    fontSize: Record<string, string>
  }
  /** 间距规范 */
  spacing?: Record<string, string>
  /** 组件规范 */
  components?: Record<string, ComponentSpec>
}

/**
 * 设计审查
 */
export interface DesignReview {
  /** 符合度 */
  compliance: number
  /** 问题 */
  issues: DesignIssue[]
  /** 建议 */
  suggestions: string[]
  /** 总体评价 */
  overall: string
}

/**
 * 设计问题
 */
export interface DesignIssue {
  /** 类型 */
  type: string
  /** 严重程度 */
  severity: 'critical' | 'high' | 'medium' | 'low'
  /** 描述 */
  description: string
  /** 位置 */
  location?: CodeRange
  /** 修复建议 */
  suggestion: string
}

/**
 * 图表数据
 */
export interface ChartData {
  /** 类型 */
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'area'
  /** 数据 */
  data: {
    labels: string[]
    values: number[]
  }
  /** 元数据 */
  metadata?: {
    title?: string
    xAxis?: string
    yAxis?: string
  }
}

/**
 * 图像输入
 */
export interface ImageInput {
  /** 图像数据 */
  data: Buffer | string
  /** 格式 */
  format: 'png' | 'jpeg' | 'gif' | 'webp'
  /** URL */
  url?: string
}

/**
 * 视觉任务
 */
export type VisionTask =
  | 'analyze'
  | 'ui-analysis'
  | 'design-review'
  | 'chart-extraction'
  | 'code-recognition'
  | 'ocr'

/**
 * 视觉分析结果
 */
export interface VisionAnalysisResult {
  /** 分析描述 */
  description: string
  /** 检测到的对象 */
  objects?: Array<{
    type: string
    confidence: number
    boundingBox?: { x: number; y: number; width: number; height: number }
  }>
  /** 文本内容 (OCR) */
  text?: string
  /** 代码内容 */
  code?: {
    language: string
    content: string
  }
}

/**
 * 视觉分析
 */
export interface VisionAnalysis {
  /** 任务类型 */
  task: VisionTask
  /** 结果 */
  result: VisionAnalysisResult
  /** 置信度 */
  confidence: number
  /** 元数据 */
  metadata?: Record<string, unknown>
}