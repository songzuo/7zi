/**
 * @fileoverview 代码审查器
 * @description 自动审查代码质量问题
 */

import type { SupportedLanguage, CodeReviewResult, CodeReviewIssue, CodeRange, CodeAnalysis } from './types'
import { CodeAnalyzer } from './code-analyzer'

/**
 * 审查器配置
 */
interface ReviewerConfig {
  languages: string[]
  enableCache: boolean
  verbose: boolean
}

/**
 * 代码分析结果（用于审查器）
 */
interface CodeAnalysisResult extends CodeAnalysis {
  complexity: {
    cyclomatic: number
    cognitive: number
    maintainability: number
  }
}

/**
 * 审查规则
 */
interface ReviewRule {
  id: string
  name: string
  type: CodeReviewIssue['type']
  severity: CodeReviewIssue['severity']
  pattern: RegExp
  message: string
  suggestion?: string
  languages: SupportedLanguage[]
}

/**
 * 代码审查规则库
 */
const REVIEW_RULES: ReviewRule[] = [
  // 安全问题
  {
    id: 'security-eval',
    name: 'Avoid eval()',
    type: 'error',
    severity: 'critical',
    pattern: /\beval\s*\(/,
    message: 'Avoid using eval() as it can execute arbitrary code',
    suggestion: 'Use safer alternatives like JSON.parse() or object property access',
    languages: ['typescript', 'javascript'],
  },
  {
    id: 'security-innerhtml',
    name: 'Avoid innerHTML with user input',
    type: 'error',
    severity: 'critical',
    pattern: /\.innerHTML\s*=\s*[^;]+/,
    message: 'Setting innerHTML with user input can lead to XSS attacks',
    suggestion: 'Use textContent or sanitize the input first',
    languages: ['typescript', 'javascript'],
  },
  {
    id: 'security-hardcoded-secret',
    name: 'Hardcoded secrets',
    type: 'error',
    severity: 'critical',
    pattern: /(password|secret|api[_-]?key|token)\s*[:=]\s*['"][^'"]{10,}['"]/i,
    message: 'Hardcoded secrets detected',
    suggestion: 'Use environment variables or a secrets manager',
    languages: ['typescript', 'javascript', 'python', 'go', 'rust'],
  },

  // 性能问题
  {
    id: 'performance-loop-dom',
    name: 'DOM manipulation in loop',
    type: 'warning',
    severity: 'high',
    pattern: /for\s*\([^)]+\)\s*\{[^}]*\.(appendChild|insertBefore|innerHTML)/,
    message: 'DOM manipulation inside loops can cause performance issues',
    suggestion: 'Use document fragments or batch DOM updates',
    languages: ['typescript', 'javascript'],
  },
  {
    id: 'performance-sync-xhr',
    name: 'Synchronous XMLHttpRequest',
    type: 'warning',
    severity: 'high',
    pattern: /XMLHttpRequest\s*\([^)]*\)\s*\.open\s*\([^,]+,\s*false/,
    message: 'Synchronous XHR blocks the main thread',
    suggestion: 'Use async/await or promises',
    languages: ['typescript', 'javascript'],
  },
  {
    id: 'performance-console-log',
    name: 'Console.log in production',
    type: 'info',
    severity: 'low',
    pattern: /console\.(log|debug|info|warn)\s*\(/,
    message: 'Console statements should be removed in production',
    suggestion: 'Use a proper logging library',
    languages: ['typescript', 'javascript', 'python'],
  },

  // 代码质量
  {
    id: 'quality-var-shadowing',
    name: 'Variable shadowing',
    type: 'warning',
    severity: 'medium',
    pattern: /(?:const|let|var)\s+(\w+)\s*=[^;]+;\s*(?:const|let|var)\s+\1\s*=/,
    message: 'Variable declaration shadows an existing variable',
    suggestion: 'Rename one of the variables',
    languages: ['typescript', 'javascript'],
  },
  {
    id: 'quality-empty-catch',
    name: 'Empty catch block',
    type: 'warning',
    severity: 'medium',
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/,
    message: 'Empty catch block suppresses errors',
    suggestion: 'Add error handling or logging',
    languages: ['typescript', 'javascript', 'python', 'go', 'rust'],
  },
  {
    id: 'quality-magic-number',
    name: 'Magic number',
    type: 'info',
    severity: 'low',
    pattern: /\b(?!0|1|2|10|100|1000)\d{2,}\b/,
    message: 'Magic number detected',
    suggestion: 'Extract to a named constant',
    languages: ['typescript', 'javascript', 'python', 'go', 'rust'],
  },
  {
    id: 'quality-unused-var',
    name: 'Unused variable',
    type: 'info',
    severity: 'low',
    pattern: /(?:const|let|var)\s+(\w+)\s*=[^;]+;(?![^;]*\b\1\b)/,
    message: 'Variable may be unused',
    suggestion: 'Remove the variable or use it',
    languages: ['typescript', 'javascript'],
  },

  // 最佳实践
  {
    id: 'best-practice-any-type',
    name: 'Avoid any type',
    type: 'warning',
    severity: 'medium',
    pattern: /:\s*any\b/,
    message: 'Using any type defeats the purpose of TypeScript',
    suggestion: 'Use specific types or unknown',
    languages: ['typescript'],
  },
  {
    id: 'best-practice-equals',
    name: 'Use === instead of ==',
    type: 'warning',
    severity: 'medium',
    pattern: /[^=!]==(?!=)/,
    message: 'Use strict equality (===) instead of loose equality (==)',
    suggestion: 'Use === for type-safe comparison',
    languages: ['typescript', 'javascript'],
  },
  {
    id: 'best-practice-no-var',
    name: 'Avoid var',
    type: 'info',
    severity: 'low',
    pattern: /\bvar\s+/,
    message: 'Avoid using var, use const or let instead',
    suggestion: 'Use const for constants, let for variables',
    languages: ['typescript', 'javascript'],
  },

  // Python 特定规则
  {
    id: 'python-bare-except',
    name: 'Bare except',
    type: 'warning',
    severity: 'high',
    pattern: /except\s*:/,
    message: 'Bare except catches all exceptions including system exits',
    suggestion: 'Specify the exception type',
    languages: ['python'],
  },
  {
    id: 'python-global-variable',
    name: 'Global variable',
    type: 'warning',
    severity: 'medium',
    pattern: /^global\s+\w+/m,
    message: 'Global variables should be avoided',
    suggestion: 'Use function parameters or class attributes',
    languages: ['python'],
  },

  // Go 特定规则
  {
    id: 'go-error-check',
    name: 'Unchecked error',
    type: 'warning',
    severity: 'high',
    pattern: /\w+\s*:=\s*[^;]+;(?!\s*if\s+err\s*!=\s*nil)/,
    message: 'Error value is not checked',
    suggestion: 'Always check error values',
    languages: ['go'],
  },

  // Rust 特定规则
  {
    id: 'rust-unwrap',
    name: 'Unwrap without error handling',
    type: 'warning',
    severity: 'high',
    pattern: /\.unwrap\(\)/,
    message: 'unwrap() will panic on error',
    suggestion: 'Use proper error handling with ? or match',
    languages: ['rust'],
  },
  {
    id: 'rust-panic',
    name: 'Panic in production code',
    type: 'warning',
    severity: 'high',
    pattern: /\bpanic!\(/,
    message: 'Panics should be avoided in production code',
    suggestion: 'Use Result or Option for error handling',
    languages: ['rust'],
  },
]

/**
 * 代码审查器
 */
export class CodeReviewer {
  private config: ReviewerConfig
  private analyzer: CodeAnalyzer
  private cache: Map<string, CodeReviewResult> = new Map()

  constructor(config: Partial<ReviewerConfig> = {}) {
    this.config = {
      languages: ['typescript', 'javascript', 'python', 'go', 'rust'],
      enableCache: true,
      verbose: false,
      ...config,
    }
    this.analyzer = new CodeAnalyzer()
  }

  /**
   * 审查代码
   */
  async review(code: string, language: SupportedLanguage): Promise<CodeReviewResult> {
    // 检查缓存
    if (this.config.enableCache) {
      const cacheKey = `${language}:${this.hashCode(code)}`
      const cached = this.cache.get(cacheKey)
      if (cached) {
        return cached
      }
    }

    const result = await this.doReview(code, language)

    // 存储缓存
    if (this.config.enableCache) {
      const cacheKey = `${language}:${this.hashCode(code)}`
      this.cache.set(cacheKey, result)
    }

    return result
  }

  /**
   * 执行审查
   */
  private async doReview(code: string, language: SupportedLanguage): Promise<CodeReviewResult> {
    const issues: CodeReviewIssue[] = []

    // 应用所有规则
    for (const rule of REVIEW_RULES) {
      if (!rule.languages.includes(language)) continue

      const matches = this.findMatches(code, rule.pattern)
      for (const match of matches) {
        const location = this.getLocationFromMatch(code, match)
        
        issues.push({
          type: rule.type,
          severity: rule.severity,
          message: rule.message,
          location,
          ruleId: rule.id,
          suggestion: rule.suggestion,
        })
      }
    }

    // 分析代码复杂度
    const analysis = await this.analyzer.analyze(code, language)

    // 添加复杂度相关的问题
    if (analysis.complexity.cyclomatic > 15) {
      issues.push({
        type: 'warning',
        severity: 'high',
        message: `High cyclomatic complexity (${analysis.complexity.cyclomatic})`,
        location: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } },
        ruleId: 'complexity-cyclomatic',
        suggestion: 'Consider breaking down the function into smaller functions',
      })
    }

    if (analysis.complexity.cognitive > 15) {
      issues.push({
        type: 'warning',
        severity: 'medium',
        message: `High cognitive complexity (${analysis.complexity.cognitive})`,
        location: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } },
        ruleId: 'complexity-cognitive',
        suggestion: 'Reduce nesting and simplify control flow',
      })
    }

    if (analysis.complexity.maintainability < 40) {
      issues.push({
        type: 'warning',
        severity: 'high',
        message: `Low maintainability index (${analysis.complexity.maintainability})`,
        location: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } },
        ruleId: 'complexity-maintainability',
        suggestion: 'Improve code structure and reduce complexity',
      })
    }

    // 计算评分
    const score = this.calculateScore(issues, analysis)

    // 统计
    const stats = this.calculateStats(issues)

    return {
      issues,
      score,
      stats,
    }
  }

  /**
   * 查找匹配
   */
  private findMatches(code: string, pattern: RegExp): RegExpExecArray[] {
    const matches: RegExpExecArray[] = []
    const regex = new RegExp(pattern.source, pattern.flags + 'g')
    let match

    while ((match = regex.exec(code)) !== null) {
      matches.push(match)
    }

    return matches
  }

  /**
   * 从匹配获取位置
   */
  private getLocationFromMatch(code: string, match: RegExpExecArray): CodeRange {
    const startOffset = match.index
    const endOffset = match.index + match[0].length

    const start = this.getPositionFromOffset(code, startOffset)
    const end = this.getPositionFromOffset(code, endOffset)

    return { start, end }
  }

  /**
   * 从偏移获取位置
   */
  private getPositionFromOffset(code: string, offset: number): { line: number; column: number } {
    const lines = code.substring(0, offset).split('\n')
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1,
    }
  }

  /**
   * 计算评分
   */
  private calculateScore(issues: CodeReviewIssue[], analysis: CodeAnalysisResult): CodeReviewResult['score'] {
    // 基础分
    let overall = 100
    let readability = 100
    let maintainability = 100
    let security = 100
    let performance = 100

    // 根据问题扣分
    for (const issue of issues) {
      const penalty = this.getSeverityPenalty(issue.severity)

      switch (issue.type) {
        case 'error':
          overall -= penalty * 2
          break
        case 'warning':
          overall -= penalty
          break
        case 'info':
          overall -= penalty * 0.5
          break
      }

      // 根据规则类型调整
      if (issue.ruleId?.startsWith('security')) {
        security -= penalty * 2
      } else if (issue.ruleId?.startsWith('performance')) {
        performance -= penalty
      } else if (issue.ruleId?.startsWith('quality')) {
        readability -= penalty
      } else if (issue.ruleId?.startsWith('complexity')) {
        maintainability -= penalty
      }
    }

    // 根据复杂度调整
    maintainability = Math.min(maintainability, analysis.complexity.maintainability)

    return {
      overall: Math.max(0, Math.round(overall)),
      readability: Math.max(0, Math.round(readability)),
      maintainability: Math.max(0, Math.round(maintainability)),
      security: Math.max(0, Math.round(security)),
      performance: Math.max(0, Math.round(performance)),
    }
  }

  /**
   * 获取严重程度惩罚
   */
  private getSeverityPenalty(severity: CodeReviewIssue['severity']): number {
    switch (severity) {
      case 'critical':
        return 20
      case 'high':
        return 10
      case 'medium':
        return 5
      case 'low':
        return 2
    }
  }

  /**
   * 计算统计
   */
  private calculateStats(issues: CodeReviewIssue[]): CodeReviewResult['stats'] {
    return {
      total: issues.length,
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length,
    }
  }

  /**
   * 计算代码哈希
   */
  private hashCode(code: string): string {
    let hash = 0
    for (let i = 0; i < code.length; i++) {
      const char = code.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return hash.toString(16)
  }
}

// 默认实例
export const codeReviewer = new CodeReviewer()