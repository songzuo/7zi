/**
 * @fileoverview 智能调试系统测试
 * @version v1.10.0
 */

import { describe, it, expect } from 'vitest'

import {
  ErrorClassifier,
  errorClassifier,
  StackAnalyzer,
  stackAnalyzer,
  ContextAnalyzer,
  contextAnalyzer,
  RootCauseAnalyzer,
  rootCauseAnalyzer,
  FixSuggester,
  fixSuggester,
  DiagnosticEngine,
  diagnosticEngine,
  diagnose,
  classify,
  analyzeStack,
  type ErrorClassification,
  type StackAnalysis,
  type DiagnosticReport,
} from '../index'

// ============================================
// ErrorClassifier 测试
// ============================================

describe('ErrorClassifier', () => {
  it('should classify null reference errors', () => {
    const error = new Error("Cannot read property 'x' of null")
    const classification = errorClassifier.classify(error)

    expect(classification.category).toBe('runtime')
    expect(classification.subtype).toBe('null-reference')
    expect(classification.severity).toBe('high')
    expect(classification.confidence).toBeGreaterThan(0.5)
  })

  it('should classify undefined reference errors', () => {
    const error = new Error("myVar is not defined")
    const classification = errorClassifier.classify(error)

    expect(classification.category).toBe('runtime')
    expect(classification.subtype).toBe('undefined-reference')
    expect(classification.severity).toBe('high')
  })

  it('should classify type errors', () => {
    const error = new TypeError('obj.method is not a function')
    const classification = errorClassifier.classify(error)

    expect(classification.category).toBe('runtime')
    expect(classification.subtype).toBe('type-error')
    expect(classification.severity).toBe('high')
  })

  it('should classify syntax errors', () => {
    const error = new SyntaxError('Unexpected token }')
    const classification = errorClassifier.classify(error)

    expect(classification.category).toBe('syntax')
    expect(classification.subtype).toBe('unexpected-token')
    expect(classification.severity).toBe('high')
  })

  it('should classify network timeout errors', () => {
    const error = new Error('ETIMEDOUT: Connection timeout')
    const classification = errorClassifier.classify(error)

    expect(classification.category).toBe('network')
    expect(classification.subtype).toBe('timeout')
    expect(classification.severity).toBe('medium')
  })

  it('should classify out of memory errors', () => {
    const error = new Error('JavaScript heap out of memory')
    const classification = errorClassifier.classify(error)

    expect(classification.category).toBe('system')
    expect(classification.subtype).toBe('out-of-memory')
    expect(classification.severity).toBe('critical')
  })

  it('should classify database connection pool errors', () => {
    const error = new Error('Connection pool exhausted')
    const classification = errorClassifier.classify(error)

    expect(classification.category).toBe('database')
    expect(classification.subtype).toBe('connection-pool-exhausted')
    expect(classification.severity).toBe('high')
  })

  it('should classify authentication errors', () => {
    const error = new Error('Unauthorized: Invalid token')
    const classification = errorClassifier.classify(error)

    expect(classification.category).toBe('auth')
    expect(classification.severity).toBe('high')
  })

  it('should classify batch errors', () => {
    const errors = [
      new Error("Cannot read property 'x' of null"),
      new Error('myVar is not defined'),
      new TypeError('obj.method is not a function'),
    ]

    const classifications = errorClassifier.classifyBatch(errors)

    expect(classifications).toHaveLength(3)
    expect(classifications[0].subtype).toBe('null-reference')
    expect(classifications[1].subtype).toBe('undefined-reference')
    expect(classifications[2].subtype).toBe('type-error')
  })

  it('should return unknown classification for unrecognized errors', () => {
    const error = new Error('Some unknown error message')
    const classification = errorClassifier.classify(error)

    expect(classification.category).toBe('unknown')
    expect(classification.subtype).toBe('unknown')
    expect(classification.confidence).toBeLessThan(0.5)
  })
})

// ============================================
// StackAnalyzer 测试
// ============================================

describe('StackAnalyzer', () => {
  it('should parse stack trace', () => {
    const error = new Error('Test error')
    const frames = stackAnalyzer.analyze(error).frames

    expect(Array.isArray(frames)).toBe(true)
    expect(frames.length).toBeGreaterThan(0)
  })

  it('should identify root frame', () => {
    const error = new Error('Test error')
    const analysis = stackAnalyzer.analyze(error)

    expect(analysis.rootFrame).not.toBeNull()
    expect(analysis.rootFrame?.functionName).toBeDefined()
  })

  it('should build error chain', () => {
    const error = new Error('Test error')
    const analysis = stackAnalyzer.analyze(error)

    expect(analysis.errorChain).toBeDefined()
    expect(analysis.errorChain.length).toBeGreaterThan(0)
  })

  it('should find entry point', () => {
    const error = new Error('Test error')
    const analysis = stackAnalyzer.analyze(error)

    expect(analysis.entryPoint).not.toBeNull()
  })

  it('should check recoverability', () => {
    const error = new Error('Test error')
    const analysis = stackAnalyzer.analyze(error)

    expect(typeof analysis.isRecoverable).toBe('boolean')
  })

  it('should generate suggestions', () => {
    const error = new Error("Cannot read property 'x' of null")
    const analysis = stackAnalyzer.analyze(error)

    expect(analysis.suggestions).toBeDefined()
    expect(analysis.suggestions.length).toBeGreaterThan(0)
  })

  it('should handle errors without stack', () => {
    const error = new Error('Test error')
    delete (error as any).stack

    const analysis = stackAnalyzer.analyze(error)

    expect(analysis.frames).toHaveLength(0)
    expect(analysis.rootFrame).toBeNull()
  })
})

// ============================================
// ContextAnalyzer 测试
// ============================================

describe('ContextAnalyzer', () => {
  it('should analyze context', async () => {
    const error = new Error("Cannot read property 'x' of null")
    const analysis = await contextAnalyzer.analyze(error)

    expect(analysis.variables).toBeDefined()
    expect(analysis.relatedCode).toBeDefined()
    expect(analysis.dependencies).toBeDefined()
    expect(analysis.stateSnapshot).toBeDefined()
    expect(analysis.suspiciousPatterns).toBeDefined()
  })

  it('should extract variables', async () => {
    const error = new Error("Cannot read property 'x' of null")
    const analysis = await contextAnalyzer.analyze(error)

    expect(analysis.variables.length).toBeGreaterThan(0)
  })

  it('should analyze dependencies', async () => {
    const error = new Error('Test error')
    const analysis = await contextAnalyzer.analyze(error)

    expect(analysis.dependencies).toBeDefined()
  })

  it('should find suspicious patterns', async () => {
    const error = new Error('Test error')
    const sourceCode = new Map([
      ['test.js', 'obj.forEach(async item => { await process(item) })'],
    ])

    const analysis = await contextAnalyzer.analyze(error, sourceCode)

    expect(analysis.suspiciousPatterns).toBeDefined()
  })
})

// ============================================
// RootCauseAnalyzer 测试
// ============================================

describe('RootCauseAnalyzer', () => {
  it('should analyze root cause', () => {
    const error = new Error("Cannot read property 'x' of null")
    const classification = errorClassifier.classify(error)
    const stackAnalysis = stackAnalyzer.analyze(error)
    const contextAnalysis = {
      variables: [],
      relatedCode: [],
      dependencies: [],
      stateSnapshot: {},
      suspiciousPatterns: [],
    }

    const analysis = rootCauseAnalyzer.analyze(
      error,
      classification,
      stackAnalysis,
      contextAnalysis
    )

    expect(analysis.type).toBeDefined()
    expect(analysis.description).toBeDefined()
    expect(analysis.confidence).toBeGreaterThanOrEqual(0)
    expect(analysis.confidence).toBeLessThanOrEqual(1)
    expect(analysis.evidence).toBeDefined()
    expect(analysis.contributingFactors).toBeDefined()
    expect(analysis.timeline).toBeDefined()
    expect(analysis.affectedComponents).toBeDefined()
    expect(analysis.propagationPath).toBeDefined()
  })

  it('should identify code-defect root cause', () => {
    const error = new Error("Cannot read property 'x' of null")
    const classification = errorClassifier.classify(error)
    const stackAnalysis = stackAnalyzer.analyze(error)
    const contextAnalysis = {
      variables: [],
      relatedCode: [],
      dependencies: [],
      stateSnapshot: {},
      suspiciousPatterns: [],
    }

    const analysis = rootCauseAnalyzer.analyze(
      error,
      classification,
      stackAnalysis,
      contextAnalysis
    )

    expect(analysis.type).toBe('code-defect')
  })

  it('should identify resource-exhaustion root cause', () => {
    const error = new Error('JavaScript heap out of memory')
    const classification = errorClassifier.classify(error)
    const stackAnalysis = stackAnalyzer.analyze(error)
    const contextAnalysis = {
      variables: [],
      relatedCode: [],
      dependencies: [],
      stateSnapshot: {},
      suspiciousPatterns: [],
    }

    const analysis = rootCauseAnalyzer.analyze(
      error,
      classification,
      stackAnalysis,
      contextAnalysis
    )

    expect(analysis.type).toBe('resource-exhaustion')
  })
})

// ============================================
// FixSuggester 测试
// ============================================

describe('FixSuggester', () => {
  it('should generate fix suggestions', () => {
    const error = new Error("Cannot read property 'x' of null")
    const classification = errorClassifier.classify(error)
    const stackAnalysis = stackAnalyzer.analyze(error)
    const contextAnalysis = {
      variables: [],
      relatedCode: [],
      dependencies: [],
      stateSnapshot: {},
      suspiciousPatterns: [],
    }
    const rootCauseAnalysis = rootCauseAnalyzer.analyze(
      error,
      classification,
      stackAnalysis,
      contextAnalysis
    )

    const suggestions = fixSuggester.suggest(
      error,
      classification,
      stackAnalysis,
      contextAnalysis,
      rootCauseAnalysis
    )

    expect(suggestions).toBeDefined()
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions[0].id).toBeDefined()
    expect(suggestions[0].title).toBeDefined()
    expect(suggestions[0].description).toBeDefined()
    expect(suggestions[0].priority).toBeDefined()
    expect(suggestions[0].effort).toBeDefined()
    expect(suggestions[0].steps).toBeDefined()
  })

  it('should prioritize immediate fixes', () => {
    const error = new Error("Cannot read property 'x' of null")
    const classification = errorClassifier.classify(error)
    const stackAnalysis = stackAnalyzer.analyze(error)
    const contextAnalysis = {
      variables: [],
      relatedCode: [],
      dependencies: [],
      stateSnapshot: {},
      suspiciousPatterns: [],
    }
    const rootCauseAnalysis = rootCauseAnalyzer.analyze(
      error,
      classification,
      stackAnalysis,
      contextAnalysis
    )

    const suggestions = fixSuggester.suggest(
      error,
      classification,
      stackAnalysis,
      contextAnalysis,
      rootCauseAnalysis
    )

    const hasImmediate = suggestions.some(s => s.priority === 'immediate')
    expect(hasImmediate).toBe(true)
  })

  it('should limit suggestions', () => {
    const error = new Error('Test error')
    const classification = errorClassifier.classify(error)
    const stackAnalysis = stackAnalyzer.analyze(error)
    const contextAnalysis = {
      variables: [],
      relatedCode: [],
      dependencies: [],
      stateSnapshot: {},
      suspiciousPatterns: [],
    }
    const rootCauseAnalysis = rootCauseAnalyzer.analyze(
      error,
      classification,
      stackAnalysis,
      contextAnalysis
    )

    const suggestions = fixSuggester.suggest(
      error,
      classification,
      stackAnalysis,
      contextAnalysis,
      rootCauseAnalysis
    )

    expect(suggestions.length).toBeLessThanOrEqual(5)
  })
})

// ============================================
// DiagnosticEngine 测试
// ============================================

describe('DiagnosticEngine', () => {
  it('should generate diagnostic report', async () => {
    const error = new Error("Cannot read property 'x' of null")
    const report = await diagnosticEngine.analyze(error)

    expect(report.id).toBeDefined()
    expect(report.timestamp).toBeDefined()
    expect(report.error).toBeDefined()
    expect(report.classification).toBeDefined()
    expect(report.stackAnalysis).toBeDefined()
    expect(report.contextAnalysis).toBeDefined()
    expect(report.rootCauseAnalysis).toBeDefined()
    expect(report.fixSuggestions).toBeDefined()
    expect(report.metadata).toBeDefined()
  })

  it('should analyze error string', async () => {
    const error = "Cannot read property 'x' of null"
    const report = await diagnosticEngine.analyze(error)

    expect(report.error.message).toBe(error)
    expect(report.classification.category).toBe('runtime')
  })

  it('should analyze batch errors', async () => {
    const errors = [
      new Error("Cannot read property 'x' of null"),
      new Error('myVar is not defined'),
    ]

    const reports = await diagnosticEngine.analyzeBatch(errors)

    expect(reports).toHaveLength(2)
    expect(reports[0].classification.subtype).toBe('null-reference')
    expect(reports[1].classification.subtype).toBe('undefined-reference')
  })

  it('should use custom config', async () => {
    const engine = new DiagnosticEngine({ maxFixSuggestions: 10 })
    const error = new Error('Test error')

    const report = await engine.analyze(error)

    expect(report.fixSuggestions.length).toBeLessThanOrEqual(10)
  })

  it('should include analysis duration', async () => {
    const error = new Error('Test error')
    const report = await diagnosticEngine.analyze(error)

    expect(report.metadata.analysisDuration).toBeGreaterThan(0)
  })
})

// ============================================
// 便捷函数测试
// ============================================

describe('Convenience Functions', () => {
  it('diagnose should work', async () => {
    const error = new Error("Cannot read property 'x' of null")
    const report = await diagnose(error)

    expect(report).toBeDefined()
    expect(report.classification.category).toBe('runtime')
  })

  it('classify should work', () => {
    const error = new Error("Cannot read property 'x' of null")
    const classification = classify(error)

    expect(classification.category).toBe('runtime')
    expect(classification.subtype).toBe('null-reference')
  })

  it('analyzeStack should work', () => {
    const error = new Error('Test error')
    const analysis = analyzeStack(error)

    expect(analysis.frames).toBeDefined()
    expect(analysis.rootFrame).not.toBeNull()
  })
})

// ============================================
// 集成测试
// ============================================

describe('Integration Tests', () => {
  it('should handle complete error analysis workflow', async () => {
    const error = new Error("Cannot read property 'user' of null")

    // 1. 分类
    const classification = classify(error)
    expect(classification.category).toBe('runtime')

    // 2. 堆栈分析
    const stackAnalysis = analyzeStack(error)
    expect(stackAnalysis.rootFrame).not.toBeNull()

    // 3. 完整诊断
    const report = await diagnose(error)
    expect(report.id).toBeDefined()
    expect(report.fixSuggestions.length).toBeGreaterThan(0)

    // 4. 验证修复建议
    const hasNullCheck = report.fixSuggestions.some(s =>
      s.title.toLowerCase().includes('null')
    )
    expect(hasNullCheck).toBe(true)
  })

  it('should handle network errors', async () => {
    const error = new Error('ETIMEDOUT: Connection timeout')
    const report = await diagnose(error)

    expect(report.classification.category).toBe('network')
    expect(report.rootCauseAnalysis.type).toBe('integration-issue')
  })

  it('should handle memory errors', async () => {
    const error = new Error('JavaScript heap out of memory')
    const report = await diagnose(error)

    expect(report.classification.category).toBe('system')
    expect(report.classification.severity).toBe('critical')
    expect(report.rootCauseAnalysis.type).toBe('resource-exhaustion')
  })

  it('should handle database errors', async () => {
    const error = new Error('Connection pool exhausted')
    const report = await diagnose(error)

    expect(report.classification.category).toBe('database')
    expect(report.rootCauseAnalysis.type).toBe('resource-exhaustion')
  })
})