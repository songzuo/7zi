/**
 * @fileoverview Bug 检测器
 * @description 识别常见代码错误模式
 */

import type { SupportedLanguage, BugDetection, CodeRange } from './types'

/**
 * 检测器配置
 */
interface DetectorConfig {
  languages: string[]
  enableCache: boolean
  verbose: boolean
}

/**
 * Bug 模式定义
 */
interface BugPattern {
  id: string
  name: string
  type: string
  severity: BugDetection['severity']
  pattern: RegExp
  message: string
  possibleCauses: string[]
  languages: SupportedLanguage[]
}

/**
 * 常见 Bug 模式库
 */
const BUG_PATTERNS: BugPattern[] = [
  // 空引用相关
  {
    id: 'null-reference',
    name: 'Potential null reference',
    type: 'null_reference',
    severity: 'high',
    pattern: /\.(\w+)\s*[;(,\n]/,
    message: 'Potential null or undefined property access',
    possibleCauses: [
      'Variable not initialized before use',
      'Asynchronous data not loaded yet',
      'Property name typo',
    ],
    languages: ['typescript', 'javascript'],
  },
  {
    id: 'undefined-comparison',
    name: 'Undefined comparison',
    type: 'undefined_check',
    severity: 'medium',
    pattern: /\b(undefined|null)\s*==\s*\w+\b/,
    message: 'Comparing with undefined/null using == instead of ===',
    possibleCauses: [
      'Type coercion can lead to unexpected results',
      'null == undefined is true, but might not be intended',
    ],
    languages: ['typescript', 'javascript'],
  },

  // 类型相关
  {
    id: 'type-mismatch',
    name: 'Type mismatch',
    type: 'type_error',
    severity: 'high',
    pattern: /(\w+)\s*\[\s*\d+\s*\]\s*[+\-*/%]=\s*\d+/,
    message: 'Possible type mismatch in array operation',
    possibleCauses: [
      'Array element type is not numeric',
      'Index might be out of bounds',
    ],
    languages: ['typescript', 'javascript'],
  },

  // 数组相关
  {
    id: 'array-out-of-bounds',
    name: 'Array index out of bounds',
    type: 'index_error',
    severity: 'high',
    pattern: /(\w+)\s*\[\s*(\w+)\s*\](?![^;]*\bif\b)/,
    message: 'Array access without bounds check',
    possibleCauses: [
      'Index variable not validated',
      'Array might be shorter than expected',
    ],
    languages: ['typescript', 'javascript', 'python', 'go', 'rust'],
  },
  {
    id: 'array-modify-during-iteration',
    name: 'Array modification during iteration',
    type: 'iteration_error',
    severity: 'high',
    pattern: /for\s*\([^)]+\)\s*\{[^}]*\.\s*(push|pop|shift|unshift|splice)\s*\(/,
    message: 'Modifying array during iteration can cause unexpected behavior',
    possibleCauses: [
      'Index shift during modification',
      'Missing elements or duplicate processing',
    ],
    languages: ['typescript', 'javascript'],
  },

  // 异步相关
  {
    id: 'async-await-missing',
    name: 'Missing await',
    type: 'async_error',
    severity: 'high',
    pattern: /(?:const|let|var)\s+(\w+)\s*=\s*\w+\([^)]*\)(?![^;]*await)/,
    message: 'Possible missing await for async function',
    possibleCauses: [
      'Function returns a Promise',
      'Result is a Promise object, not the actual value',
    ],
    languages: ['typescript', 'javascript'],
  },
  {
    id: 'promise-unhandled',
    name: 'Unhandled Promise',
    type: 'async_error',
    severity: 'medium',
    pattern: /new\s+Promise\s*\([^)]+\)(?![^;]*\.then|[^;]*await)/,
    message: 'Promise created but not handled',
    possibleCauses: [
      'Missing await or .then()',
      'Promise rejection not caught',
    ],
    languages: ['typescript', 'javascript'],
  },
  {
    id: 'callback-hell',
    name: 'Callback hell',
    type: 'code_smell',
    severity: 'low',
    pattern: /(?:\}\s*,\s*){3,}function/,
    message: 'Deeply nested callbacks detected',
    possibleCauses: [
      'Sequential async operations without proper chaining',
      'Should consider using async/await or Promises',
    ],
    languages: ['typescript', 'javascript'],
  },

  // 内存泄漏相关
  {
    id: 'event-listener-leak',
    name: 'Event listener leak',
    type: 'memory_leak',
    severity: 'medium',
    pattern: /addEventListener\s*\([^)]+\)(?![^}]*removeEventListener)/,
    message: 'Event listener added without removal',
    possibleCauses: [
      'Missing removeEventListener',
      'Component unmount without cleanup',
    ],
    languages: ['typescript', 'javascript'],
  },
  {
    id: 'interval-leak',
    name: 'Interval leak',
    type: 'memory_leak',
    severity: 'medium',
    pattern: /setInterval\s*\([^)]+\)(?![^}]*clearInterval)/,
    message: 'setInterval without clearInterval',
    possibleCauses: [
      'Interval continues running after component unmount',
      'Missing cleanup in useEffect or componentWillUnmount',
    ],
    languages: ['typescript', 'javascript'],
  },

  // 逻辑错误
  {
    id: 'infinite-loop',
    name: 'Potential infinite loop',
    type: 'logic_error',
    severity: 'critical',
    pattern: /while\s*\(\s*(?:true|1)\s*\)/,
    message: 'Potential infinite loop detected',
    possibleCauses: [
      'Missing break condition',
      'Condition never becomes false',
    ],
    languages: ['typescript', 'javascript', 'python', 'go', 'rust'],
  },
  {
    id: 'assignment-in-condition',
    name: 'Assignment in condition',
    type: 'logic_error',
    severity: 'high',
    pattern: /if\s*\(\s*(\w+)\s*=\s*[^=]/,
    message: 'Assignment in condition, probably meant comparison',
    possibleCauses: [
      'Typo: = instead of == or ===',
      'Intentional assignment but confusing',
    ],
    languages: ['typescript', 'javascript', 'python'],
  },
  {
    id: 'identical-branches',
    name: 'Identical branches',
    type: 'logic_error',
    severity: 'medium',
    pattern: /if\s*\([^)]+\)\s*\{([^}]+)\}\s*else\s*\{(\1)\}/,
    message: 'If-else branches are identical',
    possibleCauses: [
      'Copy-paste error',
      'Missing else branch logic',
    ],
    languages: ['typescript', 'javascript', 'python', 'go', 'rust'],
  },

  // 并发问题
  {
    id: 'race-condition',
    name: 'Potential race condition',
    type: 'concurrency',
    severity: 'high',
    pattern: /(?:let|var)\s+\w+\s*=\s*\d+\s*;[^;]*(?:\+\+|--|\+=|-=)[^;]*(?:async|Promise)/,
    message: 'Shared variable modified in async context',
    possibleCauses: [
      'Multiple async operations accessing same variable',
      'Missing synchronization',
    ],
    languages: ['typescript', 'javascript'],
  },

  // Python 特定
  {
    id: 'python-mutable-default',
    name: 'Mutable default argument',
    type: 'logic_error',
    severity: 'high',
    pattern: /def\s+\w+\s*\([^)]*=\s*(?:\[|\{)/,
    message: 'Mutable default argument can cause unexpected behavior',
    possibleCauses: [
      'Default is shared across all calls',
      'Should use None and create inside function',
    ],
    languages: ['python'],
  },
  {
    id: 'python-late-binding',
    name: 'Late binding closure',
    type: 'logic_error',
    severity: 'high',
    pattern: /for\s+\w+\s+in\s+[^:]+:[^}]*lambda[^:]*\w+(?!_)/,
    message: 'Closure captures variable by reference',
    possibleCauses: [
      'Lambda uses loop variable',
      'All lambdas will see last value',
    ],
    languages: ['python'],
  },

  // Go 特定
  {
    id: 'go-goroutine-loop',
    name: 'Goroutine in loop',
    type: 'concurrency',
    severity: 'high',
    pattern: /for\s+[^{]+\{[^}]*go\s+func/,
    message: 'Goroutine captures loop variable',
    possibleCauses: [
      'All goroutines may see same variable value',
      'Pass variable as parameter to goroutine',
    ],
    languages: ['go'],
  },
  {
    id: 'go-defer-loop',
    name: 'Defer in loop',
    type: 'resource_leak',
    severity: 'medium',
    pattern: /for\s+[^{]+\{[^}]*defer\b/,
    message: 'Defer in loop delays resource cleanup',
    possibleCauses: [
      'Resources not released until function returns',
      'Move defer outside loop or use immediate cleanup',
    ],
    languages: ['go'],
  },

  // Rust 特定
  {
    id: 'rust-double-free',
    name: 'Potential double free',
    type: 'memory_error',
    severity: 'critical',
    pattern: /drop\s*\(\s*(\w+)\s*\)[^;]*;[^;]*drop\s*\(\s*\1\s*\)/,
    message: 'Same variable dropped twice',
    possibleCauses: [
      'Variable already moved or dropped',
      'Use after free potential',
    ],
    languages: ['rust'],
  },
  {
    id: 'rust-lifetime-dangle',
    name: 'Potential dangling reference',
    type: 'memory_error',
    severity: 'critical',
    pattern: /&\s*(?:mut\s+)?(\w+)\s+\w+\s*=\s*[^;]+(?![^}]*\})/,
    message: 'Reference may outlive its referent',
    possibleCauses: [
      'Reference to local variable returned',
      'Lifetime annotation may be incorrect',
    ],
    languages: ['rust'],
  },
]

/**
 * Bug 检测器
 */
export class BugDetector {
  private config: DetectorConfig
  private cache: Map<string, BugDetection[]> = new Map()

  constructor(config: Partial<DetectorConfig> = {}) {
    this.config = {
      languages: ['typescript', 'javascript', 'python', 'go', 'rust'],
      enableCache: true,
      verbose: false,
      ...config,
    }
  }

  /**
   * 检测 Bug
   */
  async detect(code: string, language: SupportedLanguage): Promise<BugDetection[]> {
    // 检查缓存
    if (this.config.enableCache) {
      const cacheKey = `${language}:${this.hashCode(code)}`
      const cached = this.cache.get(cacheKey)
      if (cached) {
        return cached
      }
    }

    const result = await this.doDetect(code, language)

    // 存储缓存
    if (this.config.enableCache) {
      const cacheKey = `${language}:${this.hashCode(code)}`
      this.cache.set(cacheKey, result)
    }

    return result
  }

  /**
   * 执行检测
   */
  private async doDetect(code: string, language: SupportedLanguage): Promise<BugDetection[]> {
    const detections: BugDetection[] = []

    // 应用所有模式
    for (const pattern of BUG_PATTERNS) {
      if (!pattern.languages.includes(language)) continue

      const matches = this.findMatches(code, pattern.pattern)
      for (const match of matches) {
        const location = this.getLocationFromMatch(code, match)

        detections.push({
          type: pattern.type,
          severity: pattern.severity,
          message: pattern.message,
          location,
          possibleCauses: pattern.possibleCauses,
          detectionMethod: 'pattern',
        })
      }
    }

    // 执行静态分析
    const staticDetections = this.performStaticAnalysis(code, language)
    detections.push(...staticDetections)

    // 排序：按严重程度
    return detections.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    })
  }

  /**
   * 静态分析
   */
  private performStaticAnalysis(code: string, language: SupportedLanguage): BugDetection[] {
    const detections: BugDetection[] = []

    // 检测未处理的异常
    const unhandledExceptions = this.detectUnhandledExceptions(code, language)
    detections.push(...unhandledExceptions)

    // 检测资源泄漏
    const resourceLeaks = this.detectResourceLeaks(code, language)
    detections.push(...resourceLeaks)

    // 检测类型不匹配
    const typeMismatches = this.detectTypeMismatches(code, language)
    detections.push(...typeMismatches)

    return detections
  }

  /**
   * 检测未处理的异常
   */
  private detectUnhandledExceptions(code: string, language: SupportedLanguage): BugDetection[] {
    const detections: BugDetection[] = []

    // 检测 try-catch 缺失的情况
    // 简化版本：检测可能抛出异常的函数调用
    const dangerousFunctions = ['JSON.parse', 'parseInt', 'parseFloat', 'fetch']
    
    for (const func of dangerousFunctions) {
      const regex = new RegExp(`${func.replace('.', '\\.')}\\s*\\([^)]+\\)(?![^}]*catch)`, 'g')
      const matches = code.matchAll(regex)
      
      for (const match of matches) {
        const location = this.getLocationFromMatch(code, match as RegExpExecArray)
        detections.push({
          type: 'unhandled_exception',
          severity: 'medium',
          message: `Potential unhandled exception from ${func}`,
          location,
          possibleCauses: [
            'Function can throw or reject',
            'Missing try-catch or error handling',
          ],
          detectionMethod: 'static',
        })
      }
    }

    return detections
  }

  /**
   * 检测资源泄漏
   */
  private detectResourceLeaks(code: string, language: SupportedLanguage): BugDetection[] {
    const detections: BugDetection[] = []

    // 检测未关闭的资源
    const resourcePatterns = [
      { open: 'open', close: 'close', resource: 'file' },
      { open: 'connect', close: 'disconnect', resource: 'connection' },
      { open: 'subscribe', close: 'unsubscribe', resource: 'subscription' },
    ]

    for (const { open, close, resource } of resourcePatterns) {
      const openRegex = new RegExp(`\\.${open}\\s*\\(`, 'g')
      const closeRegex = new RegExp(`\\.${close}\\s*\\(`, 'g')
      
      const openCount = (code.match(openRegex) || []).length
      const closeCount = (code.match(closeRegex) || []).length
      
      if (openCount > closeCount) {
        detections.push({
          type: 'resource_leak',
          severity: 'medium',
          message: `Potential ${resource} leak: ${openCount} opened, ${closeCount} closed`,
          location: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } },
          possibleCauses: [
            `Missing ${close}() call`,
            'Resource not closed in all code paths',
          ],
          detectionMethod: 'static',
        })
      }
    }

    return detections
  }

  /**
   * 检测类型不匹配
   */
  private detectTypeMismatches(code: string, language: SupportedLanguage): BugDetection[] {
    const detections: BugDetection[] = []

    // 检测字符串与数字比较
    const comparisonRegex = /(\d+)\s*(===|==)\s*['"](\w+)['"]/g
    const matches = code.matchAll(comparisonRegex)
    
    for (const match of matches) {
      const location = this.getLocationFromMatch(code, match as RegExpExecArray)
      detections.push({
        type: 'type_mismatch',
        severity: 'medium',
        message: 'Comparing number with string',
        location,
        possibleCauses: [
          'Type coercion may give unexpected results',
          'Consider converting types first',
        ],
        detectionMethod: 'static',
      })
    }

    return detections
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
export const bugDetector = new BugDetector()