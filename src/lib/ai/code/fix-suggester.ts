/**
 * @fileoverview 修复建议生成器
 * @description 生成修复代码并解释原因
 */

import type { SupportedLanguage, FixSuggestion, CodeChange, CodeRange, Diff } from './types'
import { CodeAnalyzer } from './code-analyzer'

/**
 * 修复建议配置
 */
interface SuggesterConfig {
  languages: string[]
  enableCache: boolean
  verbose: boolean
}

/**
 * 修复模板
 */
interface FixTemplate {
  id: string
  name: string
  appliesTo: string[]
  generate: (context: FixContext) => FixSuggestion
}

/**
 * 修复上下文
 */
interface FixContext {
  code: string
  language: SupportedLanguage
  issue: {
    type: string
    message: string
    location: CodeRange
  }
  relatedCode?: string
}

/**
 * 修复模板库
 */
const FIX_TEMPLATES: FixTemplate[] = [
  // 空值检查修复
  {
    id: 'null-check-optional-chaining',
    name: 'Optional Chaining',
    appliesTo: ['null_reference', 'undefined_check'],
    generate: (context: FixContext): FixSuggestion => {
      const { code, issue } = context
      const { location } = issue
      
      // 提取相关代码
      const lines = code.split('\n')
      const line = lines[location.start.line - 1]
      const originalCode = line.trim()
      
      // 生成修复：添加可选链
      const fixedCode = originalCode.replace(/\.(\w+)/g, '?.$1')
      
      return {
        id: `fix-${Date.now()}`,
        description: 'Add optional chaining to prevent null/undefined errors',
        changes: [{
          filePath: '',
          range: location,
          oldCode: originalCode,
          newCode: fixedCode,
          reason: 'Use ?. operator to safely access properties',
        }],
        riskLevel: 'safe',
        estimatedSuccessRate: 0.95,
        explanation: 'Optional chaining (?.) returns undefined instead of throwing an error when accessing properties on null/undefined values.',
        before: originalCode,
        after: fixedCode,
      }
    },
  },
  
  // 严格相等修复
  {
    id: 'strict-equality',
    name: 'Strict Equality',
    appliesTo: ['type_mismatch', 'undefined_comparison'],
    generate: (context: FixContext): FixSuggestion => {
      const { code, issue } = context
      const { location } = issue
      
      const lines = code.split('\n')
      const line = lines[location.start.line - 1]
      const originalCode = line.trim()
      
      // 替换 == 为 ===
      const fixedCode = originalCode.replace(/([^=!])==(?!=)/g, '$1===')
      
      return {
        id: `fix-${Date.now()}`,
        description: 'Use strict equality (===) instead of loose equality (==)',
        changes: [{
          filePath: '',
          range: location,
          oldCode: originalCode,
          newCode: fixedCode,
          reason: 'Strict equality prevents type coercion issues',
        }],
        riskLevel: 'safe',
        estimatedSuccessRate: 0.9,
        explanation: 'The strict equality operator (===) checks both value and type, preventing unexpected type coercion.',
        before: originalCode,
        after: fixedCode,
      }
    },
  },
  
  // Async/Await 修复
  {
    id: 'add-await',
    name: 'Add Await',
    appliesTo: ['async_error', 'promise_unhandled'],
    generate: (context: FixContext): FixSuggestion => {
      const { code, issue } = context
      const { location } = issue
      
      const lines = code.split('\n')
      const line = lines[location.start.line - 1]
      const originalCode = line.trim()
      
      // 检测是否需要 await
      const fixedCode = originalCode.replace(
        /(?:const|let|var)\s+(\w+)\s*=\s*(\w+\([^)]*\))/,
        'const $1 = await $2'
      )
      
      return {
        id: `fix-${Date.now()}`,
        description: 'Add await keyword to handle Promise',
        changes: [{
          filePath: '',
          range: location,
          oldCode: originalCode,
          newCode: fixedCode,
          reason: 'Await the Promise to get the actual value',
        }],
        riskLevel: 'safe',
        estimatedSuccessRate: 0.85,
        explanation: 'The await keyword pauses execution until the Promise resolves, ensuring you get the actual value rather than a Promise object.',
        before: originalCode,
        after: fixedCode,
      }
    },
  },
  
  // Try-Catch 修复
  {
    id: 'add-try-catch',
    name: 'Add Error Handling',
    appliesTo: ['unhandled_exception'],
    generate: (context: FixContext): FixSuggestion => {
      const { code, issue } = context
      const { location } = issue
      
      const lines = code.split('\n')
      const line = lines[location.start.line - 1]
      const originalCode = line.trim()
      
      // 包装在 try-catch 中
      const fixedCode = `try {\n  ${originalCode}\n} catch (error) {\n  console.error('Error:', error);\n}`
      
      return {
        id: `fix-${Date.now()}`,
        description: 'Wrap code in try-catch to handle potential errors',
        changes: [{
          filePath: '',
          range: location,
          oldCode: originalCode,
          newCode: fixedCode,
          reason: 'Handle potential exceptions gracefully',
        }],
        riskLevel: 'safe',
        estimatedSuccessRate: 0.9,
        explanation: 'Wrapping potentially failing code in try-catch prevents unhandled exceptions from crashing the application.',
        before: originalCode,
        after: fixedCode,
      }
    },
  },
  
  // 事件监听器清理修复
  {
    id: 'cleanup-event-listener',
    name: 'Cleanup Event Listener',
    appliesTo: ['event_listener_leak'],
    generate: (context: FixContext): FixSuggestion => {
      const { code, issue } = context
      const { location } = issue
      
      const lines = code.split('\n')
      const line = lines[location.start.line - 1]
      const originalCode = line.trim()
      
      // 提取事件和监听器
      const match = originalCode.match(/addEventListener\s*\(\s*['"](\w+)['"]\s*,\s*(\w+)/)
      
      if (match) {
        const eventName = match[1]
        const handlerName = match[2]
        
        const cleanupCode = `// Cleanup in useEffect return
useEffect(() => {
  ${originalCode}
  return () => {
    element.removeEventListener('${eventName}', ${handlerName});
  };
}, []);`
        
        return {
          id: `fix-${Date.now()}`,
          description: 'Add cleanup function to remove event listener',
          changes: [{
            filePath: '',
            range: location,
            oldCode: originalCode,
            newCode: cleanupCode,
            reason: 'Prevent memory leak by cleaning up event listeners',
          }],
          riskLevel: 'safe',
          estimatedSuccessRate: 0.9,
          explanation: 'Event listeners should be removed when the component unmounts to prevent memory leaks and unexpected behavior.',
          before: originalCode,
          after: cleanupCode,
        }
      }
      
      return {
        id: `fix-${Date.now()}`,
        description: 'Add cleanup for event listener',
        changes: [{
          filePath: '',
          range: location,
          oldCode: originalCode,
          newCode: `${originalCode}
// TODO: Add removeEventListener in cleanup phase`,
          reason: 'Memory leak prevention',
        }],
        riskLevel: 'moderate',
        estimatedSuccessRate: 0.7,
        explanation: 'Event listeners should be removed when no longer needed.',
      }
    },
  },
  
  // Interval 清理修复
  {
    id: 'cleanup-interval',
    name: 'Cleanup Interval',
    appliesTo: ['interval_leak'],
    generate: (context: FixContext): FixSuggestion => {
      const { code, issue } = context
      const { location } = issue
      
      const lines = code.split('\n')
      const line = lines[location.start.line - 1]
      const originalCode = line.trim()
      
      const fixedCode = `const intervalId = ${originalCode}

// Cleanup in useEffect return
useEffect(() => {
  return () => {
    clearInterval(intervalId);
  };
}, []);`
      
      return {
        id: `fix-${Date.now()}`,
        description: 'Store interval ID and clear it on cleanup',
        changes: [{
          filePath: '',
          range: location,
          oldCode: originalCode,
          newCode: fixedCode,
          reason: 'Prevent memory leak by clearing interval',
        }],
        riskLevel: 'safe',
        estimatedSuccessRate: 0.95,
        explanation: 'Intervals continue running until explicitly cleared. Always store the interval ID and clear it when the component unmounts.',
        before: originalCode,
        after: fixedCode,
      }
    },
  },
  
  // 赋值与比较修复
  {
    id: 'assignment-vs-comparison',
    name: 'Fix Assignment in Condition',
    appliesTo: ['assignment_in_condition'],
    generate: (context: FixContext): FixSuggestion => {
      const { code, issue } = context
      const { location } = issue
      
      const lines = code.split('\n')
      const line = lines[location.start.line - 1]
      const originalCode = line.trim()
      
      // 将 = 替换为 ===
      const fixedCode = originalCode.replace(/if\s*\(\s*(\w+)\s*=\s*/, 'if ($1 === ')
      
      return {
        id: `fix-${Date.now()}`,
        description: 'Replace assignment (=) with comparison (===)',
        changes: [{
          filePath: '',
          range: location,
          oldCode: originalCode,
          newCode: fixedCode,
          reason: 'Likely a typo: = should be ===',
        }],
        riskLevel: 'moderate',
        estimatedSuccessRate: 0.8,
        explanation: 'Using = in a condition assigns a value and returns it. This is usually a typo where === (comparison) was intended.',
        before: originalCode,
        after: fixedCode,
      }
    },
  },
  
  // 无限循环修复
  {
    id: 'infinite-loop-fix',
    name: 'Add Break Condition',
    appliesTo: ['infinite_loop'],
    generate: (context: FixContext): FixSuggestion => {
      const { code, issue } = context
      const { location } = issue
      
      const lines = code.split('\n')
      const line = lines[location.start.line - 1]
      const originalCode = line.trim()
      
      const fixedCode = `${originalCode}
  // TODO: Add break condition to prevent infinite loop
  if (condition) {
    break;
  }`
      
      return {
        id: `fix-${Date.now()}`,
        description: 'Add break condition to prevent infinite loop',
        changes: [{
          filePath: '',
          range: location,
          oldCode: originalCode,
          newCode: fixedCode,
          reason: 'Infinite loops can hang the application',
        }],
        riskLevel: 'risky',
        estimatedSuccessRate: 0.6,
        explanation: 'while(true) loops must have a break condition. Review the logic and add appropriate exit conditions.',
        before: originalCode,
        after: fixedCode,
      }
    },
  },
  
  // Python 可变默认参数修复
  {
    id: 'python-mutable-default',
    name: 'Fix Mutable Default Argument',
    appliesTo: ['python_mutable_default'],
    generate: (context: FixContext): FixSuggestion => {
      const { code, issue } = context
      const { location } = issue
      
      const lines = code.split('\n')
      const line = lines[location.start.line - 1]
      const originalCode = line.trim()
      
      // 替换默认参数
      const fixedCode = originalCode.replace(/=\s*(\[[\]]|\{\})\s*([,)])/g, '=None$2')
      const additionalCode = `if ${fixedCode.match(/(\w+)\s*=\s*None/)?.[1] || 'arg'} is None:
    ${fixedCode.match(/(\w+)\s*=\s*None/)?.[1] || 'arg'} = ${originalCode.match(/=\s*(\[[\]]|\{\})/)?.[1] || '[]'}`
      
      return {
        id: `fix-${Date.now()}`,
        description: 'Replace mutable default with None and set inside function',
        changes: [{
          filePath: '',
          range: location,
          oldCode: originalCode,
          newCode: `${fixedCode}\n    ${additionalCode}`,
          reason: 'Mutable defaults are shared across all calls',
        }],
        riskLevel: 'safe',
        estimatedSuccessRate: 0.95,
        explanation: 'In Python, mutable default arguments are created once and shared. Use None and create a new object inside the function.',
        before: originalCode,
        after: fixedCode,
      }
    },
  },
  
  // Go Goroutine 循环修复
  {
    id: 'go-goroutine-loop',
    name: 'Pass Variable to Goroutine',
    appliesTo: ['go_goroutine_loop'],
    generate: (context: FixContext): FixSuggestion => {
      const { code, issue } = context
      const { location } = issue
      
      const lines = code.split('\n')
      const line = lines[location.start.line - 1]
      const originalCode = line.trim()
      
      // 修复：传递变量作为参数
      const fixedCode = originalCode.replace(
        /go\s+func\s*\(\s*\)\s*\{/,
        'go func(v ValueType) {'
      ).replace(/\}\(\)/, '}(v)')
      
      return {
        id: `fix-${Date.now()}`,
        description: 'Pass loop variable as parameter to goroutine',
        changes: [{
          filePath: '',
          range: location,
          oldCode: originalCode,
          newCode: fixedCode,
          reason: 'Capture variable value at goroutine creation time',
        }],
        riskLevel: 'moderate',
        estimatedSuccessRate: 0.85,
        explanation: 'Goroutines capture variables by reference. Pass the value as a parameter to capture it at creation time.',
        before: originalCode,
        after: fixedCode,
      }
    },
  },
  
  // Rust unwrap 修复
  {
    id: 'rust-unwrap-to-match',
    name: 'Replace unwrap with match',
    appliesTo: ['rust_unwrap'],
    generate: (context: FixContext): FixSuggestion => {
      const { code, issue } = context
      const { location } = issue
      
      const lines = code.split('\n')
      const line = lines[location.start.line - 1]
      const originalCode = line.trim()
      
      // 提取变量名
      const match = originalCode.match(/(\w+)\.unwrap\(\)/)
      if (match) {
        const varName = match[1]
        const fixedCode = `match ${varName} {
    Ok(value) => value,
    Err(e) => return Err(e.into()),
}`
        
        return {
          id: `fix-${Date.now()}`,
          description: 'Replace unwrap with proper error handling',
          changes: [{
            filePath: '',
            range: location,
            oldCode: originalCode,
            newCode: fixedCode,
            reason: 'Handle errors gracefully instead of panicking',
          }],
          riskLevel: 'safe',
          estimatedSuccessRate: 0.9,
          explanation: 'unwrap() panics on error. Use match or the ? operator for proper error handling.',
          before: originalCode,
          after: fixedCode,
        }
      }
      
      return {
        id: `fix-${Date.now()}`,
        description: 'Replace unwrap with proper error handling',
        changes: [{
          filePath: '',
          range: location,
          oldCode: originalCode,
          newCode: originalCode.replace('.unwrap()', '?'),
          reason: 'Use ? operator for error propagation',
        }],
        riskLevel: 'safe',
        estimatedSuccessRate: 0.85,
        explanation: 'The ? operator propagates errors instead of panicking.',
      }
    },
  },
]

/**
 * 修复建议生成器
 */
export class FixSuggester {
  private config: SuggesterConfig
  private analyzer: CodeAnalyzer
  private cache: Map<string, FixSuggestion[]> = new Map()

  constructor(config: Partial<SuggesterConfig> = {}) {
    this.config = {
      languages: ['typescript', 'javascript', 'python', 'go', 'rust'],
      enableCache: true,
      verbose: false,
      ...config,
    }
    this.analyzer = new CodeAnalyzer()
  }

  /**
   * 生成修复建议
   */
  async suggest(
    code: string,
    issues: Array<{ type: string; message: string; location: CodeRange; severity?: string }>,
    language: SupportedLanguage
  ): Promise<FixSuggestion[]> {
    const suggestions: FixSuggestion[] = []

    for (const issue of issues) {
      // 查找适用的模板
      const applicableTemplates = FIX_TEMPLATES.filter(t => 
        t.appliesTo.includes(issue.type)
      )

      for (const template of applicableTemplates) {
        const context: FixContext = {
          code,
          language,
          issue,
        }

        try {
          const suggestion = template.generate(context)
          suggestions.push(suggestion)
        } catch (error) {
          if (this.config.verbose) {
            console.error(`Error generating fix for ${template.name}:`, error)
          }
        }
      }
    }

    // 如果没有找到模板，生成通用建议
    if (suggestions.length === 0 && issues.length > 0) {
      suggestions.push(this.generateGenericSuggestion(issues[0], language))
    }

    // 按成功率和风险排序
    return suggestions.sort((a, b) => {
      // 风险优先
      const riskOrder = { safe: 0, moderate: 1, risky: 2 }
      if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
        return riskOrder[a.riskLevel] - riskOrder[b.riskLevel]
      }
      // 成功率优先
      return b.estimatedSuccessRate - a.estimatedSuccessRate
    })
  }

  /**
   * 生成通用建议
   */
  private generateGenericSuggestion(
    issue: { type: string; message: string; location: CodeRange },
    language: SupportedLanguage
  ): FixSuggestion {
    return {
      id: `fix-generic-${Date.now()}`,
      description: `Review and fix: ${issue.message}`,
      changes: [{
        filePath: '',
        range: issue.location,
        oldCode: '// Original code',
        newCode: '// TODO: Fix this issue',
        reason: issue.message,
      }],
      riskLevel: 'moderate',
      estimatedSuccessRate: 0.6,
      explanation: `This is a general suggestion. Please review the issue type "${issue.type}" and apply appropriate fixes.`,
    }
  }

  /**
   * 生成 Diff 格式
   */
  generateDiff(filePath: string, originalCode: string, changes: CodeChange[]): Diff {
    const lines1 = originalCode.split('\n')
    const lines2 = [...lines1]

    // 应用所有变更
    for (const change of changes) {
      const startLine = change.range.start.line - 1
      const newLines = change.newCode.split('\n')
      
      // 替换行
      lines2.splice(startLine, 1, ...newLines)
    }

    // 生成 unified diff
    const diff = this.computeUnifiedDiff(filePath, lines1, lines2)

    return {
      filePath,
      diff,
      stats: {
        additions: diff.split('\n').filter(l => l.startsWith('+')).length - 1,
        deletions: diff.split('\n').filter(l => l.startsWith('-')).length - 1,
        changes: changes.length,
      },
    }
  }

  /**
   * 计算统一 diff
   */
  private computeUnifiedDiff(filePath: string, oldLines: string[], newLines: string[]): string {
    const result: string[] = []
    result.push(`--- a/${filePath}`)
    result.push(`+++ b/${filePath}`)
    result.push('@@ -1,' + oldLines.length + ' +1,' + newLines.length + ' @@')

    // 简化的 diff 算法
    const maxLen = Math.max(oldLines.length, newLines.length)
    
    for (let i = 0; i < maxLen; i++) {
      const oldLine = oldLines[i]
      const newLine = newLines[i]

      if (oldLine === newLine) {
        result.push(' ' + (oldLine || ''))
      } else {
        if (oldLine !== undefined) {
          result.push('-' + oldLine)
        }
        if (newLine !== undefined) {
          result.push('+' + newLine)
        }
      }
    }

    return result.join('\n')
  }
}

// 默认实例
export const fixSuggester = new FixSuggester()