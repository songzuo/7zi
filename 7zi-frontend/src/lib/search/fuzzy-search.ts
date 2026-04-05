/**
 * Smart Search - 模糊搜索算法
 * 基于 Levenshtein 距离的模糊匹配
 */

export interface FuzzySearchOptions {
  /** 最大编辑距离 (默认 2) */
  threshold?: number;
  /** 仅前缀匹配 (默认 false) */
  prefixOnly?: boolean;
  /** 忽略大小写 (默认 true) */
  ignoreCase?: boolean;
}

export interface FuzzyMatchResult {
  /** 是否匹配 */
  matched: boolean;
  /** 匹配分数 (0-1, 1为完全匹配) */
  score: number;
  /** 匹配的字符索引位置 */
  matchedIndices: number[];
  /** 编辑距离 */
  distance: number;
}

/**
 * 计算 Levenshtein 编辑距离
 * @param str1 字符串1
 * @param str2 字符串2
 * @returns 编辑距离
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // 优化：如果任一字符串为空，返回另一个的长度
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  // 优化：如果长度差超过阈值，直接返回
  if (len1 < len2) {
    return levenshteinDistance(str2, str1);
  }

  // 创建二维数组
  const matrix: number[][] = [];

  // 初始化第一行和第一列
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // 动态规划计算编辑距离
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,    // 删除
          matrix[i][j - 1] + 1,    // 插入
          matrix[i - 1][j - 1] + 1 // 替换
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * 检查是否为前缀匹配
 * @param text 目标文本
 * @param query 查询文本
 * @param ignoreCase 是否忽略大小写
 * @returns 是否匹配
 */
function isPrefixMatch(text: string, query: string, ignoreCase: boolean): boolean {
  const compareText = ignoreCase ? text.toLowerCase() : text;
  const compareQuery = ignoreCase ? query.toLowerCase() : query;
  return compareText.startsWith(compareQuery);
}

/**
 * 计算匹配分数
 * @param distance 编辑距离
 * @param queryLength 查询长度
 * @param textLength 文本长度
 * @returns 分数 (0-1)
 */
function calculateScore(distance: number, queryLength: number, textLength: number): number {
  if (queryLength === 0) return 0;
  const maxDistance = Math.max(queryLength, textLength);
  return Math.max(0, 1 - distance / maxDistance);
}

/**
 * 获取匹配的字符索引位置
 * @param text 文本
 * @param query 查询
 * @param ignoreCase 是否忽略大小写
 * @returns 匹配的索引数组
 */
function getMatchedIndices(text: string, query: string, ignoreCase: boolean): number[] {
  const indices: number[] = [];
  const compareText = ignoreCase ? text.toLowerCase() : text;
  const compareQuery = ignoreCase ? query.toLowerCase() : query;

  // 简单实现：找到所有匹配的字符位置
  for (let i = 0; i < compareText.length; i++) {
    const char = compareText[i];
    for (let j = 0; j < compareQuery.length; j++) {
      if (char === compareQuery[j] && !indices.includes(i)) {
        indices.push(i);
        break;
      }
    }
  }

  return indices;
}

/**
 * 模糊匹配主函数
 * @param text 目标文本
 * @param query 查询文本
 * @param options 可选配置
 * @returns 匹配结果
 */
export function fuzzyMatch(
  text: string,
  query: string,
  options: FuzzySearchOptions = {}
): FuzzyMatchResult {
  const {
    threshold = 2,
    prefixOnly = false,
    ignoreCase = true
  } = options;

  // 空查询返回不匹配
  if (!query || query.length === 0) {
    return {
      matched: false,
      score: 0,
      matchedIndices: [],
      distance: 0
    };
  }

  const compareText = ignoreCase ? text.toLowerCase() : text;
  const compareQuery = ignoreCase ? query.toLowerCase() : query;

  // 前缀匹配模式
  if (prefixOnly) {
    const matched = isPrefixMatch(compareText, compareQuery, false);
    const distance = matched ? 0 : compareText.length;
    const score = matched ? 1 : 0;
    const matchedIndices = matched
      ? Array.from({ length: compareQuery.length }, (_, i) => i)
      : [];

    return { matched, score, matchedIndices, distance };
  }

  // 完全匹配
  if (compareText === compareQuery) {
    return {
      matched: true,
      score: 1,
      matchedIndices: Array.from({ length: compareText.length }, (_, i) => i),
      distance: 0
    };
  }

  // 计算编辑距离
  const distance = levenshteinDistance(compareText, compareQuery);

  // 检查是否超过阈值
  if (distance > threshold) {
    return {
      matched: false,
      score: 0,
      matchedIndices: [],
      distance
    };
  }

  // 计算分数
  const score = calculateScore(distance, compareQuery.length, compareText.length);

  // 获取匹配位置（使用 compareText 和 compareQuery）
  const matchedIndices = getMatchedIndices(compareText, compareQuery, ignoreCase);

  return {
    matched: distance <= threshold, // 使用距离阈值判断是否匹配
    score,
    matchedIndices,
    distance
  };
}

/**
 * 批量模糊匹配
 * @param items 文本数组
 * @param query 查询文本
 * @param options 可选配置
 * @returns 匹配结果数组（按分数降序排序）
 */
export function fuzzyMatchItems<T extends { text?: string }>(
  items: T[],
  query: string,
  options: FuzzySearchOptions & {
    getText?: (item: T) => string;
  } = {}
): (FuzzyMatchResult & { item: T })[] {
  const { getText = (item) => item.text || '', ...searchOptions } = options;

  const results = items.map((item) => {
    const text = getText(item);
    const matchResult = fuzzyMatch(text, query, searchOptions);
    return {
      ...matchResult,
      item
    };
  });

  // 过滤并排序
  return results
    .filter((result) => result.matched)
    .sort((a, b) => b.score - a.score);
}

/**
 * 检查文本是否包含所有查询词（AND 逻辑）
 * @param text 文本
 * @param queries 查询词数组
 * @param options 可选配置
 * @returns 匹配结果
 */
export function fuzzyMatchAll(
  text: string,
  queries: string[],
  options: FuzzySearchOptions = {}
): FuzzyMatchResult {
  if (queries.length === 0) {
    return {
      matched: true,
      score: 1,
      matchedIndices: [],
      distance: 0
    };
  }

  const results = queries.map((query) => fuzzyMatch(text, query, options));
  const allMatched = results.every((r) => r.matched);
  const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  const allIndices = results.flatMap((r) => r.matchedIndices);

  return {
    matched: allMatched,
    score: averageScore,
    matchedIndices: [...new Set(allIndices)].sort((a, b) => a - b),
    distance: results.reduce((sum, r) => sum + r.distance, 0)
  };
}

/**
 * 检查文本是否包含任一查询词（OR 逻辑）
 * @param text 文本
 * @param queries 查询词数组
 * @param options 可选配置
 * @returns 匹配结果
 */
export function fuzzyMatchAny(
  text: string,
  queries: string[],
  options: FuzzySearchOptions = {}
): FuzzyMatchResult {
  if (queries.length === 0) {
    return {
      matched: false,
      score: 0,
      matchedIndices: [],
      distance: 0
    };
  }

  const results = queries.map((query) => fuzzyMatch(text, query, options));
  const anyMatched = results.some((r) => r.matched);
  const bestResult = results.reduce((best, current) =>
    current.score > best.score ? current : best
  );

  return {
    matched: anyMatched,
    score: bestResult.score,
    matchedIndices: bestResult.matchedIndices,
    distance: bestResult.distance
  };
}
