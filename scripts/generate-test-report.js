#!/usr/bin/env node
/**
 * @fileoverview v1.9.1 测试报告生成器
 * @description 生成详细的测试报告，包括覆盖率、性能指标等
 */

const fs = require('fs')
const path = require('path')

// 报告输出目录
const REPORT_DIR = path.join(process.cwd(), 'test-results', 'reports')
const COVERAGE_DIR = path.join(process.cwd(), 'coverage')

// 确保目录存在
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true })
}

/**
 * 解析 Playwright 测试结果
 */
function parsePlaywrightResults() {
  const resultsPath = path.join(process.cwd(), 'test-results', 'v191-test-results.json')

  if (!fs.existsSync(resultsPath)) {
    console.warn('Playwright results not found:', resultsPath)
    return null
  }

  try {
    return JSON.parse(fs.readFileSync(resultsPath, 'utf8'))
  } catch (e) {
    console.error('Failed to parse Playwright results:', e)
    return null
  }
}

/**
 * 解析覆盖率报告
 */
function parseCoverageResults() {
  const coveragePath = path.join(COVERAGE_DIR, 'coverage-summary.json')

  if (!fs.existsSync(coveragePath)) {
    console.warn('Coverage results not found:', coveragePath)
    return null
  }

  try {
    return JSON.parse(fs.readFileSync(coveragePath, 'utf8'))
  } catch (e) {
    console.error('Failed to parse coverage results:', e)
    return null
  }
}

/**
 * 计算测试统计
 */
function calculateStats(playwrightResults, coverageResults) {
  const stats = {
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      passRate: 0,
    },
    suites: {},
    coverage: null,
    performance: {
      avgDuration: 0,
      maxDuration: 0,
      minDuration: Infinity,
      slowTests: [],
    },
    errors: [],
  }

  if (playwrightResults) {
    // 处理每个测试结果
    for (const suite of playwrightResults.suites || []) {
      for (const spec of suite.specs || []) {
        stats.summary.total++

        if (spec.ok) {
          stats.summary.passed++
        } else {
          stats.summary.failed++
          stats.errors.push({
            title: spec.title,
            file: spec.file,
            error: spec.error?.message || 'Unknown error',
          })
        }

        if (spec.skipped) {
          stats.summary.skipped++
        }

        stats.summary.duration += spec.duration || 0

        // 收集慢测试
        if (spec.duration > 10000) {
          stats.performance.slowTests.push({
            title: spec.title,
            duration: spec.duration,
          })
        }
      }
    }

    stats.summary.passRate = (stats.summary.passed / stats.summary.total) * 100
    stats.performance.avgDuration = stats.summary.duration / stats.summary.total

    if (stats.performance.slowTests.length > 0) {
      stats.performance.maxDuration = Math.max(...stats.performance.slowTests.map((t) => t.duration))
    }
  }

  if (coverageResults) {
    stats.coverage = {
      lines: coverageResults.total.lines.pct,
      statements: coverageResults.total.statements.pct,
      branches: coverageResults.total.branches.pct,
      functions: coverageResults.total.functions.pct,
    }
  }

  return stats
}

/**
 * 生成 Markdown 报告
 */
function generateMarkdownReport(stats) {
  const lines = [
    '# v1.9.1 E2E 测试报告',
    '',
    `生成时间: ${new Date().toLocaleString('zh-CN')}`,
    '',
    '## 📊 测试概览',
    '',
    '| 指标 | 值 |',
    '|------|-----|',
    `| 总测试数 | ${stats.summary.total} |`,
    `| 通过 | ✅ ${stats.summary.passed} |`,
    `| 失败 | ❌ ${stats.summary.failed} |`,
    `| 跳过 | ⏭️ ${stats.summary.skipped} |`,
    `| 通过率 | ${stats.summary.passRate.toFixed(2)}% |`,
    `| 总耗时 | ${(stats.summary.duration / 1000).toFixed(2)}s |`,
    '',
  ]

  // 覆盖率
  if (stats.coverage) {
    lines.push('## 📈 代码覆盖率', '', '| 类型 | 覆盖率 |', '|------|--------|')

    const coverageItems = [
      { name: '行覆盖率', value: stats.coverage.lines },
      { name: '语句覆盖率', value: stats.coverage.statements },
      { name: '分支覆盖率', value: stats.coverage.branches },
      { name: '函数覆盖率', value: stats.coverage.functions },
    ]

    for (const item of coverageItems) {
      const emoji = item.value >= 80 ? '✅' : item.value >= 60 ? '⚠️' : '❌'
      lines.push(`| ${item.name} | ${emoji} ${item.value.toFixed(2)}% |`)
    }

    lines.push('')
  }

  // 性能指标
  lines.push('## ⏱️ 性能指标', '')
  lines.push(`- 平均测试耗时: ${stats.performance.avgDuration.toFixed(2)}ms`)

  if (stats.performance.slowTests.length > 0) {
    lines.push(`- 慢测试数量: ${stats.performance.slowTests.length}`)
    lines.push('')
    lines.push('### 慢测试列表', '')
    lines.push('| 测试名称 | 耗时 |')
    lines.push('|----------|------|')

    for (const test of stats.performance.slowTests.slice(0, 10)) {
      lines.push(`| ${test.title} | ${(test.duration / 1000).toFixed(2)}s |`)
    }
    lines.push('')
  }

  // 错误列表
  if (stats.errors.length > 0) {
    lines.push('## ❌ 失败的测试', '')

    for (const error of stats.errors) {
      lines.push(`### ${error.title}`, '')
      lines.push(`- 文件: \`${error.file}\``)
      lines.push(`- 错误: \`${error.error}\``)
      lines.push('')
    }
  }

  // 验收标准检查
  lines.push('## ✅ 验收标准', '')
  lines.push('| 标准 | 目标 | 实际 | 状态 |')
  lines.push('|------|------|------|------|')

  const checks = [
    {
      name: '测试通过率',
      target: '≥ 95%',
      actual: `${stats.summary.passRate.toFixed(2)}%`,
      pass: stats.summary.passRate >= 95,
    },
    {
      name: '代码覆盖率',
      target: '≥ 80%',
      actual: stats.coverage ? `${stats.coverage.lines.toFixed(2)}%` : 'N/A',
      pass: stats.coverage ? stats.coverage.lines >= 80 : false,
    },
    {
      name: '平均测试耗时',
      target: '< 500ms',
      actual: `${stats.performance.avgDuration.toFixed(2)}ms`,
      pass: stats.performance.avgDuration < 500,
    },
  ]

  for (const check of checks) {
    const status = check.pass ? '✅ 通过' : '❌ 未通过'
    lines.push(`| ${check.name} | ${check.target} | ${check.actual} | ${status} |`)
  }

  lines.push('')

  return lines.join('\n')
}

/**
 * 生成 JSON 报告
 */
function generateJsonReport(stats) {
  return JSON.stringify(
    {
      version: '1.9.1',
      timestamp: new Date().toISOString(),
      summary: stats.summary,
      coverage: stats.coverage,
      performance: stats.performance,
      errors: stats.errors,
      checks: {
        passRate: stats.summary.passRate >= 95,
        coverage: stats.coverage ? stats.coverage.lines >= 80 : false,
        performance: stats.performance.avgDuration < 500,
      },
    },
    null,
    2
  )
}

/**
 * 生成 HTML 报告
 */
function generateHtmlReport(stats) {
  const passRateClass = stats.summary.passRate >= 95 ? 'success' : 'danger'
  const coverageClass = stats.coverage && stats.coverage.lines >= 80 ? 'success' : 'warning'

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>v1.9.1 E2E 测试报告</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; margin-bottom: 20px; }
    h2 { color: #555; margin-bottom: 15px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
    .stat-item { text-align: center; padding: 15px; background: #f9f9f9; border-radius: 8px; }
    .stat-value { font-size: 2em; font-weight: bold; color: #333; }
    .stat-label { color: #666; margin-top: 5px; }
    .success { color: #22c55e; }
    .warning { color: #f59e0b; }
    .danger { color: #ef4444; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f5f5f5; font-weight: 600; }
    .progress-bar { height: 20px; background: #eee; border-radius: 10px; overflow: hidden; }
    .progress-fill { height: 100%; transition: width 0.3s ease; }
    .progress-fill.success { background: #22c55e; }
    .progress-fill.warning { background: #f59e0b; }
    .progress-fill.danger { background: #ef4444; }
    .error-list { max-height: 300px; overflow-y: auto; }
    .error-item { padding: 10px; background: #fef2f2; border-radius: 4px; margin-bottom: 10px; }
    .error-title { font-weight: 600; color: #ef4444; }
    .error-message { color: #666; font-size: 0.9em; margin-top: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>v1.9.1 E2E 测试报告</h1>
      <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
    </div>

    <div class="card">
      <h2>📊 测试概览</h2>
      <div class="stats">
        <div class="stat-item">
          <div class="stat-value">${stats.summary.total}</div>
          <div class="stat-label">总测试数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value success">${stats.summary.passed}</div>
          <div class="stat-label">通过</div>
        </div>
        <div class="stat-item">
          <div class="stat-value danger">${stats.summary.failed}</div>
          <div class="stat-label">失败</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.summary.passRate.toFixed(1)}%</div>
          <div class="stat-label">通过率</div>
        </div>
      </div>
      <div class="progress-bar" style="margin-top: 20px;">
        <div class="progress-fill ${passRateClass}" style="width: ${stats.summary.passRate}%"></div>
      </div>
    </div>

    ${
      stats.coverage
        ? `
    <div class="card">
      <h2>📈 代码覆盖率</h2>
      <div class="stats">
        <div class="stat-item">
          <div class="stat-value ${coverageClass}">${stats.coverage.lines.toFixed(1)}%</div>
          <div class="stat-label">行覆盖率</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.coverage.statements.toFixed(1)}%</div>
          <div class="stat-label">语句覆盖率</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.coverage.branches.toFixed(1)}%</div>
          <div class="stat-label">分支覆盖率</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.coverage.functions.toFixed(1)}%</div>
          <div class="stat-label">函数覆盖率</div>
        </div>
      </div>
    </div>
    `
        : ''
    }

    ${
      stats.errors.length > 0
        ? `
    <div class="card">
      <h2>❌ 失败的测试 (${stats.errors.length})</h2>
      <div class="error-list">
        ${stats.errors
          .map(
            (error) => `
          <div class="error-item">
            <div class="error-title">${error.title}</div>
            <div class="error-message">${error.file}</div>
            <div class="error-message">${error.error}</div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
    `
        : ''
    }
  </div>
</body>
</html>
  `.trim()
}

// 主函数
function main() {
  console.log('正在生成 v1.9.1 测试报告...')

  const playwrightResults = parsePlaywrightResults()
  const coverageResults = parseCoverageResults()
  const stats = calculateStats(playwrightResults, coverageResults)

  // 生成各种格式的报告
  const markdownReport = generateMarkdownReport(stats)
  const jsonReport = generateJsonReport(stats)
  const htmlReport = generateHtmlReport(stats)

  // 保存报告
  fs.writeFileSync(path.join(REPORT_DIR, 'v191-report.md'), markdownReport)
  fs.writeFileSync(path.join(REPORT_DIR, 'v191-report.json'), jsonReport)
  fs.writeFileSync(path.join(REPORT_DIR, 'v191-report.html'), htmlReport)

  console.log('\n报告已生成:')
  console.log(`  - Markdown: ${path.join(REPORT_DIR, 'v191-report.md')}`)
  console.log(`  - JSON: ${path.join(REPORT_DIR, 'v191-report.json')}`)
  console.log(`  - HTML: ${path.join(REPORT_DIR, 'v191-report.html')}`)

  // 输出摘要
  console.log('\n测试摘要:')
  console.log(`  - 总测试数: ${stats.summary.total}`)
  console.log(`  - 通过: ${stats.summary.passed}`)
  console.log(`  - 失败: ${stats.summary.failed}`)
  console.log(`  - 通过率: ${stats.summary.passRate.toFixed(2)}%`)

  if (stats.coverage) {
    console.log(`  - 代码覆盖率: ${stats.coverage.lines.toFixed(2)}%`)
  }

  // 检查验收标准
  const checks = [
    { name: '通过率', pass: stats.summary.passRate >= 95 },
    { name: '覆盖率', pass: stats.coverage ? stats.coverage.lines >= 80 : false },
  ]

  const allPassed = checks.every((c) => c.pass)

  if (!allPassed) {
    console.log('\n⚠️ 部分验收标准未通过:')
    checks
      .filter((c) => !c.pass)
      .forEach((c) => {
        console.log(`  - ${c.name}: 未达标`)
      })
    process.exit(1)
  } else {
    console.log('\n✅ 所有验收标准已通过!')
    process.exit(0)
  }
}

main()
