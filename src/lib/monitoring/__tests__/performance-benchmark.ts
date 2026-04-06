// @ts-nocheck
/**
 * Performance Benchmark for Monitoring Optimization
 * 监控优化性能基准测试
 *
 * 运行方式: npx ts-node src/lib/monitoring/__tests__/performance-benchmark.ts
 */

// ========================================
// Circular Buffer Implementation (Optimized)
// ========================================

class CircularBuffer<T> {
  private buffer: (T | null)[]
  private head: number = 0
  private tail: number = 0
  private size: number = 0

  constructor(capacity: number) {
    this.buffer = new Array(capacity).fill(null)
  }

  push(item: T): void {
    if (this.size === this.buffer.length) {
      this.head = (this.head + 1) % this.buffer.length
    } else {
      this.size++
    }
    this.buffer[this.tail] = item
    this.tail = (this.tail + 1) % this.buffer.length
  }

  toArray(): T[] {
    const result: T[] = []
    let i = this.head
    for (let count = 0; count < this.size; count++) {
      const item = this.buffer[i]
      if (item !== null) result.push(item)
      i = (i + 1) % this.buffer.length
    }
    return result
  }

  get length(): number {
    return this.size
  }

  clear(): void {
    this.head = 0
    this.tail = 0
    this.size = 0
    this.buffer.fill(null)
  }
}

// ========================================
// Benchmark Tests
// ========================================

interface BenchmarkResult {
  name: string
  iterations: number
  totalTimeMs: number
  avgTimeMs: number
  opsPerSecond: number
}

function benchmark(
  name: string,
  fn: () => void,
  iterations: number = 10000
): BenchmarkResult {
  const start = performance.now()

  for (let i = 0; i < iterations; i++) {
    fn()
  }

  const end = performance.now()
  const totalTimeMs = end - start
  const avgTimeMs = totalTimeMs / iterations
  const opsPerSecond = Math.round((iterations / totalTimeMs) * 1000)

  return { name, iterations, totalTimeMs, avgTimeMs, opsPerSecond }
}

function runBenchmarks(): void {
  console.log('========================================')
  console.log('Monitoring Performance Optimization Benchmark')
  console.log('========================================\n')

  const results: BenchmarkResult[] = []

  // Test 1: Array + shift() vs Circular Buffer
  console.log('Test 1: Push operations with size limit')

  const arrayWithShift: number[] = []
  const circularBuffer = new CircularBuffer<number>(1000)
  const maxItems = 1000

  results.push(
    benchmark('Array + shift()', () => {
      arrayWithShift.push(Math.random())
      if (arrayWithShift.length > maxItems) {
        arrayWithShift.shift()
      }
    })
  )

  results.push(
    benchmark('Circular Buffer', () => {
      circularBuffer.push(Math.random())
    })
  )

  // Test 2: To array conversion
  console.log('Test 2: To array conversion')

  const largeArray = Array.from({ length: 1000 }, (_, i) => i)
  const largeBuffer = new CircularBuffer<number>(1000)
  for (let i = 0; i < 1000; i++) {
    largeBuffer.push(i)
  }

  results.push(
    benchmark('Array spread [...arr]', () => {
      const _copy = [...largeArray]
    })
  )

  results.push(
    benchmark('Array.from()', () => {
      const _copy = Array.from(largeArray)
    })
  )

  results.push(
    benchmark('CircularBuffer.toArray()', () => {
      const _copy = largeBuffer.toArray()
    })
  )

  // Test 3: Percentile calculation
  console.log('Test 3: Percentile calculation')

  const values = Array.from({ length: 10000 }, () => Math.random() * 1000)

  results.push(
    benchmark('Full sort + percentile', () => {
      const sorted = [...values].sort((a, b) => a - b)
      const index = Math.ceil(0.95 * sorted.length) - 1
      const _p95 = sorted[index]
    })
  )

  // Approximate percentile with sampling
  results.push(
    benchmark('Sampled percentile (1000 samples)', () => {
      const sampleStep = Math.ceil(values.length / 1000)
      const sampled: number[] = []
      for (let i = 0; i < values.length; i += sampleStep) {
        sampled.push(values[i])
      }
      sampled.sort((a, b) => a - b)
      const index = Math.ceil(0.95 * sampled.length) - 1
      const _p95 = sampled[index]
    })
  )

  // Test 4: Map operations
  console.log('Test 4: Map operations')

  const map = new Map<string, number>()
  for (let i = 0; i < 100; i++) {
    map.set(`key-${i}`, i)
  }

  results.push(
    benchmark('Map.set (existing key)', () => {
      map.set('key-50', Math.random())
    })
  )

  results.push(
    benchmark('Map.get', () => {
      const _val = map.get('key-50')
    })
  )

  results.push(
    benchmark('Map.has', () => {
      const _exists = map.has('key-50')
    })
  )

  // Test 5: Correlation calculation (optimized vs original)
  console.log('Test 5: Correlation calculation')

  const x = Array.from({ length: 1000 }, () => Math.random() * 100)
  const y = Array.from({ length: 1000 }, () => Math.random() * 100)

  results.push(
    benchmark('Full correlation (1000 points)', () => {
      const n = Math.min(x.length, y.length)
      const meanX = x.reduce((a, b) => a + b, 0) / n
      const meanY = y.reduce((a, b) => a + b, 0) / n

      let numerator = 0
      let denomX = 0
      let denomY = 0

      for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX
        const dy = y[i] - meanY
        numerator += dx * dy
        denomX += dx * dx
        denomY += dy * dy
      }

      const _correlation = numerator / Math.sqrt(denomX * denomY)
    })
  )

  // Sampled correlation
  const sampleSize = 100
  results.push(
    benchmark(`Sampled correlation (${sampleSize} points)`, () => {
      const step = Math.ceil(x.length / sampleSize)
      const sampledX: number[] = []
      const sampledY: number[] = []

      for (let i = 0; i < x.length; i += step) {
        sampledX.push(x[i])
        sampledY.push(y[i])
      }

      const n = sampledX.length
      const meanX = sampledX.reduce((a, b) => a + b, 0) / n
      const meanY = sampledY.reduce((a, b) => a + b, 0) / n

      let numerator = 0
      let denomX = 0
      let denomY = 0

      for (let i = 0; i < n; i++) {
        const dx = sampledX[i] - meanX
        const dy = sampledY[i] - meanY
        numerator += dx * dy
        denomX += dx * dx
        denomY += dy * dy
      }

      const _correlation = numerator / Math.sqrt(denomX * denomY)
    })
  )

  // Test 6: Single-pass aggregation vs multiple passes
  console.log('Test 6: Aggregation algorithms')

  interface DataPoint {
    timestamp: number
    value: number
  }

  const dataPoints: DataPoint[] = Array.from({ length: 10000 }, (_, i) => ({
    timestamp: Date.now() - (10000 - i) * 1000,
    value: Math.random() * 100,
  }))

  // Multiple passes (original)
  results.push(
    benchmark('Multiple passes (filter + map + reduce)', () => {
      const filtered = dataPoints.filter(d => d.timestamp > Date.now() - 5000000)
      const values = filtered.map(d => d.value)
      const sum = values.reduce((a, b) => a + b, 0)
      const count = values.length
      const avg = count > 0 ? sum / count : 0
      const min = Math.min(...values)
      const max = Math.max(...values)
      const _stats = { count, sum, avg, min, max }
    })
  )

  // Single pass (optimized)
  results.push(
    benchmark('Single pass aggregation', () => {
      let count = 0
      let sum = 0
      let min = Infinity
      let max = -Infinity
      const cutoff = Date.now() - 5000000

      for (let i = 0; i < dataPoints.length; i++) {
        const d = dataPoints[i]
        if (d.timestamp <= cutoff) continue

        count++
        sum += d.value
        if (d.value < min) min = d.value
        if (d.value > max) max = d.value
      }

      const avg = count > 0 ? sum / count : 0
      const _stats = { count, sum, avg, min: min === Infinity ? 0 : min, max: max === -Infinity ? 0 : max }
    })
  )

  // Print results
  console.log('\n========================================')
  console.log('Benchmark Results')
  console.log('========================================\n')

  console.log('| Test | Iterations | Total (ms) | Avg (ms) | Ops/sec |')
  console.log('|------|------------|------------|----------|---------|')

  for (const result of results) {
    console.log(
      `| ${result.name.padEnd(35)} | ${result.iterations.toString().padStart(10)} | ${result.totalTimeMs.toFixed(2).padStart(10)} | ${result.avgTimeMs.toFixed(6).padStart(8)} | ${result.opsPerSecond.toLocaleString().padStart(9)} |`
    )
  }

  // Calculate improvement percentages
  console.log('\n========================================')
  console.log('Performance Improvement Summary')
  console.log('========================================\n')

  // Array + shift vs Circular Buffer
  const shiftOps = results[0].opsPerSecond
  const bufferOps = results[1].opsPerSecond
  const pushImprovement = ((bufferOps - shiftOps) / shiftOps) * 100

  console.log(`Circular Buffer vs Array+shift: ${pushImprovement.toFixed(1)}% faster`)

  // Full sort vs Sampled percentile
  const fullSortOps = results[5].opsPerSecond
  const sampledOps = results[6].opsPerSecond
  const percentileImprovement = ((sampledOps - fullSortOps) / fullSortOps) * 100

  console.log(`Sampled percentile vs Full sort: ${percentileImprovement.toFixed(1)}% faster`)

  // Full correlation vs Sampled
  const fullCorrOps = results[10].opsPerSecond
  const sampledCorrOps = results[11].opsPerSecond
  const corrImprovement = ((sampledCorrOps - fullCorrOps) / fullCorrOps) * 100

  console.log(`Sampled correlation vs Full: ${corrImprovement.toFixed(1)}% faster`)

  // Multiple passes vs Single pass
  const multiPassOps = results[12].opsPerSecond
  const singlePassOps = results[13].opsPerSecond
  const aggImprovement = ((singlePassOps - multiPassOps) / multiPassOps) * 100

  console.log(`Single pass vs Multiple passes: ${aggImprovement.toFixed(1)}% faster`)

  console.log('\n========================================')
  console.log('Overall Assessment')
  console.log('========================================\n')

  const avgImprovement = (pushImprovement + percentileImprovement + corrImprovement + aggImprovement) / 4
  console.log(`Average improvement: ${avgImprovement.toFixed(1)}%`)

  if (avgImprovement >= 20) {
    console.log('✅ Target achieved: Performance improved by at least 20%')
  } else {
    console.log('❌ Target not met: Performance improvement below 20%')
  }
}

// Run benchmarks
runBenchmarks()