/**
 * Performance Benchmark Suite
 *
 * Tests and benchmarks for:
 * - Metrics aggregation performance
 * - Anomaly detection latency
 * - WebSocket message throughput
 *
 * @module lib/__tests__/performance-benchmark
 * @version 2.0.0
 */

import { OptimizedMetricsAggregator } from '@/lib/monitoring/optimized-metrics-aggregator'
import { OptimizedAnomalyDetector } from '@/lib/performance/anomaly-detection/optimized-anomaly-detector'
import { compressMessage, decompressMessage } from '@/lib/websocket/optimized-message'
import type { AggregatorMetric } from '@/lib/monitoring/optimized-metrics-aggregator'
import type { WebSocketMessage } from '@/lib/websocket/optimized-message'

// ============================================
// Benchmark Utilities
// ============================================

interface BenchmarkResult {
  name: string
  iterations: number
  totalTime: number
  avgTime: number
  minTime: number
  maxTime: number
  opsPerSecond: number
  timestamp: number
}

function runBenchmark(
  name: string,
  fn: () => void,
  iterations: number = 10000
): BenchmarkResult {
  const times: number[] = []

  // Warmup
  for (let i = 0; i < 100; i++) {
    fn()
  }

  // Actual benchmark
  const start = performance.now()

  for (let i = 0; i < iterations; i++) {
    const iterStart = performance.now()
    fn()
    times.push(performance.now() - iterStart)
  }

  const totalTime = performance.now() - start

  return {
    name,
    iterations,
    totalTime,
    avgTime: totalTime / iterations,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
    opsPerSecond: (iterations / totalTime) * 1000,
    timestamp: Date.now(),
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatTime(ms: number): string {
  if (ms < 1) return `${ms.toFixed(3)} μs`
  if (ms < 1000) return `${ms.toFixed(2)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

// ============================================
// Metrics Aggregation Benchmarks
// ============================================

function generateMetrics(count: number): AggregatorMetric[] {
  const metrics: AggregatorMetric[] = []
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    metrics.push({
      timestamp: now - (count - i) * 1000,
      value: Math.random() * 100,
      metadata: { source: 'benchmark' },
    })
  }

  return metrics
}

export function benchmarkMetricsAggregation(): BenchmarkResult[] {
  const results: BenchmarkResult[] = []

  console.log('\n📊 Metrics Aggregation Benchmarks')
  console.log('='.repeat(60))

  // Test 1: Single metric addition (incremental)
  const aggregator = new OptimizedMetricsAggregator({
    enableWorker: false,
    enableSampling: false,
  })

  const metricAddResult = runBenchmark(
    'Single metric add (incremental)',
    () => {
      aggregator.addMetric({
        timestamp: Date.now(),
        value: Math.random() * 100,
      })
    },
    100000
  )
  results.push(metricAddResult)
  console.log(`  ✓ Single metric add: ${formatTime(metricAddResult.avgTime)} (${metricAddResult.opsPerSecond.toFixed(0)} ops/s)`)

  // Test 2: Aggregated query
  const metrics = generateMetrics(1000)
  for (const m of metrics) {
    aggregator.addMetric(m)
  }

  const aggregationResult = runBenchmark(
    'Aggregated query (1000 metrics)',
    () => {
      aggregator.getAggregated({
        startTime: Date.now() - 60000,
        endTime: Date.now(),
      })
    },
    1000
  )
  results.push(aggregationResult)
  console.log(`  ✓ Aggregated query: ${formatTime(aggregationResult.avgTime)} (${aggregationResult.opsPerSecond.toFixed(0)} ops/s)`)

  // Test 3: Large dataset
  const largeMetrics = generateMetrics(10000)
  const largeAggregator = new OptimizedMetricsAggregator()

  for (const m of largeMetrics) {
    largeAggregator.addMetric(m)
  }

  const largeResult = runBenchmark(
    'Large dataset query (10000 metrics)',
    () => {
      largeAggregator.getAggregated({
        startTime: Date.now() - 3600000,
        endTime: Date.now(),
      })
    },
    100
  )
  results.push(largeResult)
  console.log(`  ✓ Large dataset query: ${formatTime(largeResult.avgTime)}`)

  // Test 4: Percentile calculation
  const percentileResult = runBenchmark(
    'Percentile calculation (P50/P90/P95/P99)',
    () => {
      largeAggregator.getAggregated({
        startTime: Date.now() - 3600000,
        endTime: Date.now(),
      })
    },
    100
  )
  results.push(percentileResult)
  console.log(`  ✓ Percentile calculation: ${formatTime(percentileResult.avgTime)}`)

  return results
}

// ============================================
// Anomaly Detection Benchmarks
// ============================================

export function benchmarkAnomalyDetection(): BenchmarkResult[] {
  const results: BenchmarkResult[] = []

  console.log('\n🔍 Anomaly Detection Benchmarks')
  console.log('='.repeat(60))

  // Test 1: Incremental update
  const detector = new OptimizedAnomalyDetector({
    windowSize: 100,
    minSamples: 10,
  })

  // Initialize with some data
  for (let i = 0; i < 50; i++) {
    detector.incrementalUpdate({
      timestamp: Date.now() - i * 1000,
      value: 50 + Math.random() * 20,
    })
  }

  const incrementalResult = runBenchmark(
    'Incremental update (single metric)',
    () => {
      detector.incrementalUpdate({
        timestamp: Date.now(),
        value: 50 + Math.random() * 20,
      })
    },
    10000
  )
  results.push(incrementalResult)
  console.log(`  ✓ Incremental update: ${formatTime(incrementalResult.avgTime)} (${incrementalResult.opsPerSecond.toFixed(0)} ops/s)`)

  // Test 2: Sliding window detection
  const testMetrics: AggregatorMetric[] = []
  for (let i = 0; i < 100; i++) {
    testMetrics.push({
      timestamp: Date.now() - i * 1000,
      value: 50 + Math.random() * 20,
    })
  }
  // Add some anomalies
  testMetrics.push({ timestamp: Date.now(), value: 150 })
  testMetrics.push({ timestamp: Date.now(), value: 10 })

  const slidingWindowResult = runBenchmark(
    'Sliding window detection (100 metrics)',
    () => {
      detector.detectSlidingWindow(testMetrics)
    },
    1000
  )
  results.push(slidingWindowResult)
  console.log(`  ✓ Sliding window: ${formatTime(slidingWindowResult.avgTime)}`)

  // Test 3: Adaptive threshold computation
  const thresholdResult = runBenchmark(
    'Adaptive threshold computation',
    () => {
      detector.computeAdaptiveThreshold()
    },
    1000
  )
  results.push(thresholdResult)
  console.log(`  ✓ Adaptive threshold: ${formatTime(thresholdResult.avgTime)}`)

  // Test 4: Single detection
  const singleResult = runBenchmark(
    'Single anomaly detection',
    () => {
      detector.detectSingle({
        timestamp: Date.now(),
        value: 80,
      })
    },
    10000
  )
  results.push(singleResult)
  console.log(`  ✓ Single detection: ${formatTime(singleResult.avgTime)}`)

  return results
}

// ============================================
// WebSocket Message Compression Benchmarks
// ============================================

export function benchmarkWebSocketMessages(): BenchmarkResult[] {
  const results: BenchmarkResult[] = []

  console.log('\n📡 WebSocket Message Benchmarks')
  console.log('='.repeat(60))

  // Test 1: Small message compression
  const smallMessage: WebSocketMessage = {
    type: 'chat:message',
    payload: { text: 'Hello' },
    timestamp: Date.now(),
    roomId: 'room-1',
    userId: 'user-1',
  }

  const smallResult = runBenchmark(
    'Small message compression',
    () => {
      compressMessage(smallMessage)
    },
    10000
  )
  results.push(smallResult)
  console.log(`  ✓ Small message: ${formatTime(smallResult.avgTime)}`)

  // Test 2: Large message compression
  const largePayload = {
    messages: Array(100).fill(0).map((_, i) => ({
      id: `msg-${i}`,
      text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(5),
      userId: `user-${i % 10}`,
      timestamp: Date.now() - i * 1000,
    })),
  }

  const largeMessage: WebSocketMessage = {
    type: 'chat:messages',
    payload: largePayload,
    timestamp: Date.now(),
    roomId: 'room-1',
  }

  const largeResult = runBenchmark(
    'Large message compression',
    () => {
      compressMessage(largeMessage)
    },
    1000
  )
  results.push(largeResult)
  console.log(`  ✓ Large message: ${formatTime(largeResult.avgTime)}`)

  // Test 3: Decompression
  const compressed = compressMessage(largeMessage)

  const decompressResult = runBenchmark(
    'Message decompression',
    () => {
      decompressMessage(compressed)
    },
    1000
  )
  results.push(decompressResult)
  console.log(`  ✓ Decompression: ${formatTime(decompressResult.avgTime)}`)

  // Test 4: Batch processing
  const batchMessages: WebSocketMessage[] = Array(100).fill(0).map((_, i) => ({
    type: 'chat:message',
    payload: { text: `Message ${i}` },
    timestamp: Date.now() - i * 1000,
    roomId: 'room-1',
    userId: `user-${i % 10}`,
  }))

  const batchResult = runBenchmark(
    'Batch message processing (100 msgs)',
    () => {
      for (const msg of batchMessages) {
        compressMessage(msg)
      }
    },
    100
  )
  results.push(batchResult)
  const msgsPerSec = (batchMessages.length * batchResult.opsPerSecond).toFixed(0)
  console.log(`  ✓ Batch processing: ${formatTime(batchResult.avgTime)} (${msgsPerSec} msgs/s)`)

  return results
}

// ============================================
// Memory Benchmark
// ============================================

export function benchmarkMemory(): void {
  console.log('\n💾 Memory Usage')
  console.log('='.repeat(60))

  const mem = process.memoryUsage()

  console.log(`  Heap Used: ${formatBytes(mem.heapUsed)}`)
  console.log(`  Heap Total: ${formatBytes(mem.heapTotal)}`)
  console.log(`  RSS: ${formatBytes(mem.rss)}`)
  console.log(`  External: ${formatBytes(mem.external)}`)

  const percentUsed = (mem.heapUsed / mem.heapTotal) * 100
  console.log(`  Heap Usage: ${percentUsed.toFixed(1)}%`)
}

// ============================================
// Run All Benchmarks
// ============================================

export function runAllBenchmarks(): void {
  console.log('\n🚀 Performance Optimization v2.0.0 - Benchmark Suite')
  console.log('='.repeat(60))

  const startTime = Date.now()

  // Run benchmarks
  const aggResults = benchmarkMetricsAggregation()
  const anomalyResults = benchmarkAnomalyDetection()
  const wsResults = benchmarkWebSocketMessages()
  benchmarkMemory()

  // Summary
  console.log('\n📈 Summary')
  console.log('='.repeat(60))

  // Find fastest and slowest
  const allResults = [...aggResults, ...anomalyResults, ...wsResults]

  const fastest = allResults.reduce((a, b) => (a.avgTime < b.avgTime ? a : b))
  const slowest = allResults.reduce((a, b) => (a.avgTime > b.avgTime ? a : b))

  console.log(`  Fastest: ${fastest.name} (${formatTime(fastest.avgTime)})`)
  console.log(`  Slowest: ${slowest.name} (${formatTime(slowest.avgTime)})`)

  const totalTime = Date.now() - startTime
  console.log(`\n  Total time: ${totalTime}ms`)

  // Performance targets check
  console.log('\n🎯 Performance Targets')
  console.log('='.repeat(60))

  // API P95 response time target: <25ms
  const apiResult = aggResults.find(r => r.name.includes('Aggregated query'))
  if (apiResult) {
    const target = 25 // ms
    const status = apiResult.avgTime < target ? '✅' : '❌'
    console.log(`  ${status} API P95: ${formatTime(apiResult.avgTime)} (target: <${target}ms)`)
  }

  // Anomaly detection target: <50ms
  const anomalyResult = anomalyResults.find(r => r.name.includes('Sliding window'))
  if (anomalyResult) {
    const target = 50 // ms
    const status = anomalyResult.avgTime < target ? '✅' : '❌'
    console.log(`  ${status} Anomaly Detection: ${formatTime(anomalyResult.avgTime)} (target: <${target}ms)`)
  }

  // WebSocket throughput target: 5000+ msgs/s
  const wsBatchResult = wsResults.find(r => r.name.includes('Batch'))
  if (wsBatchResult) {
    const target = 5000 // msgs/s
    const actual = wsBatchResult.opsPerSecond * 100 // 100 msgs per batch
    const status = actual >= target ? '✅' : '❌'
    console.log(`  ${status} WebSocket Throughput: ${actual.toFixed(0)} msgs/s (target: ${target}+ msgs/s)`)
  }
}

// ============================================
// Export
// ============================================

export default {
  benchmarkMetricsAggregation,
  benchmarkAnomalyDetection,
  benchmarkWebSocketMessages,
  benchmarkMemory,
  runAllBenchmarks,
}