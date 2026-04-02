/**
 * React Compiler Migration Guide Generator
 *
 * 自动生成组件迁移指南
 */

import { IncompatibilityReport, CompilerIssue } from '../diagnostics/scanner'

export interface MigrationStep {
  order: number
  type: 'fix' | 'optimize' | 'test'
  description: string
  codeExample?: {
    before?: string
    after?: string
  }
  estimatedTime: string
  priority: 'low' | 'medium' | 'high'
}

export interface MigrationGuide {
  componentName: string
  filePath: string
  currentStatus: 'ready' | 'needs-fixes' | 'complex'
  steps: MigrationStep[]
  estimatedTotalTime: string
  riskLevel: 'low' | 'medium' | 'high'
  autoFixable: boolean
}

/**
 * 迁移指南生成器
 */
export class MigrationGuideGenerator {
  /**
   * 为组件生成迁移指南
   */
  generateGuide(report: IncompatibilityReport): MigrationGuide {
    const steps: MigrationStep[] = []
    let order = 1

    // 根据问题类型生成步骤
    for (const issue of report.issues) {
      const step = this.issueToStep(issue, order++)
      if (step) {
        steps.push(step)
      }
    }

    // 添加测试步骤
    steps.push({
      order: steps.length + 1,
      type: 'test',
      description: 'Run tests to verify component behavior after migration',
      estimatedTime: '10 min',
      priority: 'medium',
    })

    // 计算状态
    const currentStatus = this.determineStatus(report)
    const estimatedTotalTime = this.calculateTotalTime(steps)
    const riskLevel = this.determineRiskLevel(report)
    const autoFixable = report.issues.every(i => i.type === 'performance-warning')

    return {
      componentName: report.componentName || 'Unknown',
      filePath: report.filePath,
      currentStatus,
      steps,
      estimatedTotalTime,
      riskLevel,
      autoFixable,
    }
  }

  /**
   * 将问题转换为迁移步骤
   */
  private issueToStep(issue: CompilerIssue, order: number): MigrationStep | null {
    const stepMap: Record<string, MigrationStep> = {
      'unsupported-pattern': {
        order,
        type: 'fix',
        description: issue.message,
        estimatedTime: issue.severity === 'high' ? '30 min' : '15 min',
        priority: issue.severity as 'low' | 'medium' | 'high',
        codeExample: this.getCodeExample(issue),
      },
      'side-effect': {
        order,
        type: 'fix',
        description: issue.message,
        estimatedTime: '20 min',
        priority: 'medium',
      },
      'performance-warning': {
        order,
        type: 'optimize',
        description: issue.message,
        estimatedTime: '10 min',
        priority: 'low',
      },
    }

    return stepMap[issue.type] || null
  }

  /**
   * 获取代码示例
   */
  private getCodeExample(issue: CompilerIssue): { before?: string; after?: string } {
    if (issue.message.includes('ref.current')) {
      return {
        before: `const ref = useRef();
ref.current = value;`,
        after: `const ref = useRef();
useEffect(() => {
  ref.current = value;
}, [value]);`,
      }
    }

    if (issue.message.includes('dangerouslySetInnerHTML')) {
      return {
        before: `<div dangerouslySetInnerHTML={{ __html: html }} />`,
        after: `<div ref={element => {
  if (element) {
    element.innerHTML = DOMPurify.sanitize(html);
  }
}} />`,
      }
    }

    return {}
  }

  /**
   * 确定当前状态
   */
  private determineStatus(report: IncompatibilityReport): 'ready' | 'needs-fixes' | 'complex' {
    if (report.issues.length === 0) {
      return 'ready'
    }

    const highSeverityCount = report.issues.filter(i => i.severity === 'high').length
    if (highSeverityCount > 2) {
      return 'complex'
    }

    return 'needs-fixes'
  }

  /**
   * 计算总时间
   */
  private calculateTotalTime(steps: MigrationStep[]): string {
    const totalMinutes = steps.reduce((total, step) => {
      const match = step.estimatedTime.match(/(\d+)\s*min/)
      return total + (match ? parseInt(match[1]) : 10)
    }, 0)

    if (totalMinutes < 30) {
      return `${totalMinutes} min`
    } else if (totalMinutes < 60) {
      return `${totalMinutes} min`
    } else {
      const hours = Math.floor(totalMinutes / 60)
      const mins = totalMinutes % 60
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
    }
  }

  /**
   * 确定风险等级
   */
  private determineRiskLevel(report: IncompatibilityReport): 'low' | 'medium' | 'high' {
    if (report.issues.length === 0) return 'low'

    const hasHighSeverity = report.issues.some(i => i.severity === 'high')
    const hasManyIssues = report.issues.length > 5

    if (hasHighSeverity && hasManyIssues) return 'high'
    if (hasHighSeverity || hasManyIssues) return 'medium'
    return 'low'
  }

  /**
   * 生成 Markdown 格式的指南
   */
  generateMarkdown(guide: MigrationGuide): string {
    const lines: string[] = [
      `# Migration Guide: ${guide.componentName}`,
      '',
      `**File**: \`${guide.filePath}\``,
      `**Status**: ${guide.currentStatus}`,
      `**Estimated Time**: ${guide.estimatedTotalTime}`,
      `**Risk Level**: ${guide.riskLevel}`,
      '',
      '## Steps',
      '',
    ]

    for (const step of guide.steps) {
      lines.push(`### ${step.order}. ${step.description}`)
      lines.push(`- **Type**: ${step.type}`)
      lines.push(`- **Priority**: ${step.priority}`)
      lines.push(`- **Estimated Time**: ${step.estimatedTime}`)

      if (step.codeExample?.before || step.codeExample?.after) {
        lines.push('')
        if (step.codeExample?.before) {
          lines.push('**Before**:')
          lines.push('```jsx')
          lines.push(step.codeExample.before)
          lines.push('```')
        }
        if (step.codeExample?.after) {
          lines.push('')
          lines.push('**After**:')
          lines.push('```jsx')
          lines.push(step.codeExample.after)
          lines.push('```')
        }
      }
      lines.push('')
    }

    return lines.join('\n')
  }
}

/**
 * 批量生成迁移指南
 */
export function generateBatchGuides(reports: IncompatibilityReport[]): {
  guides: MigrationGuide[]
  summary: string
} {
  const generator = new MigrationGuideGenerator()
  const guides: MigrationGuide[] = []

  for (const report of reports) {
    guides.push(generator.generateGuide(report))
  }

  // 生成摘要
  const ready = guides.filter(g => g.currentStatus === 'ready').length
  const needsFixes = guides.filter(g => g.currentStatus === 'needs-fixes').length
  const complex = guides.filter(g => g.currentStatus === 'complex').length

  const summary = [
    '# Migration Summary',
    '',
    `- Ready for React Compiler: ${ready} components`,
    `- Need minor fixes: ${needsFixes} components`,
    `- Complex migration: ${complex} components`,
    '',
    `Total: ${guides.length} components analyzed`,
  ].join('\n')

  return { guides, summary }
}
