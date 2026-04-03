/**
 * @fileoverview 智能调试系统使用示例
 * @version v1.10.0
 */

import {
  // 核心引擎
  DiagnosticEngine,
  diagnosticEngine,
  diagnose,
  classify,
  analyzeStack,

  // 集成
  alertIntegration,
  consoleAlertHandler,
  logAnalyzer,

  // 类型
  type DiagnosticReport,
  type ErrorClassification,
  type StackAnalysis,
} from './index'

// ============================================
// 示例 1: 基础使用
// ============================================

async function basicExample() {
  // 创建错误
  const error = new Error("Cannot read property 'user' of null")

  // 快速诊断
  const report = await diagnose(error)

  console.log('=== 基础示例 ===')
  console.log('错误类别:', report.classification.category)
  console.log('错误子类型:', report.classification.subtype)
  console.log('严重程度:', report.classification.severity)
  console.log('根因:', report.rootCauseAnalysis.description)
  console.log('修复建议数量:', report.fixSuggestions.length)
}

// ============================================
// 示例 2: 错误分类
// ============================================

function classificationExample() {
  console.log('\n=== 错误分类示例 ===')

  const testErrors = [
    new Error("Cannot read property 'x' of null"),
    new Error("'myVar' is not defined"),
    new TypeError('obj.method is not a function'),
    new SyntaxError('Unexpected token }'),
    new Error('ETIMEDOUT: Connection timeout'),
    new Error('JavaScript heap out of memory'),
    new Error('Connection pool exhausted'),
    new Error('Unauthorized: Invalid token'),
  ]

  for (const error of testErrors) {
    const classification = classify(error)
    console.log(`[${classification.severity.toUpperCase()}] ${classification.category}/${classification.subtype}`)
  }
}

// ============================================
// 示例 3: 堆栈分析
// ============================================

function stackAnalysisExample() {
  console.log('\n=== 堆栈分析示例 ===')

  function innerFunction() {
    throw new Error('Test error from inner function')
  }

  function middleFunction() {
    innerFunction()
  }

  function outerFunction() {
    middleFunction()
  }

  try {
    outerFunction()
  } catch (error) {
    const analysis = analyzeStack(error as Error)

    console.log('错误源头:', analysis.rootFrame?.functionName)
    console.log('入口点:', analysis.entryPoint?.functionName)
    console.log('错误传播链长度:', analysis.errorChain.length)
    console.log('是否可恢复:', analysis.isRecoverable)
    console.log('建议:')
    analysis.suggestions.forEach(s => console.log('  -', s))
  }
}

// ============================================
// 示例 4: 完整诊断
// ============================================

async function fullDiagnosticExample() {
  console.log('\n=== 完整诊断示例 ===')

  const engine = new DiagnosticEngine({
    maxFixSuggestions: 10,
    logAnalysis: true,
  })

  const error = new Error('Failed to fetch data: ETIMEDOUT')

  const report = await engine.analyze(error)

  console.log('诊断报告 ID:', report.id)
  console.log('分析耗时:', report.metadata.analysisDuration, 'ms')
  console.log('\n错误摘要:')
  console.log('  名称:', report.error.name)
  console.log('  消息:', report.error.message)
  console.log('\n分类:')
  console.log('  类别:', report.classification.category)
  console.log('  严重程度:', report.classification.severity)
  console.log('  置信度:', (report.classification.confidence * 100).toFixed(1) + '%')
  console.log('\n根因分析:')
  console.log('  类型:', report.rootCauseAnalysis.type)
  console.log('  描述:', report.rootCauseAnalysis.description)
  console.log('  置信度:', (report.rootCauseAnalysis.confidence * 100).toFixed(1) + '%')
  console.log('\n修复建议:')
  for (const suggestion of report.fixSuggestions) {
    console.log(`  [${suggestion.priority}] ${suggestion.title}`)
    console.log(`    难度: ${suggestion.effort}, 置信度: ${(suggestion.confidence * 100).toFixed(1)}%`)
  }
}

// ============================================
// 示例 5: 日志分析
// ============================================

async function logAnalysisExample() {
  console.log('\n=== 日志分析示例 ===')

  const logEntries = [
    { timestamp: '2024-01-01T10:00:00Z', level: 'info' as const, message: 'Application started' },
    { timestamp: '2024-01-01T10:00:01Z', level: 'info' as const, message: 'User logged in' },
    { timestamp: '2024-01-01T10:00:05Z', level: 'error' as const, message: "Cannot read property 'data' of null" },
    { timestamp: '2024-01-01T10:00:06Z', level: 'error' as const, message: "Cannot read property 'data' of null" },
    { timestamp: '2024-01-01T10:00:07Z', level: 'error' as const, message: "Cannot read property 'data' of null" },
    { timestamp: '2024-01-01T10:00:10Z', level: 'warn' as const, message: 'Slow query detected' },
    { timestamp: '2024-01-01T10:00:15Z', level: 'error' as const, message: 'ETIMEDOUT: Connection timeout' },
    { timestamp: '2024-01-01T10:00:16Z', level: 'info' as const, message: 'Request processed' },
  ]

  const result = await logAnalyzer.analyzeLogs(logEntries)

  console.log('总日志数:', result.totalEntries)
  console.log('错误数:', result.errorCount)
  console.log('警告数:', result.warningCount)
  console.log('\n错误分类:')
  result.errorCategories.forEach((count, category) => {
    console.log(`  ${category}: ${count}`)
  })
  console.log('\nTop 错误:')
  result.topErrors.forEach(err => {
    console.log(`  - ${err.message.slice(0, 50)}... (${err.count} 次)`)
  })
  console.log('\n检测到的模式:')
  result.patterns.forEach(pattern => {
    console.log(`  [${pattern.severity}] ${pattern.description}`)
  })
  console.log('\n建议:')
  result.recommendations.forEach(rec => console.log('  -', rec))
}

// ============================================
// 示例 6: 告警集成
// ============================================

async function alertIntegrationExample() {
  console.log('\n=== 告警集成示例 ===')

  // 注册控制台处理器
  alertIntegration.registerHandler(consoleAlertHandler)

  // 模拟处理错误并触发告警
  const error = new Error('Database connection failed')

  const alert = await alertIntegration.handleError(error, 'database-service')

  console.log('\n触发的告警:')
  console.log('  类型:', alert.type)
  console.log('  标题:', alert.title)
  console.log('  严重程度:', alert.severity)
  console.log('  来源:', alert.source)
}

// ============================================
// 示例 7: React 错误边界
// ============================================

/*
// React 组件中使用
import React from 'react'
import { diagnose } from './debug'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    diagnose(error).then(report => {
      console.log('诊断报告:', report)
      // 发送到监控服务
      sendToMonitoring(report)
    })
  }

  render() {
    if (this.state.hasError) {
      return <div>出错了: {this.state.error?.message}</div>
    }
    return this.props.children
  }
}
*/

// ============================================
// 示例 8: Express 错误处理中间件
// ============================================

/*
// Express 中使用
import express from 'express'
import { diagnose } from './debug'

const app = express()

app.use(async (err, req, res, next) => {
  const report = await diagnose(err)

  console.error('Error diagnosed:', {
    category: report.classification.category,
    rootCause: report.rootCauseAnalysis.description,
  })

  res.status(500).json({
    error: report.error.message,
    suggestions: report.fixSuggestions.map(s => s.title),
  })
})
*/

// ============================================
// 运行示例
// ============================================

async function runExamples() {
  await basicExample()
  classificationExample()
  stackAnalysisExample()
  await fullDiagnosticExample()
  await logAnalysisExample()
  await alertIntegrationExample()

  console.log('\n=== 所有示例完成 ===')
}

// runExamples() // 取消注释运行示例
