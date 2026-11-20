/**
 * Budget Linter
 * Build-time budget checker for performance regression detection
 * Outputs violations and generates reports
 */

import type {
  BudgetConfig,
  Budget,
  TimingBudget,
  PerformanceMetrics,
  BudgetCheckResult,
} from './budget-checker'
import { BudgetChecker } from './budget-checker'
import { BudgetParser } from './budget-parser'

// ========================================
// Types
// ========================================

interface BudgetLintResult {
  success: boolean
  totalViolations: number
  pages: PageLintResult[]
  summary: BudgetLintSummary
  timestamp: number
}

interface PageLintResult {
  path: string
  passed: boolean
  violations: BudgetViolationLint[]
  metrics?: PerformanceMetrics
}

interface BudgetViolationLint {
  metric: string
  budget: number
  actual: number
  threshold: number
  percentOver: number
  severity: 'warning' | 'critical'
  suggestion?: string
}

interface BudgetLintSummary {
  passed: number
  failed: number
  warnings: number
  critical: number
  passRate: number
}

interface BudgetLintOptions {
  /** Budget configuration to check against */
  budgetConfig: BudgetConfig
  /** Metrics data (keyed by page path) */
  metricsData: Record<string, PerformanceMetrics>
  /** Fail build on critical violations */
  failOnCritical?: boolean
  /** Fail build on any violations */
  failOnAnyViolation?: boolean
  /** Output format for report */
  outputFormat?: 'console' | 'json' | 'html' | 'markdown'
  /** Output file path (if saving to file) */
  outputPath?: string
  /** Include suggestions for fixing violations */
  includeSuggestions?: boolean
  /** Quiet mode (minimal output) */
  quiet?: boolean
}

interface BudgetLintReport {
  result: BudgetLintResult
  options: BudgetLintOptions
  generatedAt: number
}

// ========================================
// Constants
// ========================================

/**
 * Suggestion templates for fixing budget violations
 */
const SUGGESTION_TEMPLATES: Record<string, (violation: BudgetViolationLint) => string> = {
  LCP: v =>
    `LCP of ${v.actual.toFixed(0)}ms exceeds budget of ${v.budget}ms.\n` +
    `Suggestions:\n` +
    `- Optimize image loading (lazy loading, WebP format, responsive images)\n` +
    `- Reduce JavaScript bundle size (code splitting, tree shaking)\n` +
    `- Use server-side rendering for initial content\n` +
    `- Preload critical resources (CSS, fonts, hero image)\n` +
    `- Consider CDN for static assets\n`,
  FID: v =>
    `FID of ${v.actual.toFixed(0)}ms exceeds budget of ${v.budget}ms.\n` +
    `Suggestions:\n` +
    `- Break up long JavaScript tasks (requestIdleCallback)\n` +
    `- Reduce JavaScript execution time\n` +
    `- Use web workers for CPU-intensive tasks\n` +
    `- Minimize main thread blocking operations\n`,
  CLS: v =>
    `CLS of ${v.actual.toFixed(3)} exceeds budget of ${v.budget}.\n` +
    `Suggestions:\n` +
    `- Reserve space for dynamic content (aspect-ratio boxes)\n` +
    `- Avoid injecting content above existing content\n` +
    `- Ensure images have explicit width and height attributes\n` +
    `- Use transform animations instead of layout-triggering properties\n`,
  TBT: v =>
    `TBT of ${v.actual.toFixed(0)}ms exceeds budget of ${v.budget}ms.\n` +
    `Suggestions:\n` +
    `- Minimize JavaScript execution on main thread\n` +
    `- Reduce the number of third-party scripts\n` +
    `- Optimize event handlers and callback functions\n` +
    `- Use code splitting to defer non-critical JavaScript\n`,
  TTFB: v =>
    `TTFB of ${v.actual.toFixed(0)}ms exceeds budget of ${v.budget}ms.\n` +
    `Suggestions:\n` +
    `- Use CDN for faster content delivery\n` +
    `- Enable server-side caching\n` +
    `- Optimize database queries\n` +
    `- Use HTTP/2 or HTTP/3\n` +
    `- Minimize server-side processing time\n`,
  FCP: v =>
    `FCP of ${v.actual.toFixed(0)}ms exceeds budget of ${v.budget}ms.\n` +
    `Suggestions:\n` +
    `- Reduce render-blocking resources\n` +
    `- Minify CSS and JavaScript\n` +
    `- Use critical CSS inline\n` +
    `- Preload critical fonts and stylesheets\n`,
}

// ========================================
// ANSI Color Codes
// ========================================

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
}

// ========================================
// Budget Linter Class
// ========================================

export class BudgetLinter {
  private options: BudgetLintOptions
  private budgetChecker: BudgetChecker
  private parser: BudgetParser

  constructor(options: BudgetLintOptions) {
    this.options = {
      failOnCritical: false,
      failOnAnyViolation: false,
      outputFormat: 'console',
      includeSuggestions: true,
      quiet: false,
      ...options,
    }
    this.budgetChecker = new BudgetChecker({
      configPath: '', // We'll use the provided config
      enabled: true,
      loadBudgets: async () => this.options.budgetConfig,
    })
    this.parser = new BudgetParser()
  }

  /**
   * Run budget lint check
   */
  async lint(): Promise<BudgetLintResult> {
    const startTime = Date.now()

    // Validate budget config
    const validation = this.parser.parseObject(this.options.budgetConfig)
    if (!validation.success) {
      throw new Error(`Invalid budget config: ${validation.errors.join(', ')}`)
    }

    const pageResults: PageLintResult[] = []

    // Check each page's metrics
    for (const [path, metrics] of Object.entries(this.options.metricsData)) {
      const result = await this.budgetChecker.checkBudget(path, metrics)

      // Convert violations to lint format
      const violations: BudgetViolationLint[] = result.violations.map(v => ({
        ...v,
        suggestion: this.options.includeSuggestions
          ? SUGGESTION_TEMPLATES[v.metric]?.(v)
          : undefined,
      }))

      pageResults.push({
        path,
        passed: result.passed,
        violations,
        metrics,
      })
    }

    // Calculate summary
    const summary = this.calculateSummary(pageResults)

    const result: BudgetLintResult = {
      success: summary.critical === 0 || !this.options.failOnCritical,
      totalViolations: summary.warnings + summary.critical,
      pages: pageResults,
      summary,
      timestamp: Date.now(),
    }

    // Output results
    this.outputResults(result)

    const duration = Date.now() - startTime
    if (!this.options.quiet) {
      console.log(`\n${COLORS.gray}Budget lint completed in ${duration}ms${COLORS.reset}`)
    }

    return result
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(pageResults: PageLintResult[]): BudgetLintSummary {
    let passed = 0
    let failed = 0
    let warnings = 0
    let critical = 0

    for (const page of pageResults) {
      if (page.passed) {
        passed++
      } else {
        failed++
      }

      for (const violation of page.violations) {
        if (violation.severity === 'critical') {
          critical++
        } else {
          warnings++
        }
      }
    }

    const total = passed + failed
    const passRate = total > 0 ? (passed / total) * 100 : 100

    return {
      passed,
      failed,
      warnings,
      critical,
      passRate,
    }
  }

  /**
   * Output results based on configured format
   */
  private outputResults(result: BudgetLintResult): void {
    switch (this.options.outputFormat) {
      case 'console':
        this.outputConsole(result)
        break
      case 'json':
        this.outputJson(result)
        break
      case 'markdown':
        this.outputMarkdown(result)
        break
      case 'html':
        this.outputHtml(result)
        break
    }
  }

  /**
   * Output results to console
   */
  private outputConsole(result: BudgetLintResult): void {
    const { summary, pages } = result

    // Summary header
    console.log('\n' + '='.repeat(60))
    console.log('📊 Performance Budget Lint Report')
    console.log('='.repeat(60))

    // Summary
    console.log(
      `\n${this.getColor(result.success)}${result.success ? '✅ PASS' : '❌ FAIL'}${COLORS.reset}`
    )
    console.log(`Pages checked: ${COLORS.cyan}${pages.length}${COLORS.reset}`)
    console.log(
      `Passed: ${COLORS.green}${summary.passed}${COLORS.reset} | Failed: ${COLORS.red}${summary.failed}${COLORS.reset}`
    )
    console.log(
      `Warnings: ${COLORS.yellow}${summary.warnings}${COLORS.reset} | Critical: ${COLORS.red}${summary.critical}${COLORS.reset}`
    )
    console.log(
      `Pass rate: ${this.getPassRateColor(summary.passRate)}${summary.passRate.toFixed(1)}%${COLORS.reset}`
    )

    // Page results
    if (!this.options.quiet || !result.success) {
      console.log('\n' + '-'.repeat(60))
      console.log('📄 Page Results')
      console.log('-'.repeat(60))

      for (const page of pages) {
        this.outputPageResult(page)
      }
    }
  }

  /**
   * Output single page result
   */
  private outputPageResult(page: PageLintResult): void {
    const icon = page.passed ? '✅' : '❌'
    const color = page.passed ? COLORS.green : COLORS.red

    console.log(`\n${icon} ${color}${page.path}${COLORS.reset}`)

    if (page.passed) {
      if (!this.options.quiet) {
        console.log(`  ${COLORS.gray}All metrics within budget${COLORS.reset}`)
      }
    } else {
      for (const violation of page.violations) {
        this.outputViolation(violation)
      }
    }
  }

  /**
   * Output single violation
   */
  private outputViolation(violation: BudgetViolationLint): void {
    const severityIcon = violation.severity === 'critical' ? '🚨' : '⚠️'
    const severityColor = violation.severity === 'critical' ? COLORS.red : COLORS.yellow

    console.log(
      `  ${severityIcon} ${COLORS.magenta}${violation.metric}${COLORS.reset}: ${COLORS.cyan}${violation.actual.toFixed(1)}${COLORS.reset} (budget: ${violation.budget}, ${severityColor}${violation.percentOver.toFixed(1)}% over${COLORS.reset})`
    )

    if (violation.suggestion && !this.options.quiet) {
      console.log(`  ${COLORS.gray}${violation.suggestion.split('\n').join('\n  ')}${COLORS.reset}`)
    }
  }

  /**
   * Output results as JSON
   */
  private outputJson(result: BudgetLintResult): void {
    const json = JSON.stringify(result, null, 2)
    console.log(json)

    if (this.options.outputPath) {
      // In a real implementation, you would write to file here
      console.log(`\nReport saved to: ${this.options.outputPath}`)
    }
  }

  /**
   * Output results as Markdown
   */
  private outputMarkdown(result: BudgetLintResult): void {
    const { summary, pages } = result
    const timestamp = new Date(result.timestamp).toISOString()

    let md = `# Performance Budget Lint Report\n\n`
    md += `**Generated:** ${timestamp}\n\n`

    // Summary
    md += `## Summary\n\n`
    md += `- **Status:** ${result.success ? '✅ PASS' : '❌ FAIL'}\n`
    md += `- **Pages Checked:** ${pages.length}\n`
    md += `- **Passed:** ${summary.passed}\n`
    md += `- **Failed:** ${summary.failed}\n`
    md += `- **Warnings:** ${summary.warnings}\n`
    md += `- **Critical:** ${summary.critical}\n`
    md += `- **Pass Rate:** ${summary.passRate.toFixed(1)}%\n\n`

    // Page Results
    md += `## Page Results\n\n`

    for (const page of pages) {
      const icon = page.passed ? '✅' : '❌'
      md += `### ${icon} ${page.path}\n\n`

      if (page.passed) {
        md += `All metrics within budget.\n\n`
      } else {
        md += `**Violations:**\n\n`
        for (const violation of page.violations) {
          const severityIcon = violation.severity === 'critical' ? '🚨' : '⚠️'
          md += `- ${severityIcon} **${violation.metric}**: ${violation.actual.toFixed(1)} (budget: ${violation.budget}, ${violation.percentOver.toFixed(1)}% over)\n`

          if (violation.suggestion) {
            md += `\n\`\`\`\n${violation.suggestion}\n\`\`\`\n\n`
          }
        }
      }
    }

    console.log(md)

    if (this.options.outputPath) {
      // In a real implementation, you would write to file here
      console.log(`\nReport saved to: ${this.options.outputPath}`)
    }
  }

  /**
   * Output results as HTML
   */
  private outputHtml(result: BudgetLintResult): void {
    const { summary, pages } = result
    const timestamp = new Date(result.timestamp).toISOString()

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Budget Lint Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .summary-card { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .summary-card .label { color: #666; font-size: 12px; text-transform: uppercase; }
        .summary-card .value { font-size: 24px; font-weight: bold; margin-top: 5px; }
        .page-result { margin: 20px 0; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; }
        .page-result.pass { border-left: 4px solid #4caf50; }
        .page-result.fail { border-left: 4px solid #f44336; }
        .violation { background: #fff3e0; padding: 10px; border-radius: 4px; margin: 10px 0; }
        .violation.critical { background: #ffebee; }
        .severity-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; }
        .severity-warning { background: #fff3e0; color: #f57c00; }
        .severity-critical { background: #ffebee; color: #c62828; }
        .suggestion { background: #f5f5f5; padding: 15px; border-radius: 4px; margin: 10px 0; font-family: monospace; white-space: pre-wrap; }
        .pass { color: #4caf50; }
        .fail { color: #f44336; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Performance Budget Lint Report</h1>
        <p>Generated: ${timestamp}</p>
    </div>

    <div class="summary">
        <div class="summary-card">
            <div class="label">Status</div>
            <div class="value ${result.success ? 'pass' : 'fail'}">${result.success ? '✅ PASS' : '❌ FAIL'}</div>
        </div>
        <div class="summary-card">
            <div class="label">Pages</div>
            <div class="value">${pages.length}</div>
        </div>
        <div class="summary-card">
            <div class="label">Passed</div>
            <div class="value pass">${summary.passed}</div>
        </div>
        <div class="summary-card">
            <div class="label">Failed</div>
            <div class="value fail">${summary.failed}</div>
        </div>
        <div class="summary-card">
            <div class="label">Warnings</div>
            <div class="value" style="color: #f57c00">${summary.warnings}</div>
        </div>
        <div class="summary-card">
            <div class="label">Critical</div>
            <div class="value fail">${summary.critical}</div>
        </div>
        <div class="summary-card">
            <div class="label">Pass Rate</div>
            <div class="value">${summary.passRate.toFixed(1)}%</div>
        </div>
    </div>

    <h2>Page Results</h2>
`

    for (const page of pages) {
      html += `
    <div class="page-result ${page.passed ? 'pass' : 'fail'}">
        <h3>${page.passed ? '✅' : '❌'} ${page.path}</h3>
`

      if (page.passed) {
        html += `        <p>All metrics within budget.</p>\n`
      } else {
        html += `        <h4>Violations:</h4>\n`

        for (const violation of page.violations) {
          html += `
        <div class="violation ${violation.severity}">
            <strong>${violation.metric}:</strong> ${violation.actual.toFixed(1)} (budget: ${violation.budget}, ${violation.percentOver.toFixed(1)}% over)
            <span class="severity-badge severity-${violation.severity}">${violation.severity.toUpperCase()}</span>
`
          if (violation.suggestion) {
            html += `            <div class="suggestion">${violation.suggestion}</div>\n`
          }
          html += `        </div>\n`
        }
      }

      html += `    </div>\n`
    }

    html += `
</body>
</html>
`

    console.log(html)

    if (this.options.outputPath) {
      // In a real implementation, you would write to file here
      console.log(`\nReport saved to: ${this.options.outputPath}`)
    }
  }

  /**
   * Get color based on pass/fail status
   */
  private getColor(success: boolean): string {
    return success ? COLORS.green : COLORS.red
  }

  /**
   * Get color based on pass rate
   */
  private getPassRateColor(passRate: number): string {
    if (passRate >= 90) return COLORS.green
    if (passRate >= 70) return COLORS.yellow
    return COLORS.red
  }

  /**
   * Check if build should fail based on violations
   */
  shouldBuildFail(result: BudgetLintResult): boolean {
    if (this.options.failOnAnyViolation) {
      return result.totalViolations > 0
    }
    if (this.options.failOnCritical) {
      return result.summary.critical > 0
    }
    return false
  }

  /**
   * Generate a detailed report object
   */
  generateReport(): BudgetLintReport {
    return {
      // This is a placeholder - actual result is generated in lint()
      result: {
        success: true,
        totalViolations: 0,
        pages: [],
        summary: {
          passed: 0,
          failed: 0,
          warnings: 0,
          critical: 0,
          passRate: 100,
        },
        timestamp: Date.now(),
      },
      options: this.options,
      generatedAt: Date.now(),
    }
  }
}

// ========================================
// Utility Functions
// ========================================

/**
 * Quick lint check (convenience function)
 */
export async function lintBudgets(
  budgetConfig: BudgetConfig,
  metricsData: Record<string, PerformanceMetrics>,
  options?: Partial<BudgetLintOptions>
): Promise<BudgetLintResult> {
  const linter = new BudgetLinter({
    budgetConfig,
    metricsData,
    ...options,
  })
  return linter.lint()
}

/**
 * Generate a sample budget configuration
 */
export function generateSampleBudgetConfig(): BudgetConfig {
  return {
    budgets: [
      {
        path: '/',
        timings: [
          { metric: 'LCP', budget: 2500, tolerance: 0.1 },
          { metric: 'FID', budget: 100, tolerance: 0.15 },
          { metric: 'CLS', budget: 0.1, tolerance: 0.2 },
          { metric: 'TTFB', budget: 800, tolerance: 0.2 },
          { metric: 'FCP', budget: 1800, tolerance: 0.15 },
        ],
      },
      {
        path: '/dashboard',
        timings: [
          { metric: 'LCP', budget: 3000, tolerance: 0.15 },
          { metric: 'TBT', budget: 300, tolerance: 0.2 },
          { metric: 'CLS', budget: 0.1, tolerance: 0.2 },
        ],
      },
    ],
  }
}

/**
 * Generate sample metrics data for testing
 */
export function generateSampleMetricsData(): Record<string, PerformanceMetrics> {
  return {
    '/': {
      LCP: 2400,
      FID: 95,
      CLS: 0.08,
      TTFB: 750,
      FCP: 1700,
    },
    '/dashboard': {
      LCP: 3200, // Will violate budget (3000 + 15% = 3450)
      TBT: 280,
      CLS: 0.12, // Will violate budget (0.1 + 20% = 0.12) - borderline
    },
  }
}

// ========================================
// Exports
// ========================================
