/**
 * @fileoverview 代码分析器
 * @description 静态分析代码，提取结构、复杂度、依赖等信息
 */

import type { SupportedLanguage, CodeAnalysis, CodePosition, CodeRange } from './types'

/**
 * 代码分析器配置
 */
interface AnalyzerConfig {
  languages: string[]
  enableCache: boolean
  verbose: boolean
}

/**
 * 语言特定的解析规则
 */
const LANGUAGE_RULES: Record<string, {
  commentPatterns: RegExp[]
  stringPatterns: RegExp[]
  functionPatterns: RegExp[]
  classPatterns: RegExp[]
  importPatterns: RegExp[]
  exportPatterns: RegExp[]
}> = {
  typescript: {
    commentPatterns: [/\/\/.*$/gm, /\/\*[\s\S]*?\*\//g],
    stringPatterns: [/"(?:[^"\\]|\\.)*"/g, /'(?:[^'\\]|\\.)*'/g, /`(?:[^`\\]|\\.)*`/g],
    functionPatterns: [
      /(?:async\s+)?function\s+(\w+)\s*\(/g,
      /(?:async\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>/g,
      /(?:public|private|protected)?\s*(?:static\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{/g,
    ],
    classPatterns: [/class\s+(\w+)/g, /interface\s+(\w+)/g],
    importPatterns: [/import\s+.*?from\s+['"]([^'"]+)['"]/g, /import\s+['"]([^'"]+)['"]/g],
    exportPatterns: [/export\s+(?:default\s+)?(?:class|function|const|let|var)?\s*(\w+)/g],
  },
  javascript: {
    commentPatterns: [/\/\/.*$/gm, /\/\*[\s\S]*?\*\//g],
    stringPatterns: [/"(?:[^"\\]|\\.)*"/g, /'(?:[^'\\]|\\.)*'/g, /`(?:[^`\\]|\\.)*`/g],
    functionPatterns: [
      /(?:async\s+)?function\s+(\w+)\s*\(/g,
      /(?:async\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>/g,
    ],
    classPatterns: [/class\s+(\w+)/g],
    importPatterns: [/import\s+.*?from\s+['"]([^'"]+)['"]/g, /import\s+['"]([^'"]+)['"]/g],
    exportPatterns: [/export\s+(?:default\s+)?(?:class|function|const|let|var)?\s*(\w+)/g],
  },
  python: {
    commentPatterns: [/#.*$/gm, /"""[\s\S]*?"""/g, /'''[\s\S]*?'''/g],
    stringPatterns: [/"(?:[^"\\]|\\.)*"/g, /'(?:[^'\\]|\\.)*'/g, /"""[\s\S]*?"""/g, /'''[\s\S]*?'''/g],
    functionPatterns: [/def\s+(\w+)\s*\(/g, /(?:async\s+)?def\s+(\w+)\s*\(/g],
    classPatterns: [/class\s+(\w+)/g],
    importPatterns: [/import\s+(\w+)/g, /from\s+(\w+)\s+import/g],
    exportPatterns: [/__all__\s*=\s*\[([^\]]+)\]/g],
  },
  go: {
    commentPatterns: [/\/\/.*$/gm, /\/\*[\s\S]*?\*\//g],
    stringPatterns: [/"(?:[^"\\]|\\.)*"/g, /`(?:[^`]*)`/g],
    functionPatterns: [/func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(/g],
    classPatterns: [/type\s+(\w+)\s+struct\s*\{/g, /type\s+(\w+)\s+interface\s*\{/g],
    importPatterns: [/import\s+(?:\(\s*)?["']([^"']+)["']/g],
    exportPatterns: [/func\s+\(?[a-z]*\)?\s*([A-Z]\w+)\s*\(/g], // 首字母大写为导出
  },
  rust: {
    commentPatterns: [/\/\/.*$/gm, /\/\*[\s\S]*?\*\//g, /\/\/!.*$/gm],
    stringPatterns: [/"(?:[^"\\]|\\.)*"/g, /r#(?:[^#]*)#/g],
    functionPatterns: [/fn\s+(\w+)\s*[<(]/g, /pub\s+fn\s+(\w+)\s*[<(]/g],
    classPatterns: [/struct\s+(\w+)/g, /enum\s+(\w+)/g, /trait\s+(\w+)/g],
    importPatterns: [/use\s+([^;]+);/g, /extern\s+crate\s+(\w+);/g],
    exportPatterns: [/pub\s+(?:fn|struct|enum|trait|mod)\s+(\w+)/g],
  },
}

/**
 * 代码分析器
 */
export class CodeAnalyzer {
  private config: AnalyzerConfig
  private cache: Map<string, CodeAnalysis> = new Map()

  constructor(config: Partial<AnalyzerConfig> = {}) {
    this.config = {
      languages: ['typescript', 'javascript', 'python', 'go', 'rust'],
      enableCache: true,
      verbose: false,
      ...config,
    }
  }

  /**
   * 分析代码
   */
  async analyze(code: string, language: SupportedLanguage): Promise<CodeAnalysis> {
    // 检查缓存
    if (this.config.enableCache) {
      const cacheKey = `${language}:${this.hashCode(code)}`
      const cached = this.cache.get(cacheKey)
      if (cached) {
        return cached
      }
    }

    const result = this.doAnalyze(code, language)

    // 存储缓存
    if (this.config.enableCache) {
      const cacheKey = `${language}:${this.hashCode(code)}`
      this.cache.set(cacheKey, result)
    }

    return result
  }

  /**
   * 执行分析
   */
  private doAnalyze(code: string, language: SupportedLanguage): CodeAnalysis {
    const rules = LANGUAGE_RULES[language] || LANGUAGE_RULES.typescript

    // 移除注释和字符串进行分析
    const codeWithoutComments = this.removeCommentsAndStrings(code, rules)

    // 统计信息
    const stats = this.calculateStats(code, codeWithoutComments, rules)

    // 复杂度分析
    const complexity = this.calculateComplexity(codeWithoutComments, language)

    // 提取导入导出
    const imports = this.extractPatterns(code, rules.importPatterns)
    const exports = this.extractPatterns(code, rules.exportPatterns)

    // 提取依赖
    const dependencies = this.extractDependencies(imports, language)

    return {
      language,
      complexity,
      stats,
      dependencies,
      exports,
      imports,
    }
  }

  /**
   * 移除注释和字符串
   */
  private removeCommentsAndStrings(code: string, rules: typeof LANGUAGE_RULES.typescript): string {
    let result = code

    // 移除注释
    for (const pattern of rules.commentPatterns) {
      result = result.replace(pattern, '')
    }

    // 移除字符串（保留占位符以保持行号）
    for (const pattern of rules.stringPatterns) {
      result = result.replace(pattern, '""')
    }

    return result
  }

  /**
   * 计算统计信息
   */
  private calculateStats(
    code: string,
    codeWithoutComments: string,
    rules: typeof LANGUAGE_RULES.typescript
  ): CodeAnalysis['stats'] {
    const lines = code.split('\n')
    const linesWithoutComments = codeWithoutComments.split('\n')

    let blankLines = 0
    let commentLines = 0

    lines.forEach((line, index) => {
      const trimmed = line.trim()
      const codeTrimmed = linesWithoutComments[index]?.trim() || ''

      if (trimmed === '') {
        blankLines++
      } else if (codeTrimmed === '' && trimmed !== '') {
        commentLines++
      }
    })

    const functions = this.countPatterns(codeWithoutComments, rules.functionPatterns)
    const classes = this.countPatterns(codeWithoutComments, rules.classPatterns)

    return {
      linesOfCode: lines.length - blankLines - commentLines,
      blankLines,
      commentLines,
      functions,
      classes,
    }
  }

  /**
   * 计算复杂度
   */
  private calculateComplexity(code: string, language: SupportedLanguage): CodeAnalysis['complexity'] {
    // 圈复杂度 (Cyclomatic Complexity)
    const cyclomatic = this.calculateCyclomaticComplexity(code, language)

    // 认知复杂度 (Cognitive Complexity)
    const cognitive = this.calculateCognitiveComplexity(code, language)

    // 可维护性指数 (Maintainability Index)
    const maintainability = this.calculateMaintainabilityIndex(code, cyclomatic)

    return {
      cyclomatic,
      cognitive,
      maintainability,
    }
  }

  /**
   * 计算圈复杂度
   */
  private calculateCyclomaticComplexity(code: string, language: SupportedLanguage): number {
    let complexity = 1 // 基础复杂度

    // 决策点
    const decisionPatterns = [
      /\bif\b/g,
      /\belse\s+if\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bswitch\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\?\s*:/g, // 三元运算符
      /&&/g,
      /\|\|/g,
    ]

    for (const pattern of decisionPatterns) {
      const matches = code.match(pattern)
      if (matches) {
        complexity += matches.length
      }
    }

    return complexity
  }

  /**
   * 计算认知复杂度
   */
  private calculateCognitiveComplexity(code: string, language: SupportedLanguage): number {
    let complexity = 0
    let nestingLevel = 0
    const lines = code.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()

      // 增加嵌套
      if (/\b(if|for|while|switch|try)\b/.test(trimmed)) {
        complexity += 1 + nestingLevel
        nestingLevel++
      }
      
      // 减少嵌套
      if (/^\}/.test(trimmed)) {
        nestingLevel = Math.max(0, nestingLevel - 1)
      }

      // else 分支
      if (/\belse\s+if\b/.test(trimmed)) {
        complexity += 1
      }
    }

    return complexity
  }

  /**
   * 计算可维护性指数
   */
  private calculateMaintainabilityIndex(code: string, cyclomaticComplexity: number): number {
    const lines = code.split('\n').length
    const volume = code.length * Math.log2(256) // 简化的 Halstead Volume
    
    // 可维护性指数 = max(0, (171 - 5.2 * ln(V) - 0.23 * G - 16.2 * ln(LOC)) * 100 / 171)
    let index = 171 - 5.2 * Math.log(volume) - 0.23 * cyclomaticComplexity - 16.2 * Math.log(lines)
    index = Math.max(0, index)
    index = Math.min(100, index)

    return Math.round(index)
  }

  /**
   * 提取匹配模式
   */
  private extractPatterns(code: string, patterns: RegExp[]): string[] {
    const results: Set<string> = new Set()

    for (const pattern of patterns) {
      let match
      const regex = new RegExp(pattern.source, pattern.flags)
      while ((match = regex.exec(code)) !== null) {
        if (match[1]) {
          results.add(match[1])
        }
      }
    }

    return Array.from(results)
  }

  /**
   * 计数匹配模式
   */
  private countPatterns(code: string, patterns: RegExp[]): number {
    let count = 0

    for (const pattern of patterns) {
      const matches = code.match(pattern)
      if (matches) {
        count += matches.length
      }
    }

    return count
  }

  /**
   * 提取依赖
   */
  private extractDependencies(imports: string[], language: SupportedLanguage): string[] {
    // 过滤掉标准库和内部模块
    const externalDeps = imports.filter(imp => {
      // Node.js 内置模块
      const nodeBuiltins = ['fs', 'path', 'http', 'https', 'crypto', 'util', 'events', 'stream', 'os', 'child_process']
      
      // 语言特定标准库
      const standardLibs: Record<string, string[]> = {
        typescript: [...nodeBuiltins],
        javascript: [...nodeBuiltins],
        python: ['os', 'sys', 'json', 're', 'datetime', 'time', 'math', 'random', 'collections', 'itertools', 'functools'],
        go: ['fmt', 'os', 'io', 'strings', 'strconv', 'time', 'context', 'sync', 'errors', 'log'],
        rust: ['std', 'core', 'alloc'],
      }

      const libs = standardLibs[language] || []
      
      // 排除相对导入和标准库
      return !imp.startsWith('.') && !libs.includes(imp.split('/')[0])
    })

    // 归一化包名
    return [...new Set(externalDeps.map(dep => {
      // 提取包名（去除子路径）
      const parts = dep.split('/')
      if (dep.startsWith('@')) {
        return parts.slice(0, 2).join('/')
      }
      return parts[0]
    }))]
  }

  /**
   * 计算代码哈希
   */
  private hashCode(code: string): string {
    let hash = 0
    for (let i = 0; i < code.length; i++) {
      const char = code.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString(16)
  }

  /**
   * 分析代码位置
   */
  getPositionFromOffset(code: string, offset: number): CodePosition {
    const lines = code.substring(0, offset).split('\n')
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1,
    }
  }

  /**
   * 从行列获取偏移
   */
  getOffsetFromPosition(code: string, position: CodePosition): number {
    const lines = code.split('\n')
    let offset = 0
    
    for (let i = 0; i < position.line - 1 && i < lines.length; i++) {
      offset += lines[i].length + 1 // +1 for newline
    }
    
    offset += position.column - 1
    return offset
  }

  /**
   * 获取代码范围
   */
  getCodeInRange(code: string, range: CodeRange): string {
    const lines = code.split('\n')
    const startLine = range.start.line - 1
    const endLine = range.end.line - 1

    if (startLine === endLine) {
      return lines[startLine].substring(range.start.column - 1, range.end.column - 1)
    }

    const result: string[] = []
    
    // 第一行
    result.push(lines[startLine].substring(range.start.column - 1))
    
    // 中间行
    for (let i = startLine + 1; i < endLine; i++) {
      result.push(lines[i])
    }
    
    // 最后一行
    result.push(lines[endLine].substring(0, range.end.column - 1))

    return result.join('\n')
  }
}

// 默认实例
export const codeAnalyzer = new CodeAnalyzer()
