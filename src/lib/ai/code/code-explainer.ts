/**
 * @fileoverview 代码解释器
 * @description 用自然语言解释代码逻辑
 */

import type { SupportedLanguage, CodeExplanation, CodeRange, CodeAnalysis } from './types'
import { CodeAnalyzer } from './code-analyzer'

/**
 * 解释器配置
 */
interface ExplainerConfig {
  languages: string[]
  enableCache: boolean
  verbose: boolean
}

/**
 * 代码分析结果（用于解释器）
 */
interface CodeAnalysisResult extends CodeAnalysis {
  complexity: {
    cyclomatic: number
    cognitive: number
    maintainability: number
  }
  stats: {
    linesOfCode: number
    blankLines: number
    commentLines: number
    functions: number
    classes: number
  }
  imports: string[]
  dependencies: string[]
}

/**
 * 代码解释器
 */
export class CodeExplainer {
  private config: ExplainerConfig
  private analyzer: CodeAnalyzer
  private cache: Map<string, CodeExplanation> = new Map()

  constructor(config: Partial<ExplainerConfig> = {}) {
    this.config = {
      languages: ['typescript', 'javascript', 'python', 'go', 'rust'],
      enableCache: true,
      verbose: false,
      ...config,
    }
    this.analyzer = new CodeAnalyzer()
  }

  /**
   * 解释代码
   */
  async explain(code: string, language: SupportedLanguage): Promise<CodeExplanation> {
    // 检查缓存
    if (this.config.enableCache) {
      const cacheKey = `${language}:${this.hashCode(code)}`
      const cached = this.cache.get(cacheKey)
      if (cached) {
        return cached
      }
    }

    const result = await this.doExplain(code, language)

    // 存储缓存
    if (this.config.enableCache) {
      const cacheKey = `${language}:${this.hashCode(code)}`
      this.cache.set(cacheKey, result)
    }

    return result
  }

  /**
   * 执行解释
   */
  private async doExplain(code: string, language: SupportedLanguage): Promise<CodeExplanation> {
    // 分析代码结构
    const analysis = await this.analyzer.analyze(code, language)

    // 提取关键概念
    const concepts = this.extractConcepts(code, language)

    // 生成摘要
    const summary = this.generateSummary(code, language, analysis)

    // 生成详细解释
    const details = this.generateDetails(code, language, analysis)

    // 解释代码片段
    const snippetExplanations = this.explainSnippets(code, language)

    // 分析复杂度
    const complexity = this.analyzeComplexity(analysis)

    return {
      summary,
      details,
      concepts,
      snippetExplanations,
      complexity,
    }
  }

  /**
   * 提取关键概念
   */
  private extractConcepts(code: string, language: SupportedLanguage): string[] {
    const concepts: Set<string> = new Set()

    // 检测常见模式
    const patterns: Record<string, RegExp[]> = {
      typescript: [
        /interface\s+(\w+)/g,
        /type\s+(\w+)\s*=/g,
        /class\s+(\w+)/g,
        /enum\s+(\w+)/g,
        /import\s+.*from\s+['"](\w+)['"]/g,
      ],
      javascript: [
        /class\s+(\w+)/g,
        /function\s+(\w+)/g,
        /const\s+(\w+)\s*=/g,
        /import\s+.*from\s+['"](\w+)['"]/g,
      ],
      python: [
        /def\s+(\w+)/g,
        /class\s+(\w+)/g,
        /import\s+(\w+)/g,
        /from\s+(\w+)\s+import/g,
      ],
      go: [
        /func\s+(\w+)/g,
        /type\s+(\w+)\s+struct/g,
        /type\s+(\w+)\s+interface/g,
        /import\s+["']([^"']+)["']/g,
      ],
      rust: [
        /fn\s+(\w+)/g,
        /struct\s+(\w+)/g,
        /enum\s+(\w+)/g,
        /trait\s+(\w+)/g,
        /use\s+(\w+)/g,
      ],
    }

    const langPatterns = patterns[language] || patterns.typescript

    for (const pattern of langPatterns) {
      let match
      while ((match = pattern.exec(code)) !== null) {
        if (match[1]) {
          concepts.add(match[1])
        }
      }
    }

    // 限制数量
    return Array.from(concepts).slice(0, 20)
  }

  /**
   * 生成摘要
   */
  private generateSummary(code: string, language: SupportedLanguage, analysis: CodeAnalysisResult): string {
    const lines = code.split('\n').length
    const functions = analysis.stats.functions
    const classes = analysis.stats.classes
    const complexity = analysis.complexity

    // 根据语言生成不同的摘要
    const languageNames: Record<string, string> = {
      typescript: 'TypeScript',
      javascript: 'JavaScript',
      python: 'Python',
      go: 'Go',
      rust: 'Rust',
    }

    const langName = languageNames[language] || language

    // 生成摘要
    let summary = `这是一个 ${langName} 代码段，包含 ${lines} 行代码。`

    if (functions > 0) {
      summary += `\n\n定义了 ${functions} 个函数`
    }

    if (classes > 0) {
      summary += ` 和 ${classes} 个类/接口`
    }

    summary += '。'

    // 复杂度评估
    if (complexity.cyclomatic > 15) {
      summary += `\n\n⚠️ 代码复杂度较高（圈复杂度 ${complexity.cyclomatic}），建议拆分函数以提高可维护性。`
    } else if (complexity.cyclomatic > 8) {
      summary += `\n\n代码复杂度适中（圈复杂度 ${complexity.cyclomatic}）。`
    } else {
      summary += `\n\n✅ 代码结构清晰，复杂度低（圈复杂度 ${complexity.cyclomatic}）。`
    }

    // 可维护性
    if (complexity.maintainability < 40) {
      summary += `\n\n⚠️ 可维护性指数较低 (${complexity.maintainability}/100)，建议重构以提升代码质量。`
    } else if (complexity.maintainability > 70) {
      summary += `\n\n✅ 可维护性良好 (${complexity.maintainability}/100)。`
    }

    return summary
  }

  /**
   * 生成详细解释
   */
  private generateDetails(code: string, language: SupportedLanguage, analysis: CodeAnalysisResult): string[] {
    const details: string[] = []

    // 1. 导入/依赖解释
    if (analysis.imports.length > 0) {
      details.push(`📦 **依赖导入**：引入了 ${analysis.imports.length} 个外部模块/包`)
      
      if (analysis.dependencies.length > 0) {
        details.push(`   - 第三方依赖：${analysis.dependencies.join(', ')}`)
      }
    }

    // 2. 函数/方法解释
    if (analysis.stats.functions > 0) {
      const functionDetails = this.explainFunctions(code, language)
      details.push(...functionDetails)
    }

    // 3. 类/结构解释
    if (analysis.stats.classes > 0) {
      const classDetails = this.explainClasses(code, language)
      details.push(...classDetails)
    }

    // 4. 控制流解释
    const controlFlow = this.explainControlFlow(code, language)
    if (controlFlow) {
      details.push(controlFlow)
    }

    // 5. 错误处理解释
    const errorHandling = this.explainErrorHandling(code, language)
    if (errorHandling) {
      details.push(errorHandling)
    }

    return details
  }

  /**
   * 解释函数
   */
  private explainFunctions(code: string, language: SupportedLanguage): string[] {
    const details: string[] = []
    const patterns: Record<string, RegExp> = {
      typescript: /(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g,
      javascript: /(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g,
      python: /def\s+(\w+)\s*\(([^)]*)\)/g,
      go: /func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(([^)]*)\)/g,
      rust: /(?:pub\s+)?fn\s+(\w+)\s*\(([^)]*)\)/g,
    }

    const pattern = patterns[language] || patterns.typescript
    let match
    const functions: string[] = []

    while ((match = pattern.exec(code)) !== null) {
      const name = match[1]
      const params = match[2] || ''
      const paramList = params.split(',').map(p => p.trim()).filter(Boolean).join(', ')
      
      functions.push(`   - \`${name}(${paramList})\``)
    }

    if (functions.length > 0) {
      details.push(`📝 **函数定义**：\n${functions.join('\n')}`)
    }

    return details
  }

  /**
   * 解释类
   */
  private explainClasses(code: string, language: SupportedLanguage): string[] {
    const details: string[] = []
    const patterns: Record<string, RegExp> = {
      typescript: /(?:class|interface|type)\s+(\w+)/g,
      javascript: /class\s+(\w+)/g,
      python: /class\s+(\w+)/g,
      go: /(?:type\s+(\w+)\s+(?:struct|interface))/g,
      rust: /(?:struct|enum|trait)\s+(\w+)/g,
    }

    const pattern = patterns[language] || patterns.typescript
    let match
    const classes: string[] = []

    while ((match = pattern.exec(code)) !== null) {
      if (match[1]) {
        classes.push(`   - \`${match[1]}\``)
      }
    }

    if (classes.length > 0) {
      details.push(`🏗️ **类型定义**：\n${classes.join('\n')}`)
    }

    return details
  }

  /**
   * 解释控制流
   */
  private explainControlFlow(code: string, language: SupportedLanguage): string | null {
    const hasConditionals = /\bif\b|\bswitch\b|\bfor\b|\bwhile\b/.test(code)
    const hasAsync = /\basync\b|\bawait\b|\bPromise\b/.test(code)
    const hasErrorHandling = /\btry\b|\bcatch\b|\bthrow\b/.test(code)

    const features: string[] = []

    if (hasConditionals) {
      features.push('条件判断')
    }
    if (hasAsync) {
      features.push('异步处理')
    }
    if (hasErrorHandling) {
      features.push('错误处理')
    }

    if (features.length > 0) {
      return `🔀 **控制流**：代码使用了 ${features.join('、')} 等控制结构`
    }

    return null
  }

  /**
   * 解释错误处理
   */
  private explainErrorHandling(code: string, language: SupportedLanguage): string | null {
    const hasTryCatch = /\btry\b.*\bcatch\b/s.test(code)
    const hasErrorCheck = language === 'go' ? /\bif\s+err\s*!=\s*nil\b/.test(code) : false

    if (hasTryCatch) {
      return `🛡️ **错误处理**：代码使用了 try-catch 块进行异常捕获和处理`
    }

    if (hasErrorCheck) {
      return `🛡️ **错误处理**：代码遵循 Go 的错误检查模式，检查每个可能的错误`
    }

    return null
  }

  /**
   * 解释代码片段
   */
  private explainSnippets(
    code: string,
    language: SupportedLanguage
  ): CodeExplanation['snippetExplanations'] {
    const explanations: CodeExplanation['snippetExplanations'] = []

    // 简化版本：基于模式识别生成片段解释
    const snippetPatterns = [
      {
        pattern: /for\s*\([^)]+\)\s*\{/,
        explanation: '这是一个循环结构，用于重复执行代码块',
      },
      {
        pattern: /if\s*\([^)]+\)\s*\{/,
        explanation: '这是一个条件判断，根据条件选择性地执行代码',
      },
      {
        pattern: /async\s+function/,
        explanation: '这是一个异步函数，使用 async/await 处理异步操作',
      },
      {
        pattern: /class\s+\w+/,
        explanation: '这是一个类定义，用于创建对象模板',
      },
      {
        pattern: /interface\s+\w+/,
        explanation: '这是一个接口定义，指定对象必须实现的结构',
      },
      {
        pattern: /try\s*\{/,
        explanation: '这是错误处理尝试块，用于捕获可能抛出的异常',
      },
    ]

    let lineNumber = 1
    const lines = code.split('\n')

    for (const { pattern, explanation } of snippetPatterns) {
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          explanations.push({
            range: {
              start: { line: i + 1, column: 1 },
              end: { line: i + 1, column: lines[i].length },
            },
            explanation,
          })
        }
      }
    }

    return explanations
  }

  /**
   * 分析复杂度
   */
  private analyzeComplexity(analysis: CodeAnalysisResult): CodeExplanation['complexity'] {
    const cyclomatic = analysis.complexity.cyclomatic

    let time: string
    let space: string

    // 估算时间复杂度
    if (cyclomatic <= 5) {
      time = 'O(1) - 常数时间'
    } else if (cyclomatic <= 10) {
      time = 'O(log n) - 对数时间'
    } else if (cyclomatic <= 20) {
      time = 'O(n) - 线性时间'
    } else if (cyclomatic <= 50) {
      time = 'O(n log n) - 线性对数时间'
    } else {
      time = 'O(n²) - 平方时间（建议优化）'
    }

    // 估算空间复杂度
    // 简化版本：基于代码行数估算
    const loc = analysis.stats.linesOfCode
    if (loc <= 50) {
      space = 'O(1) - 常数空间'
    } else if (loc <= 200) {
      space = 'O(n) - 线性空间'
    } else if (loc <= 500) {
      space = 'O(n²) - 平方空间'
    } else {
      space = '需要进一步分析（建议重构）'
    }

    return { time, space }
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
export const codeExplainer = new CodeExplainer()