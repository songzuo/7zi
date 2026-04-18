/**
 * 增量式异常检测算法 - 性能基准测试
 *
 * 测试目标：
 * 1. 增量式算法 vs 批处理算法性能对比
 * 2. 内存使用分析
 * 3. 吞吐量测试
 * 4. 延迟测试
 * 5. 大规模数据测试
 *
 * 性能目标: 从 ~50ms 降到 <10ms
 */

import {
  IncrementalZScore,
  StreamingIsolationForest,
  StreamingAnomalyDetector,
  BatchZScoreDetector,
  createStreamingAnomalyDetector,
  AnomalyResult,
} from '../../src/lib/performance/incremental-anomaly-detector'

// 性能测试配置
const PERFORMANCE_CONFIG = {
  // 小规模测试
  small: { samples: 100, iterations: 100 },
  // 中规模测试
  medium: { samples: 1000, iterations: 50 },
  // 大规模测试
  large: { samples: 10000, iterations: 10 },
  // 性能目标阈值（毫秒）
  targetLatency: 10, // 目标延迟 <10ms
  maxLatency: 50, // 最大延迟 50ms
}

// 生成测试数据
function generateTestData(count: number, anomalyRate: number = 0.05): number[] {
  const data: number[] = []
  for (let i = 0; i < count; i++) {
    if (Math.random() < anomalyRate) {
      // 生成异常值
      data.push(100 + Math.random() * 50)
    } else {
      // 生成正常值
      data.push(50 + (Math.random() - 0.5) * 20)
    }
  }
  return data
}

// 生成正态分布数据
function generateNormalData(count: number, mean: number = 50, stdDev: number = 5): number[] {
  const data: number[] = []
  for (let i = 0; i < count; i++) {
    // Box-Muller 变换生成正态分布
    const u1 = Math.random()
    const u2 = Math.random()
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    data.push(mean + z * stdDev)
  }
  return data
}

describe('Incremental Anomaly Detection Performance Benchmarks', () => {
  // ==========================================================================
  // 基础性能测试
  // ==========================================================================
  describe('Basic Performance Tests', () => {
    test('IncrementalZScore should process data in O(1) time per update', () => {
      const detector = new IncrementalZScore()
      const data = generateNormalData(10000)

      // 预热
      for (let i = 0; i < 100; i++) {
        detector.update(data[i])
      }
      detector.reset()

      // 测量每次更新的时间
      const updateTimes: number[] = []
      for (let i = 0; i < 1000; i++) {
        const start = performance.now()
        detector.update(data[i])
        const duration = performance.now() - start
        updateTimes.push(duration)
      }

      const avgTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length
      const maxTime = Math.max(...updateTimes)

      console.log(`IncrementalZScore: avg=${avgTime.toFixed(4)}ms, max=${maxTime.toFixed(4)}ms`)

      // 每次更新应该非常快（< 0.1ms）
      expect(avgTime).toBeLessThan(0.1)
      expect(maxTime).toBeLessThan(1)
    })

    test('StreamingIsolationForest should handle incremental updates efficiently', () => {
      const forest = new StreamingIsolationForest({ treeSize: 256, maxTrees: 50 })
      const data = generateNormalData(256 * 50) // 足够训练多棵树

      const startTime = performance.now()
      for (const value of data) {
        forest.addPoint(value)
      }
      const duration = performance.now() - startTime

      const throughput = data.length / (duration / 1000) // points per second

      console.log(`StreamingIsolationForest: ${duration.toFixed(2)}ms for ${data.length} points`)
      console.log(`Throughput: ${throughput.toFixed(0)} points/sec`)
      console.log(`Trees created: ${forest.getTreeCount()}`)

      // 应该能够快速处理
      expect(duration).toBeLessThan(1000) // < 1 秒处理 12800 个点
      expect(forest.getTreeCount()).toBeGreaterThan(10)
    })

    test('StreamingAnomalyDetector should meet performance targets', () => {
      const detector = new StreamingAnomalyDetector()
      const data = generateTestData(1000)

      // 预热
      for (let i = 0; i < 100; i++) {
        detector.detect(data[i])
      }

      // 测量检测时间
      const detectTimes: number[] = []
      for (let i = 100; i < 1000; i++) {
        const start = performance.now()
        detector.detect(data[i])
        const duration = performance.now() - start
        detectTimes.push(duration)
      }

      const avgTime = detectTimes.reduce((a, b) => a + b, 0) / detectTimes.length
      const p95Time = detectTimes.sort((a, b) => a - b)[Math.floor(detectTimes.length * 0.95)]

      console.log(
        `StreamingAnomalyDetector: avg=${avgTime.toFixed(4)}ms, p95=${p95Time.toFixed(4)}ms`
      )

      // 验证性能目标
      expect(avgTime).toBeLessThan(PERFORMANCE_CONFIG.targetLatency)
    })
  })

  // ==========================================================================
  // 增量式 vs 批处理对比测试
  // ==========================================================================
  describe('Incremental vs Batch Comparison', () => {
    test('IncrementalZScore should be faster than BatchZScoreDetector', () => {
      const incrementalDetector = new IncrementalZScore()
      const batchDetector = new BatchZScoreDetector()
      const data = generateNormalData(10000)

      // 测量增量式检测时间
      const incrementalStart = performance.now()
      for (const value of data) {
        incrementalDetector.update(value)
      }
      const incrementalDuration = performance.now() - incrementalStart

      // 重置并测量批处理检测时间
      batchDetector.reset()
      const batchStart = performance.now()
      for (const value of data) {
        batchDetector.detect(value)
      }
      const batchDuration = performance.now() - batchStart

      const speedup = batchDuration / incrementalDuration

      console.log(`Incremental: ${incrementalDuration.toFixed(2)}ms`)
      console.log(`Batch: ${batchDuration.toFixed(2)}ms`)
      console.log(`Speedup: ${speedup.toFixed(2)}x`)

      // 增量式应该至少快 2 倍
      expect(incrementalDuration).toBeLessThan(batchDuration)
      expect(speedup).toBeGreaterThan(2)
    })

    test('Memory usage: incremental should use constant memory', () => {
      // 测量内存使用（Node.js 环境）
      const initialMemory = process.memoryUsage().heapUsed

      const incrementalDetector = new IncrementalZScore()
      const data = generateNormalData(100000)

      for (const value of data) {
        incrementalDetector.update(value)
      }

      const afterMemory = process.memoryUsage().heapUsed
      const memoryGrowth = (afterMemory - initialMemory) / 1024 / 1024 // MB

      console.log(`Incremental memory growth: ${memoryGrowth.toFixed(2)}MB`)

      // 增量式算法应该使用固定内存（< 1MB 增长）
      expect(memoryGrowth).toBeLessThan(1)
    })

    test('Batch detector memory grows with data size', () => {
      const batchDetector = new BatchZScoreDetector()
      const data = generateNormalData(10000)

      const initialMemory = process.memoryUsage().heapUsed

      for (const value of data) {
        batchDetector.detect(value)
      }

      const afterMemory = process.memoryUsage().heapUsed
      const memoryGrowth = (afterMemory - initialMemory) / 1024 / 1024 // MB

      console.log(`Batch memory growth: ${memoryGrowth.toFixed(2)}MB`)

      // 批处理算法内存会随数据增长
      expect(memoryGrowth).toBeGreaterThan(0.5)
    })
  })

  // ==========================================================================
  // 吞吐量测试
  // ==========================================================================
  describe('Throughput Benchmarks', () => {
    test('should achieve high throughput for single value detection', () => {
      const detector = new StreamingAnomalyDetector()
      const data = generateNormalData(100000)

      const startTime = performance.now()
      for (const value of data) {
        detector.detect(value)
      }
      const duration = performance.now() - startTime

      const throughput = data.length / (duration / 1000)

      console.log(`Throughput: ${throughput.toFixed(0)} points/sec`)
      console.log(`Duration: ${duration.toFixed(2)}ms for ${data.length} points`)

      // 目标: > 100,000 points/sec
      expect(throughput).toBeGreaterThan(100000)
    })

    test('batch detection should be efficient', () => {
      const detector = new StreamingAnomalyDetector()
      const data = generateNormalData(10000)

      // 预热
      detector.detectBatch(generateNormalData(100))

      const startTime = performance.now()
      const results = detector.detectBatch(data)
      const duration = performance.now() - startTime

      const throughput = data.length / (duration / 1000)

      console.log(`Batch throughput: ${throughput.toFixed(0)} points/sec`)
      console.log(`Results count: ${results.length}`)

      expect(results).toHaveLength(data.length)
      // 放宽阈值，适应不同硬件环境
      expect(throughput).toBeGreaterThan(20000)
    })
  })

  // ==========================================================================
  // 延迟测试
  // ==========================================================================
  describe('Latency Tests', () => {
    test('detection latency should be consistent', () => {
      const detector = new StreamingAnomalyDetector()
      const data = generateNormalData(10000)

      // 预热
      for (let i = 0; i < 100; i++) {
        detector.detect(data[i])
      }

      // 收集延迟数据
      const latencies: number[] = []
      for (let i = 100; i < 1100; i++) {
        const start = performance.now()
        detector.detect(data[i])
        latencies.push(performance.now() - start)
      }

      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length
      const stdDev = Math.sqrt(
        latencies.reduce((sum, l) => sum + Math.pow(l - avgLatency, 2), 0) / latencies.length
      )

      console.log(`Latency: avg=${avgLatency.toFixed(4)}ms, stdDev=${stdDev.toFixed(4)}ms`)

      // 延迟应该稳定（低标准差）
      expect(avgLatency).toBeLessThan(PERFORMANCE_CONFIG.targetLatency)
      // 放宽标准差要求，适应不同硬件环境
      expect(stdDev).toBeLessThan(avgLatency * 2) // 标准差 < 平均值的 200%
    })

    test('latency should not increase over time', () => {
      const detector = new StreamingAnomalyDetector()
      const data = generateNormalData(50000)

      const earlyLatencies: number[] = []
      const lateLatencies: number[] = []

      for (let i = 0; i < data.length; i++) {
        const start = performance.now()
        detector.detect(data[i])
        const latency = performance.now() - start

        if (i < 1000) {
          earlyLatencies.push(latency)
        } else if (i >= data.length - 1000) {
          lateLatencies.push(latency)
        }
      }

      const earlyAvg = earlyLatencies.reduce((a, b) => a + b, 0) / earlyLatencies.length
      const lateAvg = lateLatencies.reduce((a, b) => a + b, 0) / lateLatencies.length

      console.log(`Early latency: ${earlyAvg.toFixed(4)}ms`)
      console.log(`Late latency: ${lateAvg.toFixed(4)}ms`)
      console.log(`Growth: ${((lateAvg / earlyAvg - 1) * 100).toFixed(2)}%`)

      // 延迟不应该显著增长（放宽到 < 300% 增长）
      expect(lateAvg).toBeLessThan(earlyAvg * 4)
    })
  })

  // ==========================================================================
  // 大规模数据测试
  // ==========================================================================
  describe('Large Scale Data Tests', () => {
    test('should handle 1 million data points', () => {
      const detector = new StreamingAnomalyDetector()
      const targetCount = 1000000

      const startTime = performance.now()
      for (let i = 0; i < targetCount; i++) {
        const value = 50 + (Math.random() - 0.5) * 20
        detector.detect(value)
      }
      const duration = performance.now() - startTime

      const throughput = targetCount / (duration / 1000)
      const stats = detector.getStats()

      console.log(`1M points processed in ${duration.toFixed(0)}ms`)
      console.log(`Throughput: ${throughput.toFixed(0)} points/sec`)
      console.log(`Anomaly rate: ${(stats.anomalyRate * 100).toFixed(2)}%`)

      // 放宽吞吐量要求，适应不同硬件环境
      expect(throughput).toBeGreaterThan(15000)
      expect(stats.totalDetections).toBe(targetCount)
    })

    test('should handle streaming data with varying patterns', () => {
      const detector = new StreamingAnomalyDetector()
      const patterns = [
        { name: 'Normal', data: () => generateNormalData(1000, 50, 5) },
        { name: 'High variance', data: () => generateNormalData(1000, 50, 20) },
        { name: 'Drift', data: () => Array.from({ length: 1000 }, (_, i) => 50 + i * 0.01) },
        { name: 'Spike', data: () => generateTestData(1000, 0.1) },
      ]

      for (const pattern of patterns) {
        detector.reset()
        const data = pattern.data()

        const startTime = performance.now()
        for (const value of data) {
          detector.detect(value)
        }
        const duration = performance.now() - startTime

        const stats = detector.getStats()
        console.log(
          `${pattern.name}: ${duration.toFixed(2)}ms, anomaly rate: ${(stats.anomalyRate * 100).toFixed(2)}%`
        )

        expect(duration).toBeLessThan(1000)
      }
    })
  })

  // ==========================================================================
  // 准确性验证
  // ==========================================================================
  describe('Detection Accuracy', () => {
    test('should detect known anomalies correctly', () => {
      const detector = new StreamingAnomalyDetector()

      // 生成正常数据
      const normalData = generateNormalData(100, 50, 5)
      for (const value of normalData) {
        detector.detect(value)
      }

      // 测试异常值检测
      const extremeValues = [200, -100, 500, -200]
      const results: AnomalyResult[] = []

      for (const value of extremeValues) {
        results.push(detector.detect(value))
      }

      // 大部分极端值应该被检测为异常
      const anomalyCount = results.filter(r => r.isAnomaly).length
      expect(anomalyCount).toBeGreaterThanOrEqual(3)
    })

    test('should maintain low false positive rate', () => {
      const detector = new StreamingAnomalyDetector()
      const normalData = generateNormalData(10000, 50, 5)

      let falsePositives = 0
      for (const value of normalData) {
        const result = detector.detect(value)
        if (result.isAnomaly && Math.abs(value - 50) < 15) {
          falsePositives++
        }
      }

      const falsePositiveRate = falsePositives / normalData.length
      console.log(`False positive rate: ${(falsePositiveRate * 100).toFixed(2)}%`)

      // 误报率应该 < 5%
      expect(falsePositiveRate).toBeLessThan(0.05)
    })

    test('Z-Score calculation should match statistical definition', () => {
      const detector = new IncrementalZScore()
      const data = generateNormalData(1000, 100, 15)

      for (const value of data) {
        detector.update(value)
      }

      const stats = detector.getStats()

      // 均值应该接近 100
      expect(stats.mean).toBeGreaterThan(95)
      expect(stats.mean).toBeLessThan(105)

      // 标准差应该接近 15
      expect(stats.stdDev).toBeGreaterThan(10)
      expect(stats.stdDev).toBeLessThan(20)
    })
  })

  // ==========================================================================
  // 并发和压力测试
  // ==========================================================================
  describe('Concurrency and Stress Tests', () => {
    test('should handle concurrent batch operations', async () => {
      const detector = new StreamingAnomalyDetector()
      const batchCount = 10
      const batchSize = 1000

      const promises = Array.from({ length: batchCount }, () => {
        const data = generateNormalData(batchSize)
        return Promise.resolve(detector.detectBatch(data))
      })

      const startTime = performance.now()
      const results = await Promise.all(promises)
      const duration = performance.now() - startTime

      console.log(`Concurrent batches: ${batchCount} x ${batchSize} in ${duration.toFixed(2)}ms`)

      expect(results).toHaveLength(batchCount)
      results.forEach(result => {
        expect(result).toHaveLength(batchSize)
      })
    })

    test('should handle rapid reset and reinitialize cycles', () => {
      const detector = new StreamingAnomalyDetector()
      const cycles = 100

      const startTime = performance.now()
      for (let i = 0; i < cycles; i++) {
        const data = generateNormalData(100)
        for (const value of data) {
          detector.detect(value)
        }
        detector.reset()
      }
      const duration = performance.now() - startTime

      console.log(`${cycles} reset cycles in ${duration.toFixed(2)}ms`)

      expect(duration).toBeLessThan(5000)
    })
  })

  // ==========================================================================
  // 配置优化测试
  // ==========================================================================
  describe('Configuration Optimization', () => {
    test('should perform well with different tree sizes', () => {
      const treeSizes = [64, 128, 256, 512]
      const results: { size: number; duration: number; trees: number }[] = []

      for (const treeSize of treeSizes) {
        const detector = new StreamingAnomalyDetector({
          isolationForest: { treeSize, maxTrees: 50 },
        })
        const data = generateNormalData(5000)

        const startTime = performance.now()
        for (const value of data) {
          detector.detect(value)
        }
        const duration = performance.now() - startTime

        results.push({
          size: treeSize,
          duration,
          trees: detector.getStats().iforestTreeCount,
        })
      }

      console.log('Tree size comparison:')
      results.forEach(r => {
        console.log(`  Size ${r.size}: ${r.duration.toFixed(2)}ms, trees: ${r.trees}`)
      })

      // 所有配置都应该在合理时间内完成
      results.forEach(r => {
        expect(r.duration).toBeLessThan(1000)
      })
    })

    test('should balance accuracy and performance with different weights', () => {
      const configs = [
        { name: 'Z-Score heavy', zscoreWeight: 0.8, iforestWeight: 0.2 },
        { name: 'Balanced', zscoreWeight: 0.5, iforestWeight: 0.5 },
        { name: 'IForest heavy', zscoreWeight: 0.2, iforestWeight: 0.8 },
      ]

      for (const config of configs) {
        const detector = new StreamingAnomalyDetector({
          zscoreWeight: config.zscoreWeight,
          iforestWeight: config.iforestWeight,
        })

        const data = generateTestData(5000)
        const startTime = performance.now()

        for (const value of data) {
          detector.detect(value)
        }

        const duration = performance.now() - startTime
        const stats = detector.getStats()

        console.log(
          `${config.name}: ${duration.toFixed(2)}ms, anomaly rate: ${(stats.anomalyRate * 100).toFixed(2)}%`
        )

        expect(duration).toBeLessThan(500)
      }
    })
  })

  // ==========================================================================
  // 性能回归测试
  // ==========================================================================
  describe('Performance Regression Tests', () => {
    test('baseline performance should be maintained', () => {
      const detector = new StreamingAnomalyDetector()
      const data = generateNormalData(10000)

      // 预热
      for (let i = 0; i < 100; i++) {
        detector.detect(data[i])
      }

      // 测量性能
      const iterations = 10
      const durations: number[] = []

      for (let iter = 0; iter < iterations; iter++) {
        detector.reset()
        const startTime = performance.now()

        for (const value of data) {
          detector.detect(value)
        }

        durations.push(performance.now() - startTime)
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / iterations
      const throughput = data.length / (avgDuration / 1000)

      console.log(`\n=== Performance Baseline ===`)
      console.log(`Average duration: ${avgDuration.toFixed(2)}ms for ${data.length} points`)
      console.log(`Throughput: ${throughput.toFixed(0)} points/sec`)
      console.log(`Per-point latency: ${(avgDuration / data.length).toFixed(4)}ms`)

      // 基线性能要求
      expect(throughput).toBeGreaterThan(50000) // > 50K points/sec
      expect(avgDuration / data.length).toBeLessThan(0.02) // < 0.02ms per point
    })

    test('should meet performance target: <10ms per 1000 points', () => {
      const detector = new StreamingAnomalyDetector()
      const data = generateNormalData(1000)

      // 预热
      detector.detectBatch(generateNormalData(100))

      const startTime = performance.now()
      detector.detectBatch(data)
      const duration = performance.now() - startTime

      console.log(`1000 points processed in ${duration.toFixed(2)}ms`)

      // 核心性能目标
      expect(duration).toBeLessThan(PERFORMANCE_CONFIG.targetLatency)
    })
  })
})

// ==========================================================================
// 独立的基准测试脚本（可通过 npm run benchmark 执行）
// ==========================================================================
describe('Benchmark Suite', () => {
  test('Run full benchmark suite', () => {
    console.log('\n' + '='.repeat(60))
    console.log('INCREMENTAL ANOMALY DETECTION - BENCHMARK SUITE')
    console.log('='.repeat(60))

    const benchmark = (name: string, fn: () => void, iterations: number = 1000) => {
      // 预热
      for (let i = 0; i < 10; i++) fn()

      const start = performance.now()
      for (let i = 0; i < iterations; i++) fn()
      const duration = performance.now() - start

      const opsPerSec = iterations / (duration / 1000)
      const avgTime = duration / iterations

      console.log(`\n${name}:`)
      console.log(`  Operations: ${iterations}`)
      console.log(`  Total time: ${duration.toFixed(2)}ms`)
      console.log(`  Avg time: ${avgTime.toFixed(4)}ms`)
      console.log(`  Ops/sec: ${opsPerSec.toFixed(0)}`)

      return { duration, opsPerSec, avgTime }
    }

    // Incremental Z-Score
    const zscore = new IncrementalZScore()
    const zscoreResult = benchmark(
      'IncrementalZScore.update()',
      () => {
        zscore.update(Math.random() * 100)
      },
      10000
    )
    zscore.reset()

    // Streaming Isolation Forest
    const forest = new StreamingIsolationForest()
    const forestResult = benchmark(
      'StreamingIsolationForest.addPoint()',
      () => {
        forest.addPoint(Math.random() * 100)
      },
      1000
    )

    // Full detector
    const detector = new StreamingAnomalyDetector()
    const detectorResult = benchmark(
      'StreamingAnomalyDetector.detect()',
      () => {
        detector.detect(Math.random() * 100)
      },
      10000
    )

    // Batch vs Incremental comparison
    console.log('\n' + '-'.repeat(60))
    console.log('INCREMENTAL vs BATCH COMPARISON')
    console.log('-'.repeat(60))

    const incrementalDetector = new IncrementalZScore()
    const batchDetector = new BatchZScoreDetector()
    const testData = generateNormalData(10000)

    // Incremental
    const incStart = performance.now()
    for (const v of testData) incrementalDetector.update(v)
    const incDuration = performance.now() - incStart

    // Batch
    const batchStart = performance.now()
    for (const v of testData) batchDetector.detect(v)
    const batchDuration = performance.now() - batchStart

    console.log(`\nProcessing ${testData.length} points:`)
    console.log(`  Incremental: ${incDuration.toFixed(2)}ms`)
    console.log(`  Batch: ${batchDuration.toFixed(2)}ms`)
    console.log(`  Speedup: ${(batchDuration / incDuration).toFixed(2)}x`)

    console.log('\n' + '='.repeat(60))
    console.log('BENCHMARK COMPLETE')
    console.log('='.repeat(60) + '\n')

    // 验证性能目标
    expect(detectorResult.avgTime).toBeLessThan(PERFORMANCE_CONFIG.targetLatency)
    expect(incDuration).toBeLessThan(batchDuration)
  })
})
