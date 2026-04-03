/**
 * @fileoverview 诊断报告生成器
 * 整合所有分析结果，生成完整的诊断报告
 * @version v1.10.0
 */

import type {
  DiagnosticReport,
  ErrorSummary,
  ErrorClassification,
  StackAnalysis,
  ContextAnalysis,
  RootCauseAnalysis,
  FixSuggestion,
  ReportMetadata,
  EnvironmentInfo,
  AnalysisContext,
} from './types'

import { errorClassifier } from './ErrorClassifier'
import { stackAnalyzer } from './StackAnalyzer'
import { contextAnalyzer } from './ContextAnalyzer'
import { rootCauseAnalyzer } from './RootCauseAnalyzer'
import { fixSuggester } from './FixSuggester'
import { DEFAULT_DEBUG_CONFIG, type DebugSystemConfig } from './types'

// ============================================
// 诊断引擎
// ============================================

/**
 * 智能调试系统 - 主引擎
 */
export class DiagnosticEngine {
  private config: DebugSystemConfig

  constructor(config: Partial<DebugSystemConfig> = {}) {
    this.config = { ...DEFAULT_DEBUG_CONFIG, ...config }
  }

  /**
   * 分析错误并生成诊断报告
   */
  async analyze(
    error: Error | string,
    context?: AnalysisContext
  ): Promise<DiagnosticReport> {
    const startTime = Date.now()
    const errorObj = typeof error === 'string' ? new Error(error) : error

    // 1. 错误分类
    const classification = errorClassifier.classify(errorObj)

    // 2. 堆栈分析
    const stackAnalysis = stackAnalyzer.analyze(errorObj)

    // 3. 上下文分析
    let contextAnalysis: ContextAnalysis
    if (context?.sourceCode) {
      contextAnalysis = await contextAnalyzer.analyze(errorObj, context.sourceCode)
    } else {
      contextAnalysis = await contextAnalyzer.analyze(errorObj)
    }

    // 4. 根因分析
    const rootCauseAnalysis = rootCauseAnalyzer.analyze(
      errorObj,
      classification,
      stackAnalysis,
      contextAnalysis
    )

    // 5. 生成修复建议
    const fixSuggestions = fixSuggester.suggest(
      errorObj,
      classification,
      stackAnalysis,
      contextAnalysis,
      rootCauseAnalysis
    )

    // 6. 限制建议数量
    const limitedSuggestions = fixSuggestions.slice(0, this.config.maxFixSuggestions)

    // 7. 生成报告
    const report: DiagnosticReport = {
      id: this.generateReportId(),
      timestamp: new Date().toISOString(),
      error: this.createErrorSummary(errorObj),
      classification,
      stackAnalysis,
      contextAnalysis,
      rootCauseAnalysis,
      fixSuggestions: limitedSuggestions,
      metadata: {
        analysisDuration: Date.now() - startTime,
        analysisVersion: 'v1.10.0',
        traceId: context?.state?.traceId as string | undefined,
        sessionId: context?.state?.sessionId as string | undefined,
        userId: context?.state?.userId as string | undefined,
      },
    }

    // 记录分析日志
    if (this.config.logAnalysis) {
      this.logAnalysis(report)
    }

    return report
  }

  /**
   * 分析多个错误
   */
  async analyzeBatch(
    errors: (Error | string)[],
    context?: AnalysisContext
  ): Promise<DiagnosticReport[]> {
    const reports: DiagnosticReport[] = []

    for (const error of errors) {
      const report = await this.analyze(error, context)
      reports.push(report)
    }

    return reports
  }

  /**
   * 快速分类错误（不生成完整报告）
   */
  classify(error: Error | string): ErrorClassification {
    return errorClassifier.classify(error)
  }

  /**
   * 快速堆栈分析（不生成完整报告）
   */
  analyzeStack(error: Error): StackAnalysis {
    return stackAnalyzer.analyze(error)
  }

  // ============================================
  // 私有方法
  // ============================================

  private generateReportId(): string {
    return `diag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private createErrorSummary(error: Error): ErrorSummary {
    const env: EnvironmentInfo = {}

    if (typeof navigator !== 'undefined') {
      env.browser = navigator.userAgent
    }

    if (typeof process !== 'undefined') {
      env.platform = process.platform
      env.nodeVersion = process.version
    }

    return {
      name: error.name || 'Error',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      environment: env,
    }
  }

  private logAnalysis(report: DiagnosticReport): void {
    const {
      id,
      timestamp,
      classification,
      rootCauseAnalysis,
      fixSuggestions,
      metadata,
    } = report

    console.group(`🔍 Diagnostic Report: ${id}`)
    console.log('Timestamp:', timestamp)
    console.log('Error:', classification.category, '/', classification.subtype)
    console.log('Severity:', classification.severity)
    console.log('Confidence:', (classification.confidence * 100).toFixed(1) + '%')
    console.log('Root Cause:', rootCauseAnalysis.type)
    console.log('Root Cause Description:', rootCauseAnalysis.description)
    console.log('Fix Suggestions:', fixSuggestions.length)
    console.log('Analysis Duration:', metadata.analysisDuration, 'ms')
    console.groupEnd()
  }
}

// ============================================
// 便捷函数
// ============================================

/**
 * 快速分析错误
 */
export async function diagnose(error: Error | string): Promise<DiagnosticReport> {
  const engine = new DiagnosticEngine()
  return engine.analyze(error)
}

/**
 * 快速分类
 */
export function classify(error: Error | string): ErrorClassification {
  return errorClassifier.classify(error)
}

/**
 * 快速分析堆栈
 */
export function analyzeStack(error: Error): StackAnalysis {
  return stackAnalyzer.analyze(error)
}

// ============================================
// 导出
// ============================================

export const diagnosticEngine = new DiagnosticEngine()

export default {
  DiagnosticEngine,
  diagnosticEngine,
  diagnose,
  classify,
  analyzeStack,
}

// Re-export all types and sub-modules
export * from './types'
export { ErrorClassifier, errorClassifier } from './ErrorClassifier'
export { StackAnalyzer, stackAnalyzer, parseStackTrace } from './StackAnalyzer'
export { ContextAnalyzer, contextAnalyzer } from './ContextAnalyzer'
export { RootCauseAnalyzer, rootCauseAnalyzer } from './RootCauseAnalyzer'
export { FixSuggester, fixSuggester } from './FixSuggester'