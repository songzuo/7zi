/**
 * 增量式异常检测算法实现
 * 
 * 使用 Welford's Online Algorithm 实现增量式 Z-Score 计算
 * 配合流式 Isolation Forest 提供更鲁棒的异常检测
 * 
 * 性能目标: 从 ~50ms 降到 <10ms
 */

// ============================================================================
// 类型定义
// ============================================================================

export interface AnomalyResult {
  value: number;
  zScore: number;
  isAnomaly: boolean;
  anomalyScore: number; // 0-1, Isolation Forest 分数
  confidence: number; // 综合置信度
  method: 'zscore' | 'isolation_forest' | 'combined';
}

export interface IncrementalZScoreConfig {
  threshold?: number; // Z-Score 阈值，默认 3
  minSamples?: number; // 最小样本数才开始检测，默认 10
}

export interface StreamingIsolationForestConfig {
  treeSize?: number; // 每棵树的样本数，默认 256
  maxTrees?: number; // 最大树数，默认 100
  subsampleSize?: number; // 子采样大小，默认 256
}

export interface StreamingAnomalyDetectorConfig {
  zscore?: IncrementalZScoreConfig;
  isolationForest?: StreamingIsolationForestConfig;
  windowSize?: number; // 滑动窗口大小，默认 1000
  zscoreWeight?: number; // Z-Score 权重，默认 0.6
  iforestWeight?: number; // Isolation Forest 权重，默认 0.4
}

// ============================================================================
// 增量式 Z-Score (Welford's Online Algorithm)
// ============================================================================

/**
 * 使用 Welford's Online Algorithm 单次遍历计算均值和方差
 * 时间复杂度: O(1) 每次 update
 * 空间复杂度: O(1)
 */
export class IncrementalZScore {
  private count: number = 0;
  private mean: number = 0;
  private m2: number = 0; // 用于计算方差的中间值
  private threshold: number;
  private minSamples: number;

  constructor(config: IncrementalZScoreConfig = {}) {
    this.threshold = config.threshold ?? 3;
    this.minSamples = config.minSamples ?? 10;
  }

  /**
   * 增量更新统计数据并返回 Z-Score
   * Welford's algorithm:
   * - 新均值 = 旧均值 + (新值 - 旧均值) / n
   * - 新 M2 = 旧 M2 + (新值 - 旧均值) * (新值 - 新均值)
   */
  update(value: number): { zScore: number; isAnomaly: boolean; mean: number; stdDev: number } {
    this.count++;
    
    // Welford's algorithm for online mean and variance
    const delta = value - this.mean;
    this.mean += delta / this.count;
    const delta2 = value - this.mean;
    this.m2 += delta * delta2;

    // 计算标准差
    const variance = this.count > 1 ? this.m2 / (this.count - 1) : 0;
    const stdDev = Math.sqrt(variance);

    // 计算 Z-Score
    let zScore = 0;
    if (stdDev > 0) {
      zScore = (value - this.mean) / stdDev;
    }

    // 判断是否异常
    const isAnomaly = this.count >= this.minSamples && Math.abs(zScore) > this.threshold;

    return {
      zScore,
      isAnomaly,
      mean: this.mean,
      stdDev
    };
  }

  /**
   * 获取当前统计信息
   */
  getStats(): { count: number; mean: number; variance: number; stdDev: number } {
    const variance = this.count > 1 ? this.m2 / (this.count - 1) : 0;
    return {
      count: this.count,
      mean: this.mean,
      variance,
      stdDev: Math.sqrt(variance)
    };
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.count = 0;
    this.mean = 0;
    this.m2 = 0;
  }
}

// ============================================================================
// 流式 Isolation Forest (简化版)
// ============================================================================

interface IsolationTreeNode {
  splitValue?: number;
  left?: IsolationTreeNode;
  right?: IsolationTreeNode;
  size: number;
  isExternal: boolean;
}

/**
 * 流式 Isolation Forest 实现
 * 每 256 个点增量训练一棵树，保持最多 100 棵树
 */
export class StreamingIsolationForest {
  private trees: IsolationTreeNode[] = [];
  private buffer: number[] = [];
  private treeSize: number;
  private maxTrees: number;
  private maxDepth: number;
  
  constructor(config: StreamingIsolationForestConfig = {}) {
    this.treeSize = config.treeSize ?? 256;
    this.maxTrees = config.maxTrees ?? 100;
    this.maxDepth = Math.ceil(Math.log2(this.treeSize));
  }

  /**
   * 添加数据点，当缓冲区满时训练新树
   */
  addPoint(value: number): void {
    this.buffer.push(value);
    
    if (this.buffer.length >= this.treeSize) {
      // 训练新树
      const tree = this.buildTree(this.buffer.slice(0, this.treeSize), 0);
      this.trees.push(tree);
      
      // 保持最多 maxTrees 棵树
      if (this.trees.length > this.maxTrees) {
        this.trees.shift();
      }
      
      // 清空缓冲区
      this.buffer = [];
    }
  }

  /**
   * 构建 Isolation Tree
   */
  private buildTree(data: number[], depth: number): IsolationTreeNode {
    // 终止条件
    if (depth >= this.maxDepth || data.length <= 1) {
      return {
        size: data.length,
        isExternal: true
      };
    }

    // 随机选择分割值
    const min = Math.min(...data);
    const max = Math.max(...data);
    
    if (min === max) {
      return {
        size: data.length,
        isExternal: true
      };
    }

    const splitValue = min + Math.random() * (max - min);
    
    // 分割数据
    const leftData = data.filter(v => v < splitValue);
    const rightData = data.filter(v => v >= splitValue);

    return {
      splitValue,
      left: this.buildTree(leftData, depth + 1),
      right: this.buildTree(rightData, depth + 1),
      size: data.length,
      isExternal: false
    };
  }

  /**
   * 计算路径长度
   */
  private pathLength(value: number, node: IsolationTreeNode, depth: number): number {
    if (node.isExternal) {
      // 添加未完成路径的期望值
      return depth + this.c(node.size);
    }

    if (value < node.splitValue!) {
      return this.pathLength(value, node.left!, depth + 1);
    } else {
      return this.pathLength(value, node.right!, depth + 1);
    }
  }

  /**
   * 用于调整路径长度的函数
   */
  private c(n: number): number {
    if (n <= 1) return 0;
    if (n === 2) return 1;
    // H(i) ≈ ln(i) + 0.5772156649 (Euler's constant)
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
  }

  /**
   * 计算异常分数 (0-1)
   * 分数越高越可能是异常
   */
  anomalyScore(value: number): number {
    if (this.trees.length === 0) {
      return 0.5; // 无数据时返回中间值
    }

    // 计算平均路径长度
    let totalPathLength = 0;
    for (const tree of this.trees) {
      totalPathLength += this.pathLength(value, tree, 0);
    }
    const avgPathLength = totalPathLength / this.trees.length;

    // 归一化
    const cNorm = this.c(this.treeSize);
    if (cNorm === 0) return 0.5;

    // 异常分数 = 2^(-E(h)/c(n))
    const score = Math.pow(2, -avgPathLength / cNorm);
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * 获取当前树的数量
   */
  getTreeCount(): number {
    return this.trees.length;
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.trees = [];
    this.buffer = [];
  }
}

// ============================================================================
// 滑动窗口自适应检测器
// ============================================================================

/**
 * 滑动窗口统计计算
 */
class SlidingWindowStats {
  private window: number[] = [];
  private windowSize: number;
  private sum: number = 0;
  private sumSq: number = 0;

  constructor(windowSize: number) {
    this.windowSize = windowSize;
  }

  add(value: number): void {
    this.window.push(value);
    this.sum += value;
    this.sumSq += value * value;

    if (this.window.length > this.windowSize) {
      const removed = this.window.shift()!;
      this.sum -= removed;
      this.sumSq -= removed * removed;
    }
  }

  getStats(): { mean: number; stdDev: number; count: number } | null {
    if (this.window.length < 2) {
      return null;
    }

    const mean = this.sum / this.window.length;
    const variance = (this.sumSq - (this.sum * this.sum) / this.window.length) / (this.window.length - 1);
    
    return {
      mean,
      stdDev: Math.sqrt(Math.max(0, variance)),
      count: this.window.length
    };
  }

  reset(): void {
    this.window = [];
    this.sum = 0;
    this.sumSq = 0;
  }
}

// ============================================================================
// 组合流式异常检测器
// ============================================================================

/**
 * 组合检测器
 * - 使用增量 Z-Score 作为主要检测（快速响应）
 * - 使用流式 Isolation Forest 作为辅助（更鲁棒）
 * - 支持滑动窗口自适应
 */
export class StreamingAnomalyDetector {
  private zscore: IncrementalZScore;
  private isolationForest: StreamingIsolationForest;
  private windowStats: SlidingWindowStats;
  private config: Required<StreamingAnomalyDetectorConfig>;
  private detectionCount: number = 0;
  private anomalyCount: number = 0;

  constructor(config: StreamingAnomalyDetectorConfig = {}) {
    this.config = {
      zscore: config.zscore ?? {},
      isolationForest: config.isolationForest ?? {},
      windowSize: config.windowSize ?? 1000,
      zscoreWeight: config.zscoreWeight ?? 0.6,
      iforestWeight: config.iforestWeight ?? 0.4
    };

    this.zscore = new IncrementalZScore(this.config.zscore);
    this.isolationForest = new StreamingIsolationForest(this.config.isolationForest);
    this.windowStats = new SlidingWindowStats(this.config.windowSize);
  }

  /**
   * 检测数据点是否为异常
   */
  detect(value: number): AnomalyResult {
    this.detectionCount++;

    // 1. Z-Score 检测
    const zscoreResult = this.zscore.update(value);
    
    // 2. Isolation Forest 检测
    this.isolationForest.addPoint(value);
    const iforestScore = this.isolationForest.anomalyScore(value);

    // 3. 滑动窗口统计
    this.windowStats.add(value);
    const windowStats = this.windowStats.getStats();

    // 4. 综合判断
    let isAnomaly: boolean;
    let method: 'zscore' | 'isolation_forest' | 'combined';
    let confidence: number;

    // 置信度计算
    const zscoreConfidence = Math.min(1, Math.abs(zscoreResult.zScore) / this.config.zscore.threshold!);
    
    // 综合置信度
    confidence = zscoreConfidence * this.config.zscoreWeight + 
                 iforestScore * this.config.iforestWeight;

    // 异常判断逻辑
    if (zscoreResult.isAnomaly && iforestScore > 0.6) {
      // 两种方法都认为是异常，高置信度
      isAnomaly = true;
      method = 'combined';
      confidence = Math.min(1, confidence * 1.2); // 置信度提升
    } else if (zscoreResult.isAnomaly) {
      // Z-Score 认为是异常
      isAnomaly = true;
      method = 'zscore';
    } else if (iforestScore > 0.75) {
      // Isolation Forest 高置信度异常
      isAnomaly = true;
      method = 'isolation_forest';
    } else {
      isAnomaly = false;
      method = 'combined';
    }

    if (isAnomaly) {
      this.anomalyCount++;
    }

    return {
      value,
      zScore: zscoreResult.zScore,
      isAnomaly,
      anomalyScore: iforestScore,
      confidence,
      method
    };
  }

  /**
   * 批量检测
   */
  detectBatch(values: number[]): AnomalyResult[] {
    return values.map(v => this.detect(v));
  }

  /**
   * 获取检测统计
   */
  getStats(): {
    totalDetections: number;
    anomalyCount: number;
    anomalyRate: number;
    zscoreStats: ReturnType<IncrementalZScore['getStats']>;
    iforestTreeCount: number;
  } {
    return {
      totalDetections: this.detectionCount,
      anomalyCount: this.anomalyCount,
      anomalyRate: this.detectionCount > 0 ? this.anomalyCount / this.detectionCount : 0,
      zscoreStats: this.zscore.getStats(),
      iforestTreeCount: this.isolationForest.getTreeCount()
    };
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.zscore.reset();
    this.isolationForest.reset();
    this.windowStats.reset();
    this.detectionCount = 0;
    this.anomalyCount = 0;
  }
}

// ============================================================================
// 传统 Z-Score 检测器 (用于性能对比)
// ============================================================================

/**
 * 传统批处理 Z-Score 检测器
 * 需要存储所有历史数据，每次检测重新计算
 */
export class BatchZScoreDetector {
  private data: number[] = [];
  private threshold: number;
  private minSamples: number;

  constructor(config: { threshold?: number; minSamples?: number } = {}) {
    this.threshold = config.threshold ?? 3;
    this.minSamples = config.minSamples ?? 10;
  }

  /**
   * 检测数据点（需要重新计算整个数据集的统计量）
   */
  detect(value: number): { zScore: number; isAnomaly: boolean } {
    // 添加新值
    this.data.push(value);

    // 需要足够样本
    if (this.data.length < this.minSamples) {
      return { zScore: 0, isAnomaly: false };
    }

    // 批量计算均值和标准差
    const n = this.data.length;
    const sum = this.data.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    
    // 计算标准差
    const sumSqDiff = this.data.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
    const stdDev = Math.sqrt(sumSqDiff / (n - 1));

    // 计算 Z-Score
    const zScore = stdDev > 0 ? (value - mean) / stdDev : 0;
    const isAnomaly = Math.abs(zScore) > this.threshold;

    return { zScore, isAnomaly };
  }

  /**
   * 获取数据点数量
   */
  getCount(): number {
    return this.data.length;
  }

  /**
   * 重置
   */
  reset(): void {
    this.data = [];
  }
}

// ============================================================================
// 导出便捷函数
// ============================================================================

/**
 * 创建默认配置的流式异常检测器
 */
export function createStreamingAnomalyDetector(config?: StreamingAnomalyDetectorConfig): StreamingAnomalyDetector {
  return new StreamingAnomalyDetector(config);
}

/**
 * 快速检测单个值是否异常
 */
export function isAnomalyQuick(
  values: number[],
  newValue: number,
  threshold: number = 3
): boolean {
  if (values.length < 10) return false;
  
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sumSqDiff = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
  const stdDev = Math.sqrt(sumSqDiff / (n - 1));
  
  if (stdDev === 0) return false;
  
  const zScore = (newValue - mean) / stdDev;
  return Math.abs(zScore) > threshold;
}
