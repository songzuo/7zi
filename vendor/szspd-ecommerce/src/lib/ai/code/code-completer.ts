/**
 * @fileoverview 代码补全器
 * @description 基于上下文的智能代码补全
 */

import type { SupportedLanguage, CompletionSuggestion, CodePosition, CodeContext } from './types'
import { CodeAnalyzer } from './code-analyzer'

/**
 * 补全器配置
 */
interface CompleterConfig {
  languages: string[]
  enableCache: boolean
  maxSuggestions: number
  verbose: boolean
}

/**
 * 语言特定的补全规则
 */
const COMPLETION_RULES: Record<string, {
  keywords: string[]
  snippets: CompletionSnippet[]
  commonPatterns: RegExp[]
}> = {
  typescript: {
    keywords: [
      'interface', 'type', 'class', 'extends', 'implements', 'public', 'private', 'protected',
      'readonly', 'async', 'await', 'Promise', 'const', 'let', 'var', 'function', 'return',
      'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'try', 'catch',
      'finally', 'throw', 'new', 'this', 'super', 'static', 'abstract', 'import', 'export',
      'from', 'default', 'as', 'typeof', 'instanceof', 'void', 'null', 'undefined', 'true',
      'false', 'enum', 'namespace', 'module', 'declare', 'interface', 'type',
    ],
    snippets: [
      {
        prefix: 'cl',
        description: 'console.log',
        body: 'console.log($1)',
        kind: 'snippet',
      },
      {
        prefix: 'fn',
        description: 'function',
        body: 'function $1($2) {\n  $0\n}',
        kind: 'snippet',
      },
      {
        prefix: 'afn',
        description: 'async function',
        body: 'async function $1($2) {\n  $0\n}',
        kind: 'snippet',
      },
      {
        prefix: 'arrow',
        description: 'arrow function',
        body: '($1) => {\n  $0\n}',
        kind: 'snippet',
      },
      {
        prefix: 'aarrow',
        description: 'async arrow function',
        body: 'async ($1) => {\n  $0\n}',
        kind: 'snippet',
      },
      {
        prefix: 'if',
        description: 'if statement',
        body: 'if ($1) {\n  $0\n}',
        kind: 'snippet',
      },
      {
        prefix: 'ife',
        description: 'if-else statement',
        body: 'if ($1) {\n  $2\n} else {\n  $0\n}',
        kind: 'snippet',
      },
      {
        prefix: 'for',
        description: 'for loop',
        body: 'for (let i = 0; i < $1; i++) {\n  $0\n}',
        kind: 'snippet',
      },
      {
        prefix: 'forof',
        description: 'for...of loop',
        body: 'for (const $1 of $2) {\n  $0\n}',
        kind: 'snippet',
      },
      {
        prefix: 'try',
        description: 'try-catch',
        body: 'try {\n  $1\n} catch (error) {\n  $0\n}',
        kind: 'snippet',
      },
      {
        prefix: 'class',
        description: 'class',
        body: 'class $1 {\n  constructor($2) {\n    $0\n  }\n}',
        kind: 'snippet',
      },
      {
        prefix: 'interface',
        description: 'interface',
        body: 'interface $1 {\n  $0\n}',
        kind: 'snippet',
      },
      {
        prefix: 'type',
        description: 'type alias',
        body: 'type $1 = $0',
        kind: 'snippet',
      },
    ],
    commonPatterns: [
      /\.(\w+)$/g, // 属性访问
      /(\w+)\.$/g, // 方法调用
      /(\w+)\s*=\s*$/g, // 赋值
      /(\w+)\s*\(\s*$/g, // 函数调用
      /import\s+.*from\s+['"]([^'"]*)$/g, // 导入
    ],
  },
  javascript: {
    keywords: [
      'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'switch',
      'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'class',
      'extends', 'super', 'static', 'import', 'export', 'from', 'default', 'async', 'await',
      'Promise', 'typeof', 'instanceof', 'void', 'null', 'undefined', 'true', 'false',
    ],
    snippets: [
      {
        prefix: 'cl',
        description: 'console.log',
        body: 'console.log($1)',
        kind: 'snippet',
      },
      {
        prefix: 'fn',
        description: 'function',
        body: 'function $1($2) {\n  $0\n}',
        kind: 'snippet',
      },
      {
        prefix: 'arrow',
        description: 'arrow function',
        body: '($1) => {\n  $0\n}',
        kind: 'snippet',
      },
      {
        prefix: 'if',
        description: 'if statement',
        body: 'if ($1) {\n  $0\n}',
        kind: 'snippet',
      },
      {
        prefix: 'for',
        description: 'for loop',
        body: 'for (let i = 0; i < $1; i++) {\n  $0\n}',
        kind: 'snippet',
      },
    ],
    commonPatterns: [
      /\.(\w+)$/g,
      /(\w+)\.$/g,
      /(\w+)\s*=\s*$/g,
      /(\w+)\s*\(\s*$/g,
    ],
  },
  python: {
    keywords: [
      'def', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally',
      'with', 'as', 'import', 'from', 'return', 'yield', 'raise', 'pass', 'break', 'continue',
      'and', 'or', 'not', 'in', 'is', 'lambda', 'True', 'False', 'None', 'async', 'await',
    ],
    snippets: [
      {
        prefix: 'def',
        description: 'function',
        body: 'def $1($2):\n    $0',
        kind: 'snippet',
      },
      {
        prefix: 'async',
        description: 'async function',
        body: 'async def $1($2):\n    $0',
        kind: 'snippet',
      },
      {
        prefix: 'class',
        description: 'class',
        body: 'class $1:\n    def __init__(self, $2):\n        $0',
        kind: 'snippet',
      },
      {
        prefix: 'if',
        description: 'if statement',
        body: 'if $1:\n    $0',
        kind: 'snippet',
      },
      {
        prefix: 'for',
        description: 'for loop',
        body: 'for $1 in $2:\n    $0',
        kind: 'snippet',
      },
      {
        prefix: 'try',
        description: 'try-except',
        body: 'try:\n    $1\nexcept Exception as e:\n    $0',
        kind: 'snippet',
      },
      {
        prefix: 'with',
        description: 'with statement',
        body: 'with $1 as $2:\n    $0',
        kind: 'snippet',
      },
    ],
    commonPatterns: [
      /\.(\w+)$/g,
      /(\w+)\.$/g,
      /(\w+)\s*=\s*$/g,
      /(\w+)\s*\(\s*$/g,
      /import\s+(\w+)$/g,
      /from\s+(\w+)\s+import\s+(\w*)$/g,
    ],
  },
  go: {
    keywords: [
      'func', 'var', 'const', 'type', 'struct', 'interface', 'if', 'else', 'for', 'switch',
      'case', 'default', 'break', 'continue', 'fallthrough', 'select', 'defer', 'go', 'chan',
      'range', 'return', 'goto', 'package', 'import', 'map', 'make', 'new', 'len', 'cap',
      'append', 'copy', 'delete', 'close', 'nil', 'true', 'false', 'iota',
    ],
    snippets: [
      {
        prefix: 'fn',
        description: 'function',
        body: 'func $1($2) $3 {\n\t$0\n}',
        kind: 'snippet',
      },
      {
        prefix: 'if',
        description: 'if statement',
        body: 'if $1 {\n\t$0\n}',
        kind: 'snippet',
      },
      {
        prefix: 'for',
        description: 'for loop',
        body: 'for $1 := 0; $1 < $2; $1++ {\n\t$0\n}',
        kind: 'snippet',
      },
      {
        prefix: 'forr',
        description: 'for range',
        body: 'for $1, $2 := range $3 {\n\t$0\n}',
        kind: 'snippet',
      },
      {
        prefix: 'struct',
        description: 'struct',
        body: 'type $1 struct {\n\t$0\n}',
        kind: 'snippet',
      },
      {
        prefix: 'iferr',
        description: 'if error',
        body: 'if err != nil {\n\treturn err\n}',
        kind: 'snippet',
      },
    ],
    commonPatterns: [
      /\.(\w+)$/g,
      /(\w+)\.$/g,
      /(\w+)\s*:=\s*$/g,
      /(\w+)\s*=\s*$/g,
      /(\w+)\s*\(\s*$/g,
    ],
  },
  rust: {
    keywords: [
      'fn', 'let', 'mut', 'const', 'static', 'struct', 'enum', 'trait', 'impl', 'if', 'else',
      'match', 'for', 'while', 'loop', 'break', 'continue', 'return', 'where', 'use', 'mod',
      'crate', 'pub', 'unsafe', 'async', 'await', 'move', 'dyn', 'ref', 'type', 'Self',
      'self', 'true', 'false', 'None', 'Some', 'Ok', 'Err',
    ],
    snippets: [
      {
        prefix: 'fn',
        description: 'function',
        body: 'fn $1($2) -> $3 {\n    $0\n}',
        kind: 'snippet',
      },
      {
        prefix: 'pubfn',
        description: 'public function',
        body: 'pub fn $1($2) -> $3 {\n    $0\n}',
        kind: 'snippet',
      },
      {
        prefix: 'if',
        description: 'if statement',
        body: 'if $1 {\n    $0\n}',
        kind: 'snippet',
      },
      {
        prefix: 'match',
        description: 'match expression',
        body: 'match $1 {\n    $2 => $0,\n}',
        kind: 'snippet',
      },
      {
        prefix: 'for',
        description: 'for loop',
        body: 'for $1 in $2 {\n    $0\n}',
        kind: 'snippet',
      },
      {
        prefix: 'struct',
        description: 'struct',
        body: 'struct $1 {\n    $0\n}',
        kind: 'snippet',
      },
      {
        prefix: 'impl',
        description: 'impl block',
        body: 'impl $1 for $2 {\n    $0\n}',
        kind: 'snippet',
      },
    ],
    commonPatterns: [
      /\.(\w+)$/g,
      /(\w+)\.$/g,
      /(\w+)\s*=\s*$/g,
      /(\w+)\s*:\s*\w+\s*=\s*$/g,
      /(\w+)\s*\(\s*$/g,
    ],
  },
}

/**
 * 代码片段
 */
interface CompletionSnippet {
  prefix: string
  description: string
  body: string
  kind: CompletionSuggestion['kind']
}

/**
 * 代码补全器
 */
export class CodeCompleter {
  private config: CompleterConfig
  private analyzer: CodeAnalyzer
  private cache: Map<string, CompletionSuggestion[]> = new Map()

  constructor(config: Partial<CompleterConfig> = {}) {
    this.config = {
      languages: ['typescript', 'javascript', 'python', 'go', 'rust'],
      enableCache: true,
      maxSuggestions: 10,
      verbose: false,
      ...config,
    }
    this.analyzer = new CodeAnalyzer()
  }

  /**
   * 代码补全
   */
  async complete(
    code: string,
    position: CodePosition,
    language: SupportedLanguage
  ): Promise<CompletionSuggestion[]> {
    // 获取当前行和上下文
    const lines = code.split('\n')
    const currentLine = lines[position.line - 1] || ''
    const beforeCursor = currentLine.substring(0, position.column - 1)
    const afterCursor = currentLine.substring(position.column - 1)

    // 获取上下文
    const context = await this.getContext(code, position, language)

    // 生成建议
    const suggestions: CompletionSuggestion[] = []

    // 1. 关键词补全
    suggestions.push(...this.completeKeywords(beforeCursor, language))

    // 2. 代码片段补全
    suggestions.push(...this.completeSnippets(beforeCursor, language))

    // 3. 基于上下文的补全
    suggestions.push(...this.completeFromContext(context, language))

    // 4. 模式匹配补全
    suggestions.push(...this.completeFromPatterns(beforeCursor, language))

    // 排序和去重
    const uniqueSuggestions = this.deduplicateSuggestions(suggestions)
    const sortedSuggestions = this.sortSuggestions(uniqueSuggestions, context)

    // 限制数量
    return sortedSuggestions.slice(0, this.config.maxSuggestions)
  }

  /**
   * 获取上下文
   */
  private async getContext(code: string, position: CodePosition, language: SupportedLanguage): Promise<CodeContext> {
    const lines = code.split('\n')
    const currentLineIndex = position.line - 1

    // 获取当前行
    const currentLine = lines[currentLineIndex] || ''

    // 获取前几行（上下文）
    const contextLines = lines.slice(Math.max(0, currentLineIndex - 5), currentLineIndex + 1)

    // 分析代码
    const analysis = await this.analyzer.analyze(code, language)

    return {
      code,
      language,
      position,
      projectStructure: {
        files: [],
        dependencies: analysis.dependencies,
      },
    }
  }

  /**
   * 关键词补全
   */
  private completeKeywords(beforeCursor: string, language: SupportedLanguage): CompletionSuggestion[] {
    const rules = COMPLETION_RULES[language] || COMPLETION_RULES.typescript
    const suggestions: CompletionSuggestion[] = []

    // 获取当前输入的单词
    const match = beforeCursor.match(/(\w+)$/)
    if (!match) return []

    const prefix = match[1].toLowerCase()

    // 匹配关键词
    for (const keyword of rules.keywords) {
      if (keyword.toLowerCase().startsWith(prefix)) {
        suggestions.push({
          text: keyword.substring(prefix.length),
          displayText: keyword,
          kind: 'snippet',
          confidence: 0.9,
          priority: 1,
        })
      }
    }

    return suggestions
  }

  /**
   * 代码片段补全
   */
  private completeSnippets(beforeCursor: string, language: SupportedLanguage): CompletionSuggestion[] {
    const rules = COMPLETION_RULES[language] || COMPLETION_RULES.typescript
    const suggestions: CompletionSuggestion[] = []

    // 获取当前输入的单词
    const match = beforeCursor.match(/(\w+)$/)
    if (!match) return []

    const prefix = match[1].toLowerCase()

    // 匹配代码片段
    for (const snippet of rules.snippets) {
      if (snippet.prefix.toLowerCase().startsWith(prefix)) {
        suggestions.push({
          text: snippet.body,
          displayText: snippet.description,
          kind: snippet.kind,
          documentation: snippet.body,
          confidence: 0.95,
          priority: 2,
        })
      }
    }

    return suggestions
  }

  /**
   * 基于上下文的补全
   */
  private completeFromContext(context: CodeContext, language: SupportedLanguage): CompletionSuggestion[] {
    const suggestions: CompletionSuggestion[] = []

    // 检查上下文是否有效
    if (!context.code || !context.position) {
      return suggestions
    }

    // 提取当前作用域的变量和函数
    const variables = this.extractVariables(context.code, context.position, language)
    const functions = this.extractFunctions(context.code, context.position, language)

    // 添加变量建议
    for (const variable of variables) {
      suggestions.push({
        text: variable.name,
        displayText: `${variable.name}: ${variable.type}`,
        kind: 'variable',
        documentation: variable.documentation,
        confidence: 0.85,
        priority: 3,
      })
    }

    // 添加函数建议
    for (const func of functions) {
      suggestions.push({
        text: func.name,
        displayText: `${func.name}(${func.params.join(', ')})`,
        kind: 'function',
        documentation: func.documentation,
        confidence: 0.9,
        priority: 3,
      })
    }

    return suggestions
  }

  /**
   * 基于模式的补全
   */
  private completeFromPatterns(beforeCursor: string, language: SupportedLanguage): CompletionSuggestion[] {
    const rules = COMPLETION_RULES[language] || COMPLETION_RULES.typescript
    const suggestions: CompletionSuggestion[] = []

    // 检查常见模式
    for (const pattern of rules.commonPatterns) {
      const match = beforeCursor.match(pattern)
      if (match) {
        // 根据模式生成建议
        const patternSuggestions = this.generatePatternSuggestions(match, pattern, language)
        suggestions.push(...patternSuggestions)
      }
    }

    return suggestions
  }

  /**
   * 生成模式建议
   */
  private generatePatternSuggestions(
    match: RegExpMatchArray,
    pattern: RegExp,
    language: SupportedLanguage
  ): CompletionSuggestion[] {
    const suggestions: CompletionSuggestion[] = []

    // 属性访问模式
    if (pattern.source.includes('\\.(\\w+)')) {
      const object = match[1]
      // 这里可以基于对象类型生成属性建议
      // 简化版本：返回常见属性
      const commonProps = ['length', 'size', 'name', 'value', 'id', 'type']
      for (const prop of commonProps) {
        suggestions.push({
          text: prop,
          displayText: `${object}.${prop}`,
          kind: 'method',
          confidence: 0.7,
          priority: 4,
        })
      }
    }

    // 函数调用模式
    if (pattern.source.includes('\\(\\s*$')) {
      const func = match[1]
      // 这里可以基于函数签名生成参数建议
      suggestions.push({
        text: ')',
        displayText: `${func}()`,
        kind: 'function',
        confidence: 0.8,
        priority: 4,
      })
    }

    return suggestions
  }

  /**
   * 提取变量
   */
  private extractVariables(code: string, position: CodePosition, language: SupportedLanguage): Array<{
    name: string
    type: string
    documentation?: string
  }> {
    const variables: Array<{ name: string; type: string; documentation?: string }> = []
    const lines = code.split('\n')

    // 分析当前位置之前的代码
    for (let i = 0; i < position.line - 1; i++) {
      const line = lines[i]

      // TypeScript/JavaScript 变量声明
      const varMatch = line.match(/(?:const|let|var)\s+(\w+)\s*(?::\s*(\w+))?\s*=/)
      if (varMatch) {
        variables.push({
          name: varMatch[1],
          type: varMatch[2] || 'any',
        })
      }

      // Python 变量声明
      const pyMatch = line.match(/(\w+)\s*=/)
      if (pyMatch && language === 'python') {
        variables.push({
          name: pyMatch[1],
          type: 'any',
        })
      }

      // Go 变量声明
      const goMatch = line.match(/(?:var|const)\s+(\w+)\s+(\w+)/)
      if (goMatch && language === 'go') {
        variables.push({
          name: goMatch[1],
          type: goMatch[2],
        })
      }

      // Rust 变量声明
      const rustMatch = line.match(/(?:let|let mut)\s+(\w+)\s*(?::\s*(\w+))?/)
      if (rustMatch && language === 'rust') {
        variables.push({
          name: rustMatch[1],
          type: rustMatch[2] || 'unknown',
        })
      }
    }

    return variables
  }

  /**
   * 提取函数
   */
  private extractFunctions(code: string, position: CodePosition, language: SupportedLanguage): Array<{
    name: string
    params: string[]
    documentation?: string
  }> {
    const functions: Array<{ name: string; params: string[]; documentation?: string }> = []
    const lines = code.split('\n')

    // 分析当前位置之前的代码
    for (let i = 0; i < position.line - 1; i++) {
      const line = lines[i]

      // TypeScript/JavaScript 函数声明
      const tsMatch = line.match(/(?:function|const\s+\w+\s*=\s*(?:async\s+)?)(\w+)\s*\(([^)]*)\)/)
      if (tsMatch) {
        functions.push({
          name: tsMatch[2],
          params: tsMatch[3].split(',').map(p => p.trim()).filter(Boolean),
        })
      }

      // Python 函数声明
      const pyMatch = line.match(/def\s+(\w+)\s*\(([^)]*)\)/)
      if (pyMatch && language === 'python') {
        functions.push({
          name: pyMatch[1],
          params: pyMatch[2].split(',').map(p => p.trim()).filter(Boolean),
        })
      }

      // Go 函数声明
      const goMatch = line.match(/func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(([^)]*)\)/)
      if (goMatch && language === 'go') {
        functions.push({
          name: goMatch[1],
          params: goMatch[2].split(',').map(p => p.trim()).filter(Boolean),
        })
      }

      // Rust 函数声明
      const rustMatch = line.match(/(?:pub\s+)?fn\s+(\w+)\s*\(([^)]*)\)/)
      if (rustMatch && language === 'rust') {
        functions.push({
          name: rustMatch[1],
          params: rustMatch[2].split(',').map(p => p.trim()).filter(Boolean),
        })
      }
    }

    return functions
  }

  /**
   * 去重建议
   */
  private deduplicateSuggestions(suggestions: CompletionSuggestion[]): CompletionSuggestion[] {
    const seen = new Set<string>()
    const unique: CompletionSuggestion[] = []

    for (const suggestion of suggestions) {
      const key = `${suggestion.displayText}:${suggestion.kind}`
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(suggestion)
      }
    }

    return unique
  }

  /**
   * 排序建议
   */
  private sortSuggestions(suggestions: CompletionSuggestion[], context: CodeContext): CompletionSuggestion[] {
    return suggestions.sort((a, b) => {
      // 优先级排序
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }

      // 置信度排序
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence
      }

      // 字母排序
      return a.displayText.localeCompare(b.displayText)
    })
  }
}

// 默认实例
export const codeCompleter = new CodeCompleter()