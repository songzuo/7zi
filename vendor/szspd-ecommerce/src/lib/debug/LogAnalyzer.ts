/**
 * @fileoverview 日志分析集成
 * 分析日志文件，识别错误模式，生成诊断报告
 * @version v1.10.0
 */

import type { DiagnosticReport, ErrorClassification, LogEntry } from './types'
import { DiagnosticEngine, diagnosticEngine } from './DiagnosticEngine'
import { errorClassifier } from './ErrorClassifier'

// ============================================
// 类型定义
// ============================================

export interface LogAnalysisResult {
  totalEntries: number
  errorCount: number
  warningCount: number
  errorCategories: Map<string, number>
  topErrors: LogErrorSummary[]
  patterns: LogPattern[]
  diagnosticReports: DiagnosticReport[]
  recommendations: string[]
}

export interface LogErrorSummary {
  message: string
  count: number
  category: ErrorClassification['category']
  firstOccurrence: string
  lastOccurrence: string
  sampleStack?: string
}

export interface LogPattern {
  pattern: string
  type: 'frequency' | 'sequence' | 'correlation'
  description: string
  occurrences: number
  severity: 'critical' | 'high' | 'medium' | 'low'
}

// ============================================
// 日志分析器
// ============================================

/**
 * 日志分析器
 */
export class LogAnalyzer {
  private engine: DiagnosticEngine

  constructor(engine: DiagnosticEngine = diagnosticEngine) {
    this.engine = engine
  }

  /**
   * 分析日志条目数组
   */
  async analyzeLogs(entries: LogEntry[]): Promise<LogAnalysisResult> {
    const totalEntries = entries.length
    const errorEntries = entries.filter(e => e.level === 'error')
    const warningEntries = entries.filter(e => e.level === 'warn')

    // 分类错误
    const errorCategories = new Map<string, number>()
    const errorSummaries = new Map<string, LogErrorSummary>()

    for (const entry of errorEntries) {
      const classification = errorClassifier.classify(entry.message)
      const key = `${classification.category}/${classification.subtype}`

      errorCategories.set(key, (errorCategories.get(key) || 0) + 1)

      // 收集错误摘要
      const messageKey = entry.message.slice(0, 100)
      if (!errorSummaries.has(messageKey)) {
        errorSummaries.set(messageKey, {
          message: entry.message,
          count: 1,
          category: classification.category,
          firstOccurrence: entry.timestamp,
          lastOccurrence: entry.timestamp,
          sampleStack: entry.meta?.stack as string | undefined,
        })
      } else {
        const summary = errorSummaries.get(messageKey)!
        summary.count++
        summary.lastOccurrence = entry.timestamp
      }
    }

    // 获取 top 错误
    const topErrors = Array.from(errorSummaries.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // 检测模式
    const patterns = this.detectPatterns(entries)

    // 为 top 错误生成诊断报告
    const diagnosticReports: DiagnosticReport[] = []
    for (const error of topErrors.slice(0, 5)) {
      try {
        const report = await this.engine.analyze(new Error(error.message))
        diagnosticReports.push(report)
      } catch (e) {
        // 忽略分析错误
      }
    }

    // 生成建议
    const recommendations = this.generateRecommendations(
      errorCategories,
      topErrors,
      patterns
    )

    return {
      totalEntries,
      errorCount: errorEntries.length,
      warningCount: warningEntries.length,
      errorCategories,
      topErrors,
      patterns,
      diagnosticReports,
      recommendations,
    }
  }

  /**
   * 分析日志文件内容
   */
  async analyzeLogFile(content: string, parser?: LogParser): Promise<LogAnalysisResult> {
    const entries = parser ? parser(content) : this.defaultParser(content)
    return this.analyzeLogs(entries)
  }

  /**
   * 检测日志模式
   */
  private detectPatterns(entries: LogEntry[]): LogPattern[] {
    const patterns: LogPattern[] = []

    // 检测频率模式（高频错误）
    const errorFrequency = new Map<string, LogEntry[]>()
    for (const entry of entries.filter(e => e.level === 'error')) {
      const key = entry.message.slice(0, 50)
      if (!errorFrequency.has(key)) {
        errorFrequency.set(key, [])
      }
      errorFrequency.get(key)!.push(entry)
    }

    for (const [pattern, matches] of errorFrequency) {
      if (matches.length >= 3) {
        patterns.push({
          pattern,
          type: 'frequency',
          description: `High frequency error: "${pattern}..." occurred ${matches.length} times`,
          occurrences: matches.length,
          severity: matches.length >= 10 ? 'critical' : matches.length >= 5 ? 'high' : 'medium',
        })
      }
    }

    // 检测序列模式（连续错误）
    let consecutiveCount = 0
    let maxConsecutive = 0
    for (const entry of entries) {
      if (entry.level === 'error') {
        consecutiveCount++
        maxConsecutive = Math.max(maxConsecutive, consecutiveCount)
      } else {
        consecutiveCount = 0
      }
    }

    if (maxConsecutive >= 5) {
      patterns.push({
        pattern: 'consecutive-errors',
        type: 'sequence',
        description: `${maxConsecutive} consecutive errors detected`,
        occurrences: 1,
        severity: maxConsecutive >= 10 ? 'critical' : 'high',
      })
    }

    return patterns.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    })
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    categories: Map<string, number>,
    topErrors: LogErrorSummary[],
    patterns: LogPattern[]
  ): string[] {
    const recommendations: string[] = []

    // 基于分类建议
    if (categories.get('runtime/null-reference') || categories.get('runtime/undefined-reference')) {
      recommendations.push('添加 null/undefined 检查，考虑使用可选链操作符 (?.)')
    }

    if (categories.get('network/timeout')) {
      recommendations.push('添加网络请求重试逻辑和超时处理')
    }

    if (categories.get('database/query-timeout')) {
      recommendations.push('检查数据库索引，优化慢查询')
    }

    if (categories.get('system/out-of-memory')) {
      recommendations.push('检查内存泄漏，增加堆内存限制')
    }

    // 基于模式建议
    const highFrequencyPattern = patterns.find(p => p.type === 'frequency')
    if (highFrequencyPattern) {
      recommendations.push(`高频错误需要优先处理: ${highFrequencyPattern.description}`)
    }

    return recommendations
  }

  /**
   * 默认日志解析器
   */
  private defaultParser(content: string): LogEntry[] {
    const lines = content.split('\n')
    const entries: LogEntry[] = []

    for (const line of lines) {
      if (!line.trim()) continue

      // 尝试解析常见格式
      // 格式: [LEVEL] timestamp message
      const match = line.match(/^\[?(\w+)\]?\s*(.+)$/)
      if (match) {
        const level = match[1].toLowerCase() as LogEntry['level']
        const rest = match[2]

        // 尝试提取时间戳
        const timestampMatch = rest.match(/^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})\s*(.*)$/)

        entries.push({
          timestamp: timestampMatch ? timestampMatch[1] : new Date().toISOString(),
          level: ['error', 'warn', 'info', 'debug'].includes(level) ? level : 'info',
          message: timestampMatch ? timestampMatch[2] : rest,
        })
      }
    }

    return entries
  }
}

// ============================================
// 类型
// ============================================

export type LogParser = (content: string) => LogEntry[]

// ============================================
// 导出
// ============================================

export const logAnalyzer = new LogAnalyzer()

export default {
  LogAnalyzer,
  logAnalyzer,
}