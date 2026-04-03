/**
 * 异常检测算法性能基准测试
 * 
 * 对比增量式算法与传统批处理算法的性能差异
 */

import {
  StreamingAnomalyDetector,
  IncrementalZScore,
  StreamingIsolationForest,
  BatchZScoreDetector,
  AnomalyResult
} from './src/lib/performance/incremental-anomaly-detector';

// ============================================================================
// 测试数据生成
// ============================================================================

interface TestData {
  name: string;
  data: number[];
  anomalies: number[]; // 已知的异常值索引
}

/**
 * 生成正态分布数据
 */
function generateNormalData(count: number, mean: number = 100, stdDev: number = 10): number[] {
  const data: number[] = [];
  for (let i = 0; i < count; i++) {
    // Box-Muller 变换
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    data.push(mean + z * stdDev);
  }
  return data;
}

/**
 * 生成带异常值的测试数据
 */
function generateDataWithAnomalies(
  count: number,
  anomalyRate: number = 0.05,
  anomalyMultiplier: number = 5
): TestData {
  const data = generateNormalData(count);
  const anomalies: number[] = [];
  
  // 随机注入异常值
  for (let i = 0; i < count * anomalyRate; i++) {
    const idx = Math.floor(Math.random() * count);
    const isHigh = Math.random() > 0.5;
    // 异常值偏离均值 5 个标准差
    data[idx] = isHigh ? 150 + Math.random() * 50 : 50 - Math.random() * 50;
    anomalies.push(idx);
  }
  
  return {
    name: `Normal + ${(anomalyRate * 100).toFixed(1)}% Anomalies`,
    data,
    anomalies
  };
}

/**
 * 生成时间序列数据（有趋势和季节性）
 */
function generateTimeSeriesData(count: number): TestData {
  const data: number[] = [];
  const anomalies: number[] = [];
  
  for (let i = 0; i < count; i++) {
    // 基础趋势
    const trend = i * 0.01;
    // 季节性
    const seasonal = 10 * Math.sin(i / 20);
    // 噪声
    const noise = (Math.random() - 0.5) * 5;
    
    data.push(100 + trend + seasonal + noise);
    
    // 偶尔添加异常
    if (Math.random() < 0.02) {
      data[i] += (Math.random() > 0.5 ? 1 : -1) * 50;
      anomalies.push(i);
    }
  }
  
  return {
    name: 'Time Series with Trend & Seasonality',
    data,
    anomalies
  };
}

/**
 * 生成突变数据
 */
function generateSuddenChangeData(count: number): TestData {
  const data: number[] = [];
  const anomalies: number[] = [];
  
  const changePoint = Math.floor(count * 0.6);
  
  for (let i = 0; i < count; i++) {
    if (i < changePoint) {
      data.push(100 + (Math.random() - 0.5) * 20);
    } else {
      data.push(200 + (Math.random() - 0.5) * 20);
      if (i < changePoint + 10) {
        anomalies.push(i);
      }
    }
  }
  
  return {
    name: 'Sudden Change at 60%',
    data,
    anomalies
  };
}

// ============================================================================
// 性能测量工具
// ============================================================================

interface BenchmarkResult {
  name: string;
  totalTimeMs: number;
  avgTimePerPointMs: number;
  throughput: number; // points per second
  memoryUsageMB: number;
}

function measurePerformance(
  name: string,
  fn: () => void,
  iterations: number = 1
): BenchmarkResult {
  // 强制垃圾回收（如果可用）
  if (global.gc) {
    global.gc();
  }
  
  const memBefore = process.memoryUsage().heapUsed;
  
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  
  const end = performance.now();
  const memAfter = process.memoryUsage().heapUsed;
  
  const totalTimeMs = end - start;
  
  return {
    name,
    totalTimeMs,
    avgTimePerPointMs: totalTimeMs / iterations,
    throughput: (iterations / totalTimeMs) * 1000,
    memoryUsageMB: (memAfter - memBefore) / 1024 / 1024
  };
}

// ============================================================================
// 测试用例
// ============================================================================

interface TestCase {
  detectorName: string;
  detector: StreamingAnomalyDetector | BatchZScoreDetector | IncrementalZScore;
  detectFn: (value: number) => any;
}

function runBenchmark(
  testData: TestData,
  iterations: number = 1000
): void {
  console.log('\n' + '='.repeat(80));
  console.log(`📊 Test Data: ${testData.name}`);
  console.log(`   Points: ${testData.data.length}, Known Anomalies: ${testData.anomalies.length}`);
  console.log('='.repeat(80));
  
  // 1. 增量式 Z-Score
  const incrementalZScore = new IncrementalZScore({ threshold: 3, minSamples: 10 });
  const incZScoreResult = measurePerformance(
    'IncrementalZScore',
    () => {
      incrementalZScore.reset();
      testData.data.forEach(v => incrementalZScore.update(v));
    },
    iterations
  );
  
  // 2. 传统批处理 Z-Score
  const batchZScore = new BatchZScoreDetector({ threshold: 3, minSamples: 10 });
  const batchZScoreResult = measurePerformance(
    'BatchZScore',
    () => {
      batchZScore.reset();
      testData.data.forEach(v => batchZScore.detect(v));
    },
    iterations
  );
  
  // 3. 流式异常检测器（组合）
  const streamingDetector = new StreamingAnomalyDetector({
    zscore: { threshold: 3, minSamples: 10 },
    isolationForest: { treeSize: 256, maxTrees: 100 },
    windowSize: 1000
  });
  const streamingResult = measurePerformance(
    'StreamingAnomalyDetector (Combined)',
    () => {
      streamingDetector.reset();
      testData.data.forEach(v => streamingDetector.detect(v));
    },
    iterations
  );
  
  // 打印结果
  console.log('\n📈 Performance Results:\n');
  console.log('| Algorithm | Total Time (ms) | Avg/Point (ms) | Throughput (pts/s) | Memory (MB) |');
  console.log('|-----------|-----------------|----------------|-------------------|-------------|');
  
  const results = [incZScoreResult, batchZScoreResult, streamingResult];
  results.forEach(r => {
    console.log(
      `| ${r.name.padEnd(30)} | ${r.totalTimeMs.toFixed(2).padStart(14)} | ` +
      `${r.avgTimePerPointMs.toFixed(4).padStart(14)} | ` +
      `${r.throughput.toFixed(0).padStart(17)} | ` +
      `${r.memoryUsageMB.toFixed(2).padStart(11)} |`
    );
  });
  
  // 计算加速比
  console.log('\n🚀 Speedup Analysis:\n');
  const speedupVsBatch = batchZScoreResult.totalTimeMs / incZScoreResult.totalTimeMs;
  const speedupStreamingVsBatch = batchZScoreResult.totalTimeMs / streamingResult.totalTimeMs;
  
  console.log(`   IncrementalZScore vs Batch: ${speedupVsBatch.toFixed(2)}x faster`);
  console.log(`   StreamingDetector vs Batch: ${speedupStreamingVsBatch.toFixed(2)}x faster`);
  
  // 准确性测试
  console.log('\n🎯 Accuracy Analysis:\n');
  
  // 重置并运行一次以获取准确率数据
  incrementalZScore.reset();
  batchZScore.reset();
  streamingDetector.reset();
  
  let incAnomalies = 0;
  let batchAnomalies = 0;
  let streamAnomalies = 0;
  
  testData.data.forEach(v => {
    const incResult = incrementalZScore.update(v);
    const batchResult = batchZScore.detect(v);
    const streamResult = streamingDetector.detect(v);
    
    if (incResult.isAnomaly) incAnomalies++;
    if (batchResult.isAnomaly) batchAnomalies++;
    if (streamResult.isAnomaly) streamAnomalies++;
  });
  
  const anomalyRate = (testData.anomalies.length / testData.data.length * 100).toFixed(2);
  
  console.log(`   Expected anomaly rate: ${anomalyRate}%`);
  console.log(`   IncrementalZScore detected: ${(incAnomalies / testData.data.length * 100).toFixed(2)}%`);
  console.log(`   BatchZScore detected: ${(batchAnomalies / testData.data.length * 100).toFixed(2)}%`);
  console.log(`   StreamingDetector detected: ${(streamAnomalies / testData.data.length * 100).toFixed(2)}%`);
}

// ============================================================================
// 主测试
// ============================================================================

async function main() {
  console.log('🔍 Anomaly Detection Algorithm Benchmark');
  console.log('='.repeat(80));
  console.log(`Node.js Version: ${process.version}`);
  console.log(`Platform: ${process.platform} ${process.arch}`);
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('='.repeat(80));
  
  // 测试数据集
  const testDatasets: TestData[] = [
    generateDataWithAnomalies(1000, 0.05),
    generateDataWithAnomalies(10000, 0.03),
    generateTimeSeriesData(5000),
    generateSuddenChangeData(3000)
  ];
  
  // 运行基准测试
  for (const dataset of testDatasets) {
    runBenchmark(dataset, 100);
  }
  
  // 大规模压力测试
  console.log('\n' + '='.repeat(80));
  console.log('🔥 Stress Test: Large Dataset (100,000 points)');
  console.log('='.repeat(80));
  
  const largeDataset = generateDataWithAnomalies(100000, 0.02);
  runBenchmark(largeDataset, 10);
  
  // 内存使用分析
  console.log('\n' + '='.repeat(80));
  console.log('💾 Memory Usage Analysis');
  console.log('='.repeat(80));
  
  // 增量式算法的内存是 O(1)
  console.log('\n   IncrementalZScore: O(1) memory (constant)');
  console.log('   StreamingIsolationForest: O(treeSize × maxTrees) ≈ O(25,600) for default config');
  console.log('   BatchZScore: O(n) memory (stores all data)');
  
  // 最终建议
  console.log('\n' + '='.repeat(80));
  console.log('✅ Recommendations');
  console.log('='.repeat(80));
  console.log(`
  1. Use IncrementalZScore for:
     - Real-time monitoring systems
     - Low-latency requirements (<1ms per point)
     - Memory-constrained environments
  
  2. Use StreamingAnomalyDetector (combined) for:
     - Higher accuracy requirements
     - Complex data patterns (trends, seasonality)
     - When both speed and accuracy matter
  
  3. BatchZScore is NOT recommended for:
     - Streaming data (high latency)
     - Large datasets (memory issues)
     - Real-time applications
  `);
  
  console.log('\n✨ Benchmark Complete!\n');
}

// 运行测试
main().catch(console.error);
