/**
 * React Compiler Diagnostics - Component Scanner
 *
 * 扫描组件并检测 React Compiler 兼容性问题
 */

import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

export interface CompilerIssue {
  type: 'unsupported-pattern' | 'side-effect' | 'performance-warning' | 'error'
  message: string
  line?: number
  column?: number
  suggestion?: string
  severity: 'low' | 'medium' | 'high'
}

export interface IncompatibilityReport {
  filePath: string
  componentName?: string
  issues: CompilerIssue[]
  canCompile: boolean
  estimatedEffort: 'none' | 'low' | 'medium' | 'high'
}

export interface ScanResult {
  totalFiles: number
  compatibleFiles: number
  incompatibleFiles: number
  reports: IncompatibilityReport[]
  summary: {
    byType: Record<string, number>
    bySeverity: Record<'low' | 'medium' | 'high', number>
  }
}

/**
 * 不兼容的模式列表
 */
const INCOMPATIBLE_PATTERNS = [
  {
    pattern: /\bref\.current\s*=/,
    type: 'unsupported-pattern' as const,
    message: 'Direct ref.current assignment is not supported by React Compiler',
    suggestion: 'Use useRef with a callback or state instead',
    severity: 'high' as const,
  },
  {
    pattern: /\bdangerouslySetInnerHTML\b/,
    type: 'unsupported-pattern' as const,
    message: 'dangerouslySetInnerHTML is not supported',
    suggestion: 'Use a safe HTML sanitization library like DOMPurify',
    severity: 'medium' as const,
  },
  {
    pattern: /\bcreateRef\b/,
    type: 'unsupported-pattern' as const,
    message: 'createRef in function components may cause issues',
    suggestion: 'Use useRef hook instead',
    severity: 'medium' as const,
  },
  {
    pattern: /\bfindDOMNode\b/,
    type: 'unsupported-pattern' as const,
    message: 'findDOMNode is deprecated and not supported',
    suggestion: 'Use ref callbacks or useRef instead',
    severity: 'high' as const,
  },
  {
    pattern: /\bstring\s+ref\b/,
    type: 'unsupported-pattern' as const,
    message: 'String refs are deprecated',
    suggestion: 'Use callback refs or useRef',
    severity: 'high' as const,
  },
]

/**
 * 性能警告模式
 */
const PERFORMANCE_WARNINGS = [
  {
    pattern: /\.map\(.*=>\s*\(.*\.map\(/s,
    message: 'Nested .map() may cause performance issues',
    suggestion: 'Consider flattening the data structure or using useMemo',
    severity: 'low' as const,
  },
  {
    pattern: /useEffect\([^,]*,\s*\[\]\s*\)[\s\S]*?set[A-Z]/,
    message: 'State update in empty deps array - ensure intentional',
    suggestion: 'Verify if this effect should run on every render or specific changes',
    severity: 'low' as const,
  },
  {
    pattern: /\.filter\(.*\.filter\(/,
    message: 'Chained filters may impact performance',
    suggestion: 'Consider combining filters or using a single pass',
    severity: 'low' as const,
  },
]

export class ComponentScanner {
  private projectRoot: string

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot
  }

  /**
   * 扫描所有组件
   */
  async scanAllComponents(): Promise<ScanResult> {
    const componentFiles = await this.findComponentFiles()
    const reports: IncompatibilityReport[] = []

    for (const file of componentFiles) {
      const report = await this.scanFile(file)
      reports.push(report)
    }

    return this.generateSummary(reports, componentFiles.length)
  }

  /**
   * 查找所有组件文件
   */
  private async findComponentFiles(): Promise<string[]> {
    const patterns = ['src/**/*.tsx', 'src/**/*.jsx']

    const files = await glob(patterns, {
      cwd: this.projectRoot,
      ignore: ['node_modules/**', '**/*.test.tsx', '**/*.spec.tsx', '**/__tests__/**'],
    })

    return files.map(f => path.join(this.projectRoot, f))
  }

  /**
   * 扫描单个文件
   */
  async scanFile(filePath: string): Promise<IncompatibilityReport> {
    const content = await fs.promises.readFile(filePath, 'utf-8')
    const issues: CompilerIssue[] = []

    // 检测不兼容模式
    for (const { pattern, type, message, suggestion, severity } of INCOMPATIBLE_PATTERNS) {
      const matches = content.match(pattern)
      if (matches) {
        const line = this.findLineNumber(content, matches[0])
        issues.push({
          type,
          message,
          line,
          suggestion,
          severity,
        })
      }
    }

    // 检测性能警告
    for (const { pattern, message, suggestion, severity } of PERFORMANCE_WARNINGS) {
      const matches = content.match(pattern)
      if (matches) {
        const line = this.findLineNumber(content, matches[0])
        issues.push({
          type: 'performance-warning',
          message,
          line,
          suggestion,
          severity,
        })
      }
    }

    // 检测第三方库副作用
    const sideEffectIssues = this.detectThirdPartySideEffects(content)
    issues.push(...sideEffectIssues)

    // 提取组件名称
    const componentName = this.extractComponentName(content)

    // 计算编译难度
    const canCompile = !issues.some(i => i.severity === 'high')
    const estimatedEffort = this.calculateEffort(issues)

    return {
      filePath: path.relative(this.projectRoot, filePath),
      componentName,
      issues,
      canCompile,
      estimatedEffort,
    }
  }

  /**
   * 检测第三方库副作用
   */
  private detectThirdPartySideEffects(content: string): CompilerIssue[] {
    const issues: CompilerIssue[] = []

    // 检测可能引起副作用的模式
    const sideEffectPatterns = [
      {
        pattern: /window\.[a-zA-Z]+\s*=/,
        message: 'Direct window property assignment may cause side effects',
        suggestion: 'Use useEffect to handle window operations',
      },
      {
        pattern: /document\.[a-zA-Z]+\s*=/,
        message: 'Direct document manipulation may cause side effects',
        suggestion: 'Use React refs and effects for DOM operations',
      },
      {
        pattern: /localStorage\.(setItem|getItem)/,
        message: 'localStorage access should be wrapped in useEffect',
        suggestion: 'Move localStorage operations to useEffect',
      },
    ]

    for (const { pattern, message, suggestion } of sideEffectPatterns) {
      if (pattern.test(content)) {
        issues.push({
          type: 'side-effect',
          message,
          suggestion,
          severity: 'medium',
        })
      }
    }

    return issues
  }

  /**
   * 查找行号
   */
  private findLineNumber(content: string, search: string): number {
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(search)) {
        return i + 1
      }
    }
    return 1
  }

  /**
   * 提取组件名称
   */
  private extractComponentName(content: string): string | undefined {
    const match = content.match(/(?:function|const)\s+([A-Z][a-zA-Z0-9]*)\s*[=(]/)
    return match ? match[1] : undefined
  }

  /**
   * 计算修复难度
   */
  private calculateEffort(issues: CompilerIssue[]): 'none' | 'low' | 'medium' | 'high' {
    if (issues.length === 0) return 'none'

    const hasHigh = issues.some(i => i.severity === 'high')
    const hasMedium = issues.some(i => i.severity === 'medium')

    if (hasHigh) return 'high'
    if (hasMedium && issues.length > 3) return 'medium'
    if (hasMedium || issues.length > 2) return 'low'
    return 'low'
  }

  /**
   * 生成摘要
   */
  private generateSummary(reports: IncompatibilityReport[], totalFiles: number): ScanResult {
    const compatibleFiles = reports.filter(r => r.canCompile).length
    const incompatibleFiles = totalFiles - compatibleFiles

    const byType: Record<string, number> = {}
    const bySeverity: Record<'low' | 'medium' | 'high', number> = { low: 0, medium: 0, high: 0 }

    for (const report of reports) {
      for (const issue of report.issues) {
        byType[issue.type] = (byType[issue.type] || 0) + 1
        bySeverity[issue.severity]++
      }
    }

    return {
      totalFiles,
      compatibleFiles,
      incompatibleFiles,
      reports,
      summary: { byType, bySeverity },
    }
  }
}

/**
 * 快速扫描函数
 */
export async function quickScan(projectRoot: string): Promise<ScanResult> {
  const scanner = new ComponentScanner(projectRoot)
  return scanner.scanAllComponents()
}
