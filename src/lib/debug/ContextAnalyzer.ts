/**
 * @fileoverview 上下文分析器
 * 分析错误发生时的代码上下文、变量状态和依赖关系
 * @version v1.10.0
 */

import type {
  ContextAnalysis,
  ContextVariable,
  CodeReference,
  Dependency,
  SuspiciousPattern,
} from './types'

import { stackAnalyzer, parseStackTrace } from './StackAnalyzer'

// ============================================
// 可疑模式
// ============================================

interface SuspiciousPatternRule {
  pattern: RegExp
  name: string
  risk: 'low' | 'medium' | 'high'
  description: string
  suggestion: string
}

const SUSPICIOUS_PATTERNS: SuspiciousPatternRule[] = [
  // 空值相关
  {
    pattern: /\w+\s*==?\s*null\s*\|\|\s*\w+\s*==?\s*undefined/,
    name: 'loose-null-check',
    risk: 'medium',
    description: '使用 == 比较 null/undefined',
    suggestion: '使用严格相等 === 或可选链',
  },
  {
    pattern: /if\s*\(\s*!\s*\w+\s*\)/,
    name: 'implicit-boolean',
    risk: 'low',
    description: '隐式布尔转换检查',
    suggestion: '明确检查值的类型和存在性',
  },

  // 异步相关
  {
    pattern: /\.then\s*\(\s*(?:res|f)?\s*=>/,
    name: 'unhandled-promise',
    risk: 'high',
    description: '未处理的 Promise',
    suggestion: '添加 .catch() 处理错误',
  },
  {
    pattern: /async\s+(?:function|\(|\{)/,
    name: 'async-without-await',
    risk: 'medium',
    description: 'async 函数中没有 await',
    suggestion: '确保异步操作正确等待',
  },

  // 性能相关
  {
    pattern: /\.forEach\s*\(/,
    name: 'forEach-with-async',
    risk: 'medium',
    description: '在 forEach 中使用 async/await',
    suggestion: '使用 for...of 循环代替',
  },
  {
    pattern: /setTimeout.*\n.*setTimeout/,
    name: 'nested-timeout',
    risk: 'medium',
    description: '嵌套 setTimeout',
    suggestion: '使用 setInterval 或 requestAnimationFrame',
  },

  // 闭包相关
  {
    pattern: /for\s*\(.*let\s+\w+\s*\).*\}\s*setTimeout/,
    name: 'loop-closure',
    risk: 'high',
    description: '循环中的闭包捕获错误的变量值',
    suggestion: '使用 IIFE 或 let 块级作用域',
  },

  // 内存相关
  {
    pattern: /addEventListener.*\n.*\)\s*[;{]/,
    name: 'missing-remove-listener',
    risk: 'medium',
    description: '添加事件监听但未移除',
    suggestion: '在组件卸载时移除事件监听',
  },
  {
    pattern: /setInterval/,
    name: 'unclear-interval',
    risk: 'medium',
    description: 'setInterval 可能未清理',
    suggestion: '在适当时机调用 clearInterval',
  },
]

// ============================================
// 关键字
// ============================================

const NODE_KEYWORDS = new Set([
  'require',
  'module',
  'exports',
  '__dirname',
  '__filename',
  'process',
  'console',
  'setTimeout',
  'setInterval',
  'Buffer',
  'global',
])

const BROWSER_GLOBALS = new Set([
  'window',
  'document',
  'location',
  'navigator',
  'history',
  'localStorage',
  'sessionStorage',
  'fetch',
  'XMLHttpRequest',
])

// ============================================
// 上下文分析器
// ============================================

/**
 * 上下文分析器
 */
export class ContextAnalyzer {
  /**
   * 分析代码上下文
   */
  async analyze(
    error: Error,
    sourceCode?: Map<string, string>
  ): Promise<ContextAnalysis> {
    const stack = parseStackTrace(error)
    const rootFrame = stack[0]

    // 提取变量
    const variables = this.extractVariables(error, rootFrame)

    // 查找相关代码
    const relatedCode = await this.findRelatedCode(error, sourceCode, rootFrame)

    // 分析依赖
    const dependencies = this.analyzeDependencies(error, relatedCode)

    // 状态快照
    const stateSnapshot = this.captureState(error, rootFrame)

    // 查找可疑模式
    const suspiciousPatterns = this.findSuspiciousPatterns(error, relatedCode)

    return {
      variables,
      relatedCode,
      dependencies,
      stateSnapshot,
      suspiciousPatterns,
    }
  }

  /**
   * 提取相关变量信息
   */
  private extractVariables(error: Error, rootFrame: any): ContextVariable[] {
    const variables: ContextVariable[] = []

    // 从错误消息中提取变量名
    const message = error.message
    const variableMatches = message.matchAll(/(\w+)/g)

    for (const match of variableMatches) {
      const name = match[1]
      if (name.length < 2 || name.length > 50) continue

      const isKeyword = NODE_KEYWORDS.has(name) || BROWSER_GLOBALS.has(name)

      variables.push({
        name,
        type: this.inferType(message, name),
        value: this.extractValue(message, name),
        isDefined: !message.includes(`'${name}' is not defined`),
        scope: isKeyword ? 'global' : 'local',
      })
    }

    return variables.slice(0, 10) // 限制数量
  }

  /**
   * 推断变量类型
   */
  private inferType(message: string, varName: string): string {
    const lower = message.toLowerCase()

    if (lower.includes(`${varName}.${varName}`)) return 'object'
    if (lower.includes(`${varName}[]`) || lower.includes(`${varName}.map`))
      return 'array'
    if (lower.includes(`typeof ${varName}`)) return 'type check needed'
    if (lower.includes(`is not a function`)) return 'unknown'
    if (lower.includes('null')) return 'null | undefined'

    return 'unknown'
  }

  /**
   * 提取变量值
   */
  private extractValue(message: string, varName: string): string {
    // 尝试提取引号中的值
    const patterns = [
      new RegExp(`${varName}\\s*[=:]([^,\\n]+)`),
      new RegExp(`'${varName}'\\s*[=:]([^']+)`),
    ]

    for (const pattern of patterns) {
      const match = message.match(pattern)
      if (match) {
        return match[1].trim().slice(0, 100)
      }
    }

    return '<unknown>'
  }

  /**
   * 查找相关代码
   */
  private async findRelatedCode(
    error: Error,
    sourceCode: Map<string, string> | undefined,
    rootFrame: any
  ): Promise<CodeReference[]> {
    const references: CodeReference[] = []

    if (!rootFrame) return references

    const fileName = rootFrame.fileName
    const lineNumber = rootFrame.lineNumber

    // 如果有源文件内容
    if (sourceCode && sourceCode.has(fileName)) {
      const content = sourceCode.get(fileName)!
      const lines = content.split('\n')

      // 获取周围代码
      const startLine = Math.max(0, lineNumber - 10)
      const endLine = Math.min(lines.length, lineNumber + 10)

      for (let i = startLine; i < endLine; i++) {
        references.push({
          filePath: fileName,
          startLine: i + 1,
          endLine: i + 1,
          content: lines[i],
          relevance: Math.max(0, 1 - Math.abs(i + 1 - lineNumber) / 10),
          reason: i + 1 === lineNumber ? 'error line' : 'nearby line',
        })
      }
    }

    return references.slice(0, 20) // 限制数量
  }

  /**
   * 分析依赖
   */
  private analyzeDependencies(
    error: Error,
    relatedCode: CodeReference[]
  ): Dependency[] {
    const dependencies: Map<string, Dependency> = new Map()

    // 从代码中提取依赖
    for (const ref of relatedCode) {
      // require('...')
      const requireMatches = ref.content.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g)
      if (requireMatches) {
        for (const match of requireMatches) {
          const depMatch = match.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/)
          if (depMatch) {
            const name = depMatch[1]
            dependencies.set(name, {
              name,
              type: 'require',
              isUsed: true,
            })
          }
        }
      }

      // import ... from '...'
      const importMatches = ref.content.match(
        /import\s+(?:.*\s+from\s+)?['"]([^'"]+)['"]/g
      )
      if (importMatches) {
        for (const match of importMatches) {
          const depMatch = match.match(/import\s+(?:.*\s+from\s+)?['"]([^'"]+)['"]/)
          if (depMatch) {
            const name = depMatch[1]
            dependencies.set(name, {
              name,
              type: 'import',
              isUsed: true,
            })
          }
        }
      }
    }

    // 检查全局依赖
    if (typeof window !== 'undefined') {
      dependencies.set('window', {
        name: 'window',
        type: 'global',
        isUsed: true,
      })
    }

    if (typeof document !== 'undefined') {
      dependencies.set('document', {
        name: 'document',
        type: 'global',
        isUsed: true,
      })
    }

    return Array.from(dependencies.values())
  }

  /**
   * 捕获状态
   */
  private captureState(error: Error, rootFrame: any): Record<string, unknown> {
    const snapshot: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      errorMessage: error.message,
      errorName: error.name,
    }

    if (rootFrame) {
      snapshot.errorLocation = {
        file: rootFrame.fileName,
        line: rootFrame.lineNumber,
        column: rootFrame.columnNumber,
        function: rootFrame.functionName,
      }
    }

    // 添加环境信息
    snapshot.environment = {
      userAgent:
        typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      platform: typeof process !== 'undefined' ? process.platform : undefined,
      nodeVersion:
        typeof process !== 'undefined' ? process.version : undefined,
    }

    return snapshot
  }

  /**
   * 查找可疑模式
   */
  private findSuspiciousPatterns(
    error: Error,
    relatedCode: CodeReference[]
  ): SuspiciousPattern[] {
    const patterns: SuspiciousPattern[] = []

    for (const ref of relatedCode) {
      for (const rule of SUSPICIOUS_PATTERNS) {
        if (rule.pattern.test(ref.content)) {
          patterns.push({
            pattern: rule.name,
            location: `${ref.filePath}:${ref.startLine}`,
            description: rule.description,
            risk: rule.risk,
            suggestion: rule.suggestion,
          })
        }
      }
    }

    // 按风险排序
    return patterns.sort((a, b) => {
      const riskOrder = { high: 0, medium: 1, low: 2 }
      return riskOrder[a.risk] - riskOrder[b.risk]
    })
  }
}

// ============================================
// 导出
// ============================================

export const contextAnalyzer = new ContextAnalyzer()

export default {
  ContextAnalyzer,
  contextAnalyzer,
}