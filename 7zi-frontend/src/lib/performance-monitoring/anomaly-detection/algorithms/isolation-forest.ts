/**
 * Isolation Forest Anomaly Detection Algorithm
 * 孤立森林异常检测算法 (简化实现)
 * 
 * 注：这是一个简化的实现，适用于单变量时间序列数据
 * 对于更复杂的场景，建议使用专业库如 isolation-forest
 */

import { MetricDataPoint, AnomalyDetection } from '../types';

export interface IsolationForestConfig {
  numTrees: number; // 树的数量
  subSamplingSize: number; // 子采样大小
  contamination: number; // 异常比例期望
}

export interface IsolationTree {
  splitFeature: number;
  splitValue: number;
  left: IsolationTree | null;
  right: IsolationTree | null;
  size: number;
  isLeaf: boolean;
}

const DEFAULT_CONFIG: IsolationForestConfig = {
  numTrees: 100,
  subSamplingSize: 256,
  contamination: 0.1,
};

/**
 * Build an isolation tree
 * 构建孤立树
 */
function buildTree(
  data: number[],
  maxHeight: number,
  currentHeight: number = 0
): IsolationTree {
  if (currentHeight >= maxHeight || data.length <= 1) {
    return {
      splitFeature: 0,
      splitValue: 0,
      left: null,
      right: null,
      size: data.length,
      isLeaf: true,
    };
  }

  // 随机选择分割值
  const min = Math.min(...data);
  const max = Math.max(...data);
  
  if (min === max) {
    return {
      splitFeature: 0,
      splitValue: min,
      left: null,
      right: null,
      size: data.length,
      isLeaf: true,
    };
  }

  const splitValue = min + Math.random() * (max - min);
  
  const leftData = data.filter((v) => v < splitValue);
  const rightData = data.filter((v) => v >= splitValue);

  return {
    splitFeature: 0,
    splitValue,
    left: buildTree(leftData, maxHeight, currentHeight + 1),
    right: buildTree(rightData, maxHeight, currentHeight + 1),
    size: data.length,
    isLeaf: false,
  };
}

/**
 * Path length in a tree
 * 计算路径长度
 */
function pathLength(value: number, tree: IsolationTree, currentPath: number = 0): number {
  if (tree.isLeaf) {
    return currentPath + averagePathLength(tree.size);
  }

  if (value < tree.splitValue) {
    return pathLength(value, tree.left!, currentPath + 1);
  } else {
    return pathLength(value, tree.right!, currentPath + 1);
  }
}

/**
 * Average path length for binary search tree
 * 二叉搜索树的平均路径长度
 */
function averagePathLength(n: number): number {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  
  // H(i) = ln(i) + 0.5772156649 (Euler's constant)
  const H = (n: number) => Math.log(n) + 0.5772156649;
  
  return 2 * H(n - 1) - (2 * (n - 1)) / n;
}

/**
 * Build isolation forest
 * 构建孤立森林
 */
export function buildIsolationForest(
  data: MetricDataPoint[],
  config: IsolationForestConfig = DEFAULT_CONFIG
): IsolationTree[] {
  const values = data.map((d) => d.value);
  const trees: IsolationTree[] = [];
  
  const maxHeight = Math.ceil(Math.log2(config.subSamplingSize));

  for (let i = 0; i < config.numTrees; i++) {
    // 子采样
    const subsample = values.length > config.subSamplingSize
      ? sampleWithoutReplacement(values, config.subSamplingSize)
      : values;
    
    const tree = buildTree(subsample, maxHeight);
    trees.push(tree);
  }

  return trees;
}

/**
 * Sample without replacement
 * 无放回采样
 */
function sampleWithoutReplacement(arr: number[], size: number): number[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, size);
}

/**
 * Calculate anomaly score
 * 计算异常分数
 */
export function calculateAnomalyScore(
  value: number,
  trees: IsolationTree[],
  sampleSize: number = 256
): number {
  if (trees.length === 0) return 0;

  const avgPathLength = trees.reduce((sum, tree) => {
    return sum + pathLength(value, tree);
  }, 0) / trees.length;

  const c = averagePathLength(sampleSize);
  
  // 异常分数：越接近 1 越异常
  const score = Math.pow(2, -avgPathLength / c);
  
  return score;
}

/**
 * Detect anomaly using isolation forest
 * 使用孤立森林检测异常
 */
export function detectAnomalyIsolationForest(
  value: number,
  trees: IsolationTree[],
  config: IsolationForestConfig = DEFAULT_CONFIG
): {
  isAnomaly: boolean;
  score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
} {
  const score = calculateAnomalyScore(value, trees, config.subSamplingSize);
  
  // 根据 contamination 确定阈值
  const threshold = 1 - config.contamination;
  
  const isAnomaly = score > threshold;
  
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (score > 0.95) {
    severity = 'critical';
  } else if (score > 0.9) {
    severity = 'high';
  } else if (score > 0.85) {
    severity = 'medium';
  }

  return {
    isAnomaly,
    score,
    severity,
  };
}

/**
 * Train and detect in one step
 * 一步训练并检测
 */
export function trainAndDetect(
  history: MetricDataPoint[],
  newValue: number,
  config: IsolationForestConfig = DEFAULT_CONFIG
): {
  isAnomaly: boolean;
  score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
} {
  if (history.length < 10) {
    return { isAnomaly: false, score: 0, severity: 'low' };
  }

  const trees = buildIsolationForest(history, config);
  return detectAnomalyIsolationForest(newValue, trees, config);
}
