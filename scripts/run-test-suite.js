#!/usr/bin/env node

/**
 * Test Suite Runner
 * Runs all tests and generates comprehensive reports
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const OUTPUT_DIR = 'test-reports'
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-')

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

console.log('🧪 Running 7zi-Project E2E Test Suite')
console.log('='.repeat(60))
console.log(`Started at: ${new Date().toLocaleString()}\n`)

// Test categories
const testCategories = [
  {
    name: 'Unit Tests (Vitest)',
    command: 'npx vitest run --reporter=json --reportFile=coverage/test-results.json',
    description: 'Unit tests for components, hooks, and utilities',
  },
  {
    name: 'API Tests',
    command: 'npx vitest run src/app/api --reporter=json --reportFile=coverage/api-results.json',
    description: 'API route tests',
  },
  {
    name: 'Integration Tests',
    command:
      'npx vitest run src/test/integration --reporter=json --reportFile=coverage/integration-results.json',
    description: 'Integration tests for user flows',
  },
  {
    name: 'E2E Tests (Playwright)',
    command: 'npx playwright test --reporter=json',
    description: 'End-to-end tests with Playwright',
  },
]

const results = {
  timestamp: new Date().toISOString(),
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
  },
  categories: [],
  failures: [],
}

// Run test categories
for (const category of testCategories) {
  console.log(`\n📋 ${category.name}`)
  console.log(`   ${category.description}`)
  console.log('   ' + '-'.repeat(55))

  try {
    const startTime = Date.now()
    const output = execSync(category.command, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 300000, // 5 minutes
    })
    const duration = Date.now() - startTime

    console.log(`   ✅ Passed (${(duration / 1000).toFixed(2)}s)`)

    results.categories.push({
      name: category.name,
      status: 'passed',
      duration: duration,
      output: output.substring(0, 500),
    })
  } catch (error) {
    const duration = Date.now() - Date.now() // Approximate
    console.log(`   ❌ Failed: ${error.message.split('\n')[0]}`)

    results.categories.push({
      name: category.name,
      status: 'failed',
      duration: duration,
      error: error.message.substring(0, 500),
    })

    results.failures.push({
      category: category.name,
      error: error.message,
    })
  }
}

// Parse test results
try {
  // Parse Vitest results
  if (fs.existsSync('coverage/test-results.json')) {
    const vitestResults = JSON.parse(fs.readFileSync('coverage/test-results.json', 'utf-8'))
    results.summary.total += vitestResults.numTotalTests || 0
    results.summary.passed += vitestResults.numPassedTests || 0
    results.summary.failed += vitestResults.numFailedTests || 0
  }

  // Parse Playwright results
  if (fs.existsSync('test-results/results.json')) {
    const playwrightResults = JSON.parse(fs.readFileSync('test-results/results.json', 'utf-8'))
    if (playwrightResults.suites) {
      playwrightResults.suites.forEach(suite => {
        suite.specs.forEach(spec => {
          spec.tests.forEach(test => {
            results.summary.total++
            if (test.results[0]?.status === 'passed') {
              results.summary.passed++
            } else if (test.results[0]?.status === 'failed') {
              results.summary.failed++
              results.failures.push({
                category: 'E2E',
                test: test.title,
                error: test.results[0]?.error?.message || 'Unknown error',
              })
            }
          })
        })
      })
    }
  }
} catch (error) {
  console.warn(`\n⚠️  Warning: Could not parse test results: ${error.message}`)
}

// Generate report
const reportPath = path.join(OUTPUT_DIR, `test-report-${TIMESTAMP}.md`)
const reportContent = generateMarkdownReport(results)
fs.writeFileSync(reportPath, reportContent)

// Generate JSON report
const jsonReportPath = path.join(OUTPUT_DIR, `test-report-${TIMESTAMP}.json`)
fs.writeFileSync(jsonReportPath, JSON.stringify(results, null, 2))

// Summary
console.log('\n' + '='.repeat(60))
console.log('📊 Test Summary')
console.log('='.repeat(60))
console.log(`Total Tests:  ${results.summary.total}`)
console.log(`Passed:       ${results.summary.passed} ✓`)
console.log(`Failed:       ${results.summary.failed} ✗`)
console.log(`Skipped:      ${results.summary.skipped} ○`)

const passRate =
  results.summary.total > 0
    ? ((results.summary.passed / results.summary.total) * 100).toFixed(1)
    : 0
console.log(`Pass Rate:    ${passRate}%`)

console.log(`\n📁 Reports saved to:`)
console.log(`   - ${reportPath}`)
console.log(`   - ${jsonReportPath}`)

// Exit with error code if tests failed
if (results.summary.failed > 0) {
  console.log('\n❌ Some tests failed. Check the reports for details.')
  process.exit(1)
} else {
  console.log('\n✅ All tests passed!')
  process.exit(0)
}

function generateMarkdownReport(data) {
  const passRate =
    data.summary.total > 0 ? ((data.summary.passed / data.summary.total) * 100).toFixed(1) : 0

  return `# 7zi-Project Test Report

**Generated:** ${new Date(data.timestamp).toLocaleString()}

## 📊 Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${data.summary.total} |
| Passed | ${data.summary.passed} ✅ |
| Failed | ${data.summary.failed} ❌ |
| Skipped | ${data.summary.skipped} ○ |
| Pass Rate | ${passRate}% |

## 📋 Test Categories

${data.categories
  .map(
    category => `
### ${category.name}

- **Status:** ${category.status === 'passed' ? '✅ Passed' : '❌ Failed'}
- **Duration:** ${(category.duration / 1000).toFixed(2)}s

${
  category.error
    ? `
**Error:**
\`\`\`
${category.error.substring(0, 500)}
\`\`\`
`
    : ''
}
`
  )
  .join('\n')}

${
  data.failures.length > 0
    ? `
## ❌ Failed Tests

${data.failures
  .map(
    (failure, index) => `
### ${index + 1}. ${failure.category}${failure.test ? ` - ${failure.test}` : ''}

\`\`\`
${failure.error.substring(0, 1000)}
\`\`\`
`
  )
  .join('\n')}
`
    : ''
}

## 📈 Coverage

| Category | Status | Duration |
|----------|--------|----------|
${data.categories.map(cat => `| ${cat.name} | ${cat.status === 'passed' ? '✅' : '❌'} | ${(cat.duration / 1000).toFixed(2)}s |`).join('\n')}

## 🏁 Conclusion

${
  data.summary.failed === 0
    ? 'All tests passed successfully! 🎉'
    : `${data.summary.failed} test(s) failed. Please review the failures above and fix the issues.`
}

---

*Report generated by 7zi-Project Test Runner*
`
}
