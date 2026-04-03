/**
 * @fileoverview 智能调试系统 - 统一导出
 * @version v1.10.0
 *
 * 功能：
 * - 错误分类（语法/运行时/逻辑/系统）
 * - 堆栈分析，定位问题源头
 * - 上下文关联，分析错误原因
 * - 修复方案生成并排序
 * - 根因挖掘，找到根本原因
 * - 日志分析，识别错误模式
 * - 告警集成，自动触发告警
 *
 * 使用方法：
 * ```typescript
 * import { diagnose, DiagnosticEngine } from './debug'
 *
 * // 快速诊断
 * const report = await diagnose(error)
 *
 * // 自定义配置
 * const engine = new DiagnosticEngine({ maxFixSuggestions: 10 })
 * const report = await engine.analyze(error, { sourceCode })
 *
 * // 日志分析
 * import { logAnalyzer } from './debug'
 * const result = await logAnalyzer.analyzeLogs(logEntries)
 *
 * // 告警集成
 * import { alertIntegration, consoleAlertHandler } from './debug'
 * alertIntegration.registerHandler(consoleAlertHandler)
 * await alertIntegration.handleError(error, 'api')
 * ```
 */

export * from './types'

// 核心类
export { DiagnosticEngine, diagnosticEngine, diagnose, classify, analyzeStack } from './DiagnosticEngine'
export { ErrorClassifier, errorClassifier } from './ErrorClassifier'
export { StackAnalyzer, stackAnalyzer, parseStackTrace, getSourceContext } from './StackAnalyzer'
export { ContextAnalyzer, contextAnalyzer } from './ContextAnalyzer'
export { RootCauseAnalyzer, rootCauseAnalyzer } from './RootCauseAnalyzer'
export { FixSuggester, fixSuggester } from './FixSuggester'

// 集成模块
export {
  AlertIntegrationManager,
  alertIntegration,
  consoleAlertHandler,
  WebhookAlertHandler,
  SlackAlertHandler,
  type AlertIntegration,
  type AlertHandler,
} from './AlertIntegration'

export {
  LogAnalyzer,
  logAnalyzer,
  type LogAnalysisResult,
  type LogErrorSummary,
  type LogPattern,
  type LogParser,
} from './LogAnalyzer'

// 默认配置
export { DEFAULT_DEBUG_CONFIG, type DebugSystemConfig } from './types'
