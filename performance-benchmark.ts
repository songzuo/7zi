/**
 * Performance Benchmark Framework
 * 为 v1.9.0 性能优化提供量化依据
 * 运行模式: volcengine
 */

import { performance } from 'perf_hooks'

// ============================================
// 类型定义
// ============================================

interface BenchmarkResult {
  name: string
  iterations: number
  totalTime: number
  avgTime: number
  minTime: number
  maxTime: number
  opsPerSecond: number
  timestamp: string
}

interface BenchmarkReport {
  version: string
  runtime: string
  nodeVersion: string
  platform: string
  timestamp: string
  results: BenchmarkResult[]
  summary: {
    totalTests: number
    totalTime: number
    fastest: string
    slowest: string
  }
}

// ============================================
// 基准测试辅助函数
// ============================================

function formatNumber(num: number, decimals: number = 2): string {
  return num.toFixed(decimals)
}

function getTimestamp(): string {
  return new Date().toISOString()
}

// ============================================
// 基准测试实现
// ============================================

/**
 * API 响应时间测试
 * 模拟 API 请求的响应延迟
 */
async function benchmarkApiResponse(iterations: number = 1000): Promise<BenchmarkResult> {
  const times: number[] = []

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()

    // 模拟 API 调用处理
    await new Promise(resolve => setTimeout(resolve, 1))

    // 模拟数据处理
    const data = JSON.stringify({ id: i, timestamp: Date.now() })
    JSON.parse(data)

    const end = performance.now()
    times.push(end - start)
  }

  const totalTime = times.reduce((a, b) => a + b, 0)
  const avgTime = totalTime / iterations
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)

  return {
    name: 'API Response Time',
    iterations,
    totalTime: formatNumber(totalTime, 3),
    avgTime: formatNumber(avgTime, 3),
    minTime: formatNumber(minTime, 3),
    maxTime: formatNumber(maxTime, 3),
    opsPerSecond: formatNumber(1000 / avgTime),
    timestamp: getTimestamp(),
  }
}

/**
 * 内存使用测试
 * 测试对象创建和内存分配效率
 */
function benchmarkMemoryUsage(iterations: number = 10000): BenchmarkResult {
  const times: number[] = []

  // 强制垃圾回收（如果可用）
  if (global.gc) {
    global.gc()
  }

  const initialMemory = process.memoryUsage().heapUsed

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()

    // 创建测试对象
    const obj = {
      id: i,
      name: `test-${i}`,
      data: new Array(10).fill(i),
      nested: {
        level1: { level2: { level3: i } },
      },
    }

    // 模拟内存操作
    const jsonStr = JSON.stringify(obj)
    const parsed = JSON.parse(jsonStr)

    const end = performance.now()
    times.push(end - start)
  }

  const finalMemory = process.memoryUsage().heapUsed
  const memoryUsed = (finalMemory - initialMemory) / 1024 / 1024 // MB

  const totalTime = times.reduce((a, b) => a + b, 0)
  const avgTime = totalTime / iterations
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)

  return {
    name: 'Memory Usage',
    iterations,
    totalTime: formatNumber(totalTime, 3),
    avgTime: formatNumber(avgTime, 3),
    minTime: formatNumber(minTime, 3),
    maxTime: formatNumber(maxTime, 3),
    opsPerSecond: formatNumber(1000 / avgTime),
    timestamp: getTimestamp(),
  }
}

/**
 * WebSocket 消息处理测试
 * 模拟 WebSocket 消息的序列化/反序列化
 */
function benchmarkWebSocketMessages(iterations: number = 5000): BenchmarkResult {
  const times: number[] = []

  // 模拟 WebSocket 消息
  const messageTemplate = {
    type: 'message',
    payload: {
      id: 'msg-001',
      content: 'Hello, World!',
      metadata: {
        timestamp: Date.now(),
        sender: 'user-123',
        channel: 'general',
      },
    },
  }

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()

    // 模拟消息序列化
    const serialized = JSON.stringify(messageTemplate)

    // 模拟消息反序列化
    const deserialized = JSON.parse(serialized)

    // 模拟消息处理逻辑
    const processed = {
      ...deserialized,
      processedAt: Date.now(),
    }

    const end = performance.now()
    times.push(end - start)
  }

  const totalTime = times.reduce((a, b) => a + b, 0)
  const avgTime = totalTime / iterations
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)

  return {
    name: 'WebSocket Message Processing',
    iterations,
    totalTime: formatNumber(totalTime, 3),
    avgTime: formatNumber(avgTime, 3),
    minTime: formatNumber(minTime, 3),
    maxTime: formatNumber(maxTime, 3),
    opsPerSecond: formatNumber(1000 / avgTime),
    timestamp: getTimestamp(),
  }
}

/**
 * 异常检测延迟测试
 * 测试错误检测和处理的响应时间
 */
function benchmarkExceptionDetection(iterations: number = 5000): BenchmarkResult {
  const times: number[] = []

  // 模拟各种异常场景
  const errorScenarios = [
    { type: 'ValidationError', field: 'email', value: 'invalid' },
    { type: 'AuthError', code: 401, message: 'Unauthorized' },
    { type: 'NetworkError', status: 'timeout' },
    { type: 'ParseError', data: '{invalid json}' },
    { type: 'RangeError', index: -1, length: 10 },
  ]

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()

    const scenario = errorScenarios[i % errorScenarios.length]

    // 模拟异常检测逻辑
    try {
      switch (scenario.type) {
        case 'ValidationError':
          if (!scenario.value || scenario.value === 'invalid') {
            throw new Error(`Validation failed: ${scenario.field}`)
          }
          break
        case 'AuthError':
          if (scenario.code === 401) {
            throw new Error('Authentication required')
          }
          break
        case 'NetworkError':
          if (scenario.status === 'timeout') {
            throw new Error('Request timeout')
          }
          break
        case 'ParseError':
          JSON.parse(scenario.data)
          break
        case 'RangeError':
          if (scenario.index < 0 || scenario.index >= scenario.length) {
            throw new RangeError('Index out of bounds')
          }
          break
      }
    } catch (error) {
      // 模拟异常处理
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorType = error instanceof Error ? error.constructor.name : 'Error'
    }

    const end = performance.now()
    times.push(end - start)
  }

  const totalTime = times.reduce((a, b) => a + b, 0)
  const avgTime = totalTime / iterations
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)

  return {
    name: 'Exception Detection Latency',
    iterations,
    totalTime: formatNumber(totalTime, 3),
    avgTime: formatNumber(avgTime, 3),
    minTime: formatNumber(minTime, 3),
    maxTime: formatNumber(maxTime, 3),
    opsPerSecond: formatNumber(1000 / avgTime),
    timestamp: getTimestamp(),
  }
}

// ============================================
// 主测试运行器
// ============================================

async function runBenchmarks(): Promise<BenchmarkReport> {
  console.log('🚀 Starting Performance Benchmark...\n')

  const results: BenchmarkResult[] = []

  // 1. API 响应时间测试
  console.log('📡 Running API Response Time test...')
  results.push(await benchmarkApiResponse(1000))

  // 2. 内存使用测试
  console.log('💾 Running Memory Usage test...')
  results.push(benchmarkMemoryUsage(10000))

  // 3. WebSocket 消息处理测试
  console.log('🔌 Running WebSocket Message Processing test...')
  results.push(benchmarkWebSocketMessages(5000))

  // 4. 异常检测延迟测试
  console.log('⚠️ Running Exception Detection Latency test...')
  results.push(benchmarkExceptionDetection(5000))

  // 生成报告
  const totalTime = results.reduce((acc, r) => acc + parseFloat(r.totalTime), 0)
  const sortedBySpeed = [...results].sort(
    (a, b) => parseFloat(b.opsPerSecond) - parseFloat(a.opsPerSecond)
  )

  const report: BenchmarkReport = {
    version: '1.9.0',
    runtime: 'volcengine',
    nodeVersion: process.version,
    platform: process.platform,
    timestamp: getTimestamp(),
    results,
    summary: {
      totalTests: results.length,
      totalTime: formatNumber(totalTime, 3),
      fastest: sortedBySpeed[0]?.name || 'N/A',
      slowest: sortedBySpeed[sortedBySpeed.length - 1]?.name || 'N/A',
    },
  }

  return report
}

function formatReport(report: BenchmarkReport): string {
  let output = `# Performance Benchmark Report\n\n`
  output += `**Version:** ${report.version}\n`
  output += `**Runtime:** ${report.runtime}\n`
  output += `**Node Version:** ${report.nodeVersion}\n`
  output += `**Platform:** ${report.platform}\n`
  output += `**Timestamp:** ${report.timestamp}\n\n`

  output += `## Summary\n\n`
  output += `- **Total Tests:** ${report.summary.totalTests}\n`
  output += `- **Total Time:** ${report.summary.totalTime}ms\n`
  output += `- **Fastest:** ${report.summary.fastest}\n`
  output += `- **Slowest:** ${report.summary.slowest}\n\n`

  output += `## Detailed Results\n\n`
  output += `| Test Name | Iterations | Avg Time (ms) | Min (ms) | Max (ms) | Ops/sec |\n`
  output += `|-----------|------------|---------------|----------|----------|--------|\n`

  for (const result of report.results) {
    output += `| ${result.name} | ${result.iterations} | ${result.avgTime} | ${result.minTime} | ${result.maxTime} | ${result.opsPerSecond} |\n`
  }

  output += `\n## JSON Output\n\n\`\`\`json\n`
  output += JSON.stringify(report, null, 2)
  output += `\n\`\`\`\n`

  return output
}

// ============================================
// CLI 入口点
// ============================================

async function main() {
  try {
    const report = await runBenchmarks()

    console.log('\n✅ Benchmark Complete!\n')
    console.log(formatReport(report))

    // 保存 JSON 报告
    const fs = await import('fs')
    const outputPath = '/root/.openclaw/workspace/benchmark-results.json'
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2))
    console.log(`\n📄 JSON report saved to: ${outputPath}`)

    process.exit(0)
  } catch (error) {
    console.error('❌ Benchmark failed:', error)
    process.exit(1)
  }
}

main()
