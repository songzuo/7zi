/**
 * 快速性能基准测试
 * 专注于增量式算法性能验证
 */

import {
  IncrementalZScore,
  StreamingIsolationForest,
  StreamingAnomalyDetector,
  BatchZScoreDetector,
} from './src/lib/performance/incremental-anomaly-detector'

// 简单的伪随机数生成器
function createRandom(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
}

// 高精度计时
function measureTime<T>(fn: () => T): { result: T; timeMs: number } {
  const start = process.hrtime.bigint()
  const result = fn()
  const end = process.hrtime.bigint()
  const timeNs = Number(end - start)
  return { result, timeMs: timeNs / 1_000_000 }
}

async function main() {
  console.log('='.repeat(80))
  console.log('增量式异常检测算法 - 快速性能基准测试')
  console.log('目标: 从 ~50ms 降低到 <10ms')
  console.log('='.repeat(80))
  console.log()

  const now = new Date().toISOString()

  // 测试配置
  const testSizes = [1000, 10000, 50000]
  const results: any[] = []

  for (const size of testSizes) {
    console.log(`\n测试数据量: ${size.toLocaleString()}`)
    console.log('-'.repeat(60))

    // 生成测试数据
    const random = createRandom(42)
    const data: number[] = []
    for (let i = 0; i < size; i++) {
      // 正态分布模拟
      const u1 = random()
      const u2 = random()
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      data.push(100 + z * 15 + (random() < 0.03 ? (random() - 0.5) * 100 : 0))
    }

    // 1. 增量式 Z-Score
    const zscore = new IncrementalZScore({ threshold: 3, minSamples: 10 })
    const { timeMs: zscoreTime } = measureTime(() => {
      for (const v of data) zscore.update(v)
    })

    // 2. 流式 Isolation Forest
    const iforest = new StreamingIsolationForest({ treeSize: 256, maxTrees: 100 })
    const { timeMs: iforestTime } = measureTime(() => {
      for (const v of data) {
        iforest.addPoint(v)
        iforest.anomalyScore(v)
      }
    })

    // 3. 组合检测器
    const streamingDetector = new StreamingAnomalyDetector({
      zscore: { threshold: 3 },
      isolationForest: { treeSize: 256, maxTrees: 100 },
    })
    const { timeMs: streamingTime } = measureTime(() => {
      for (const v of data) streamingDetector.detect(v)
    })

    // 4. 批处理 Z-Score (只对小数据集)
    let batchTime = 0
    if (size <= 10000) {
      const batchDetector = new BatchZScoreDetector({ threshold: 3, minSamples: 10 })
      const result = measureTime(() => {
        for (const v of data) batchDetector.detect(v)
      })
      batchTime = result.timeMs
    }

    const result = {
      size,
      zscoreTime,
      zscoreAvg: zscoreTime / size,
      iforestTime,
      iforestAvg: iforestTime / size,
      streamingTime,
      streamingAvg: streamingTime / size,
      batchTime,
      batchAvg: batchTime > 0 ? batchTime / size : null,
    }

    results.push(result)

    console.log(
      `  增量式 Z-Score:    ${result.zscoreAvg.toFixed(3)} ms/point (${result.zscoreTime.toFixed(1)}ms total)`
    )
    console.log(
      `  流式 Isolation Forest: ${result.iforestAvg.toFixed(3)} ms/point (${result.iforestTime.toFixed(1)}ms total)`
    )
    console.log(
      `  组合检测器:        ${result.streamingAvg.toFixed(3)} ms/point (${result.streamingTime.toFixed(1)}ms total)`
    )
    if (batchTime > 0) {
      console.log(
        `  批处理 Z-Score:    ${result.batchAvg!.toFixed(3)} ms/point (${batchTime.toFixed(1)}ms total)`
      )
      console.log(`  性能提升:          ${(result.batchAvg! / result.zscoreAvg).toFixed(1)}x`)
    }
  }

  // 目标检查
  const lastResult = results[results.length - 1]
  const targetMet = lastResult.streamingAvg < 10

  console.log('\n' + '='.repeat(80))
  console.log('性能目标检查')
  console.log('='.repeat(80))
  console.log(`\n  目标延迟: <10 ms/point`)
  console.log(`  实际延迟 (组合检测器): ${lastResult.streamingAvg.toFixed(3)} ms/point`)
  console.log(`  增量式 Z-Score: ${lastResult.zscoreAvg.toFixed(3)} ms/point`)
  console.log(`  状态: ${targetMet ? '✅ 目标达成!' : '❌ 未达成目标'}`)

  // 生成报告
  const report = `# 异常检测算法性能优化报告

## 概述

**日期**: ${now}
**目标**: 将异常检测延迟从 ~50ms 降低到 <10ms
**状态**: ${targetMet ? '✅ 目标达成' : '⚠️ 需要进一步优化'}

## 实现内容

### 1. 增量式 Z-Score (IncrementalZScore)

使用 Welford's Online Algorithm 实现单次遍历计算均值和方差:

\`\`\`typescript
export class IncrementalZScore {
  // 时间复杂度: O(1) 每次 update
  // 空间复杂度: O(1)
  update(value: number): { zScore: number; isAnomaly: boolean }
}
\`\`\`

**核心算法**:
- 新均值 = 旧均值 + (新值 - 旧均值) / n
- 新 M2 = 旧 M2 + (新值 - 旧均值) * (新值 - 新均值)
- 方差 = M2 / (n - 1)

### 2. 流式 Isolation Forest (StreamingIsolationForest)

每 256 个点增量训练一棵树，保持最多 100 棵树:

\`\`\`typescript
export class StreamingIsolationForest {
  addPoint(value: number): void
  anomalyScore(value: number): number // 0-1 分数
}
\`\`\`

### 3. 组合检测器 (StreamingAnomalyDetector)

结合两种方法的优势:
- Z-Score 作为主要检测（快速响应）
- Isolation Forest 作为辅助（更鲁棒）
- 支持滑动窗口自适应

\`\`\`typescript
export class StreamingAnomalyDetector {
  detect(value: number): AnomalyResult
}
\`\`\`

## 性能测试结果

| 数据量 | Z-Score (ms/pt) | Isolation Forest (ms/pt) | 组合检测器 (ms/pt) | 批处理 (ms/pt) |
|--------|-----------------|-------------------------|-------------------|----------------|
${results.map(r => `| ${r.size.toLocaleString()} | ${r.zscoreAvg.toFixed(3)} | ${r.iforestAvg.toFixed(3)} | ${r.streamingAvg.toFixed(3)} | ${r.batchAvg?.toFixed(3) ?? 'N/A'} |`).join('\n')}

## 性能提升分析

${results
  .filter(r => r.batchAvg)
  .map(
    r => `
### ${r.size.toLocaleString()} 数据点

- 增量式 Z-Score vs 批处理: **${(r.batchAvg / r.zscoreAvg).toFixed(1)}x 更快**
- 组合检测器 vs 批处理: **${(r.batchAvg / r.streamingAvg).toFixed(1)}x 更快**
`
  )
  .join('\n')}

## 目标达成情况

| 指标 | 目标 | 实际 | 状态 |
|------|------|------|------|
| 单点延迟 | <10ms | ${lastResult.streamingAvg.toFixed(3)}ms | ${lastResult.streamingAvg < 10 ? '✅' : '❌'} |
| 增量式 Z-Score 延迟 | - | ${lastResult.zscoreAvg.toFixed(3)}ms | ✅ 极快 |

## 文件结构

\`\`\`
src/lib/performance/incremental-anomaly-detector.ts
├── IncrementalZScore          # 增量式 Z-Score (核心)
├── StreamingIsolationForest   # 流式 Isolation Forest
├── StreamingAnomalyDetector   # 组合检测器
├── BatchZScoreDetector        # 传统批处理 (对比用)
└── 辅助函数和类型定义
\`\`\`

## 使用示例

\`\`\`typescript
import { StreamingAnomalyDetector } from './lib/performance/incremental-anomaly-detector';

// 创建检测器
const detector = new StreamingAnomalyDetector({
  zscore: { threshold: 3 },
  isolationForest: { treeSize: 256, maxTrees: 100 },
  windowSize: 1000
});

// 实时检测
for (const value of dataStream) {
  const result = detector.detect(value);
  if (result.isAnomaly) {
    console.log(\`异常! 值: \${value}, Z-Score: \${result.zScore.toFixed(2)}, 置信度: \${result.confidence.toFixed(2)}\`);
  }
}
\`\`\`

## 结论

${
  targetMet
    ? `**目标已达成!** 组合检测器平均延迟 ${lastResult.streamingAvg.toFixed(3)}ms，远低于 10ms 目标。

增量式 Z-Score 单独使用时性能极佳 (${lastResult.zscoreAvg.toFixed(3)}ms/point)，适合对实时性要求极高的场景。`
    : `当前组合检测器平均延迟 ${lastResult.streamingAvg.toFixed(3)}ms，建议:
1. 简化 Isolation Forest 树深度
2. 减少树的数量
3. 或仅使用增量式 Z-Score`
}

---

*报告生成时间: ${now}*
`

  const fs = require('fs')
  fs.writeFileSync('/root/.openclaw/workspace/REPORT_ANOMALY_DETECTOR_20260403.md', report)
  console.log('\n报告已生成: /root/.openclaw/workspace/REPORT_ANOMALY_DETECTOR_20260403.md')
}

main().catch(console.error)
