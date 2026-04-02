/**
 * React Compiler Diagnostics - Report Generator
 *
 * 生成各种格式的兼容性报告
 */

import { ScanResult, IncompatibilityReport, CompilerIssue } from './scanner'

export interface CompatibilityReport {
  format: 'json' | 'markdown' | 'html'
  generatedAt: string
  scanResult?: ScanResult
  summary: {
    totalFiles: number
    compatibleFiles: number
    incompatibleFiles: number
    compatibilityRate: number
  }
  details?: {
    highSeverityIssues: IncompatibilityReport[]
    mediumSeverityIssues: IncompatibilityReport[]
    lowSeverityIssues: IncompatibilityReport[]
  }
  recommendations: string[]
}

export interface ReportOptions {
  format?: 'json' | 'markdown' | 'html'
  includeDetails?: boolean
  includeMigrationGuide?: boolean
}

/**
 * 生成兼容性报告
 */
export function generateCompatibilityReport(
  scanResult: ScanResult | Promise<ScanResult>,
  options: ReportOptions = {}
): CompatibilityReport {
  // 处理异步扫描结果
  const isPromise = scanResult instanceof Promise
  const result = isPromise ? null : scanResult

  const { format = 'json', includeDetails = true } = options

  // 计算兼容性百分比
  const compatibilityRate = result ? (result.compatibleFiles / result.totalFiles) * 100 : 0

  // 生成建议
  const recommendations = generateRecommendations(result ?? undefined)

  const report: CompatibilityReport = {
    format,
    generatedAt: new Date().toISOString(),
    scanResult: result ?? undefined,
    summary: {
      totalFiles: result?.totalFiles || 0,
      compatibleFiles: result?.compatibleFiles || 0,
      incompatibleFiles: result?.incompatibleFiles || 0,
      compatibilityRate,
    },
    recommendations,
  }

  // 添加详细信息
  if (includeDetails && result) {
    report.details = {
      highSeverityIssues: result.reports.filter((r: IncompatibilityReport) =>
        r.issues.some((i: CompilerIssue) => i.severity === 'high')
      ),
      mediumSeverityIssues: result.reports.filter(
        (r: IncompatibilityReport) =>
          r.issues.some((i: CompilerIssue) => i.severity === 'medium') &&
          !r.issues.some((i: CompilerIssue) => i.severity === 'high')
      ),
      lowSeverityIssues: result.reports.filter(
        (r: IncompatibilityReport) =>
          r.issues.some((i: CompilerIssue) => i.severity === 'low') &&
          !r.issues.some((i: CompilerIssue) => i.severity === 'high' || i.severity === 'medium')
      ),
    }
  }

  return report
}

/**
 * 生成修复建议
 */
function generateRecommendations(scanResult?: ScanResult): string[] {
  if (!scanResult) return []

  const recommendations: string[] = []

  // 总体建议
  const compatibilityRate = (scanResult.compatibleFiles / scanResult.totalFiles) * 100

  if (compatibilityRate > 90) {
    recommendations.push('✅ 项目整体兼容性良好，可以逐步启用 React Compiler')
  } else if (compatibilityRate > 70) {
    recommendations.push('⚠️ 项目兼容性中等，建议先修复高优先级问题')
  } else {
    recommendations.push('❌ 项目兼容性较低，建议进行全面重构再启用')
  }

  // 按问题类型给出建议
  const issueTypes = Object.entries(scanResult.summary.byType)

  if (issueTypes.length > 0) {
    const mostCommonType = issueTypes.sort((a, b) => b[1] - a[1])[0]

    recommendations.push(`最常见的问题类型: "${mostCommonType[0]}" (${mostCommonType[1]} 处)`)
  }

  // 高严重程度问题建议
  const highSeverityCount = scanResult.summary.bySeverity.high || 0
  if (highSeverityCount > 0) {
    recommendations.push(`⚠️ 发现 ${highSeverityCount} 个高严重程度问题，需要优先修复`)
  }

  // 迁移建议
  recommendations.push('📋 建议优先处理高严重程度问题，然后逐步修复中低优先级问题')
  recommendations.push('🔄 可以使用组件级别的编译器开关，逐步迁移到 React Compiler')

  return recommendations
}

/**
 * 生成 Markdown 格式报告
 */
export function generateMarkdownReport(report: CompatibilityReport): string {
  const { summary, details, recommendations } = report

  const lines: string[] = []

  // 标题
  lines.push('# React Compiler 兼容性报告\n')
  lines.push(`生成时间: ${new Date(report.generatedAt).toLocaleString('zh-CN')}\n`)

  // 摘要
  lines.push('## 📊 摘要\n')
  lines.push(`- **总文件数**: ${summary.totalFiles}`)
  lines.push(
    `- **兼容文件**: ${summary.compatibleFiles} (${summary.compatibilityRate.toFixed(1)}%)`
  )
  lines.push(
    `- **不兼容文件**: ${summary.incompatibleFiles} (${(100 - summary.compatibilityRate).toFixed(1)}%)\n`
  )

  // 详细信息
  if (details) {
    lines.push('## 🔍 详细问题\n')

    // 高严重程度
    if (details.highSeverityIssues.length > 0) {
      lines.push('### 🔴 高严重程度问题\n')
      details.highSeverityIssues.forEach(report => {
        lines.push(
          `#### ${report.filePath}${report.componentName ? ` (${report.componentName})` : ''}\n`
        )
        report.issues.forEach(issue => {
          lines.push(`- **${issue.type}**: ${issue.message}`)
          if (issue.suggestion) {
            lines.push(`  - 建议: ${issue.suggestion}`)
          }
          lines.push('')
        })
      })
    }

    // 中严重程度
    if (details.mediumSeverityIssues.length > 0) {
      lines.push('### 🟡 中严重程度问题\n')
      details.mediumSeverityIssues.forEach(report => {
        lines.push(`#### ${report.filePath}\n`)
        report.issues.forEach(issue => {
          lines.push(`- **${issue.type}**: ${issue.message}`)
          if (issue.suggestion) {
            lines.push(`  - 建议: ${issue.suggestion}`)
          }
          lines.push('')
        })
      })
    }

    // 低严重程度
    if (details.lowSeverityIssues.length > 0) {
      lines.push('### 🟢 低严重程度问题\n')
      details.lowSeverityIssues.forEach(report => {
        lines.push(`#### ${report.filePath}\n`)
        report.issues.forEach(issue => {
          lines.push(`- **${issue.type}**: ${issue.message}`)
          if (issue.suggestion) {
            lines.push(`  - 建议: ${issue.suggestion}`)
          }
          lines.push('')
        })
      })
    }
  }

  // 建议
  lines.push('## 💡 建议\n')
  recommendations.forEach(rec => {
    lines.push(`- ${rec}`)
  })
  lines.push('')

  // 问题统计
  lines.push('## 📈 问题统计\n')
  const { byType, bySeverity } = report.scanResult?.summary || {
    byType: {},
    bySeverity: { high: 0, medium: 0, low: 0 },
  }

  lines.push('### 按类型统计\n')
  Object.entries(byType).forEach(([type, count]) => {
    lines.push(`- ${type}: ${count}`)
  })
  lines.push('')

  lines.push('### 按严重程度统计\n')
  lines.push(`- High: ${bySeverity.high}`)
  lines.push(`- Medium: ${bySeverity.medium}`)
  lines.push(`- Low: ${bySeverity.low}\n`)

  return lines.join('\n')
}

/**
 * 生成 HTML 格式报告
 */
export function generateHTMLReport(report: CompatibilityReport): string {
  const { summary, details, recommendations } = report

  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React Compiler 兼容性报告</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      border-bottom: 3px solid #61dafb;
      padding-bottom: 10px;
    }
    h2 {
      color: #555;
      margin-top: 30px;
    }
    h3 {
      color: #666;
      margin-top: 20px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    .summary-card {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      text-align: center;
    }
    .summary-card h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #666;
    }
    .summary-card .value {
      font-size: 32px;
      font-weight: bold;
      color: #333;
    }
    .summary-card .percentage {
      color: #666;
      font-size: 14px;
      margin-top: 5px;
    }
    .issue {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 10px 15px;
      margin: 10px 0;
      border-radius: 4px;
    }
    .issue.high {
      background: #f8d7da;
      border-left-color: #dc3545;
    }
    .issue.medium {
      background: #fff3cd;
      border-left-color: #ffc107;
    }
    .issue.low {
      background: #d4edda;
      border-left-color: #28a745;
    }
    .file-path {
      font-family: monospace;
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 13px;
    }
    .recommendations {
      background: #e7f3ff;
      border-left: 4px solid #2196f3;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
    }
    .recommendations ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .stat-item {
      display: flex;
      justify-content: space-between;
      background: #f8f9fa;
      padding: 10px 15px;
      border-radius: 4px;
    }
    .stat-label {
      color: #666;
    }
    .stat-value {
      font-weight: bold;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>React Compiler 兼容性报告</h1>
    <p>生成时间: ${new Date(report.generatedAt).toLocaleString('zh-CN')}</p>

    <h2>📊 摘要</h2>
    <div class="summary">
      <div class="summary-card">
        <h3>总文件数</h3>
        <div class="value">${summary.totalFiles}</div>
      </div>
      <div class="summary-card">
        <h3>兼容文件</h3>
        <div class="value">${summary.compatibleFiles}</div>
        <div class="percentage">${summary.compatibilityRate.toFixed(1)}%</div>
      </div>
      <div class="summary-card">
        <h3>不兼容文件</h3>
        <div class="value">${summary.incompatibleFiles}</div>
        <div class="percentage">${(100 - summary.compatibilityRate).toFixed(1)}%</div>
      </div>
    </div>

    ${
      details
        ? `
    <h2>🔍 详细问题</h2>
    ${
      details.highSeverityIssues.length > 0
        ? `
    <h3>🔴 高严重程度问题 (${details.highSeverityIssues.length})</h3>
    ${details.highSeverityIssues
      .map(
        report => `
      <div>
        <h4><span class="file-path">${report.filePath}</span>${report.componentName ? ` (${report.componentName})` : ''}</h4>
        ${report.issues
          .map(
            issue => `
          <div class="issue high">
            <strong>${issue.type}</strong>: ${issue.message}
            ${issue.suggestion ? `<br><em>建议: ${issue.suggestion}</em>` : ''}
          </div>
        `
          )
          .join('')}
      </div>
    `
      )
      .join('')}
    `
        : ''
    }

    ${
      details.mediumSeverityIssues.length > 0
        ? `
    <h3>🟡 中严重程度问题 (${details.mediumSeverityIssues.length})</h3>
    ${details.mediumSeverityIssues
      .map(
        report => `
      <div>
        <h4><span class="file-path">${report.filePath}</span></h4>
        ${report.issues
          .map(
            issue => `
          <div class="issue medium">
            <strong>${issue.type}</strong>: ${issue.message}
            ${issue.suggestion ? `<br><em>建议: ${issue.suggestion}</em>` : ''}
          </div>
        `
          )
          .join('')}
      </div>
    `
      )
      .join('')}
    `
        : ''
    }

    ${
      details.lowSeverityIssues.length > 0
        ? `
    <h3>🟢 低严重程度问题 (${details.lowSeverityIssues.length})</h3>
    ${details.lowSeverityIssues
      .map(
        report => `
      <div>
        <h4><span class="file-path">${report.filePath}</span></h4>
        ${report.issues
          .map(
            issue => `
          <div class="issue low">
            <strong>${issue.type}</strong>: ${issue.message}
            ${issue.suggestion ? `<br><em>建议: ${issue.suggestion}</em>` : ''}
          </div>
        `
          )
          .join('')}
      </div>
    `
      )
      .join('')}
    `
        : ''
    }
    `
        : ''
    }

    <h2>💡 建议</h2>
    <div class="recommendations">
      <ul>
        ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
    </div>

    <h2>📈 问题统计</h2>
    <div class="stat-grid">
      <div class="stat-item">
        <span class="stat-label">按类型</span>
        <span class="stat-value">${Object.keys(report.scanResult?.summary?.byType || {}).length}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">按严重程度</span>
        <span class="stat-value">${Object.values(report.scanResult?.summary?.bySeverity || { high: 0, medium: 0, low: 0 }).reduce((a, b) => a + b, 0)}</span>
      </div>
    </div>

    <h3>按类型统计</h3>
    <div class="stat-grid">
      ${Object.entries(report.scanResult?.summary?.byType || {})
        .map(
          ([type, count]) => `
        <div class="stat-item">
          <span class="stat-label">${type}</span>
          <span class="stat-value">${count}</span>
        </div>
      `
        )
        .join('')}
    </div>

    <h3>按严重程度统计</h3>
    <div class="stat-grid">
      <div class="stat-item">
        <span class="stat-label">High</span>
        <span class="stat-value">${report.scanResult?.summary?.bySeverity?.high || 0}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Medium</span>
        <span class="stat-value">${report.scanResult?.summary?.bySeverity?.medium || 0}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Low</span>
        <span class="stat-value">${report.scanResult?.summary?.bySeverity?.low || 0}</span>
      </div>
    </div>
  </div>
</body>
</html>
  `

  return html.trim()
}

/**
 * 转换报告为字符串
 */
export function reportToString(report: CompatibilityReport): string {
  switch (report.format) {
    case 'markdown':
      return generateMarkdownReport(report)
    case 'html':
      return generateHTMLReport(report)
    case 'json':
    default:
      return JSON.stringify(report, null, 2)
  }
}
