// @ts-nocheck
/**
 * @fileoverview 多字段联合搜索
 * @description 增强的多字段搜索功能，支持字段组合、加权评分、跨字段匹配
 */

import type { SearchConfig, SearchResult } from '@/types/search-filter'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 多字段搜索配置
 */
export interface MultiFieldSearchConfig extends Omit<SearchConfig, 'fields'> {
  /** 要搜索的字段及其配置 */
  fieldConfigs: FieldSearchConfig[]
  /** 是否要求所有字段都匹配（AND 逻辑） */
  requireAllFields?: boolean
  /** 最少匹配字段数（AND 逻辑的变体） */
  minMatchedFields?: number
  /** 跨字段短语匹配 */
  crossFieldPhraseMatch?: boolean
  /** 字段间权重差异惩罚 */
  fieldWeightVariancePenalty?: boolean
}

/**
 * 单个字段的搜索配置
 */
export interface FieldSearchConfig {
  /** 字段名称 */
  field: string
  /** 字段权重（默认 1.0） */
  weight?: number
  /** 是否必须匹配 */
  required?: boolean
  /** 是否精确匹配 */
  exactMatch?: boolean
  /** 是否启用模糊匹配 */
  fuzzyMatch?: boolean
  /** 模糊匹配阈值 */
  fuzzyThreshold?: number
  /** 是否启用拼音匹配 */
  pinyinMatch?: boolean
  /** 匹配时额外加分 */
  bonusScore?: number
  /** 字段描述（用于显示） */
  description?: string
}

/**
 * 多字段搜索结果扩展
 */
export interface MultiFieldSearchResult<T> extends SearchResult<T> {
  /** 各字段匹配详情 */
  fieldMatches: FieldMatch[]
  /** 是否满足所有必需字段 */
  meetsRequirements: boolean
  /** 跨字段相关性分数 */
  crossFieldScore: number
}

/**
 * 单个字段匹配结果
 */
export interface FieldMatch {
  /** 字段名 */
  field: string
  /** 是否匹配 */
  matched: boolean
  /** 匹配分数 */
  score: number
  /** 匹配类型 */
  matchType: 'exact' | 'substring' | 'fuzzy' | 'pinyin' | 'none'
  /** 匹配位置 */
  start?: number
  /** 匹配结束位置 */
  end?: number
  /** 高亮文本 */
  highlight?: string
}

// ============================================================================
// 多字段搜索核心函数
// ============================================================================

/**
 * 多字段联合搜索
 * @param items 要搜索的项目列表
 * @param query 搜索关键词
 * @param config 多字段搜索配置
 * @returns 多字段搜索结果
 */
export function multiFieldSearch<T extends object>(
  items: T[],
  query: string,
  config: MultiFieldSearchConfig
): MultiFieldSearchResult<T>[] {
  // 早期退出
  if (!query.trim()) {
    return items.map(item => ({
      item,
      matchedFields: [],
      highlights: [],
      score: 1,
      fieldMatches: [],
      meetsRequirements: false,
      crossFieldScore: 0,
    }))
  }

  if (items.length === 0 || config.fieldConfigs.length === 0) {
    return []
  }

  const results: MultiFieldSearchResult<T>[] = []
  const searchQuery = config.caseSensitive ? query : query.toLowerCase()
  const minMatchedFields = config.minMatchedFields ?? 1

  for (const item of items) {
    const fieldMatches: FieldMatch[] = []
    let totalScore = 0
    let matchedCount = 0
    let requiredMatched = true

    // 在每个字段中搜索
    for (const fieldConfig of config.fieldConfigs) {
      const fieldMatch = searchField(item, query, searchQuery, config, fieldConfig)
      fieldMatches.push(fieldMatch)

      if (fieldMatch.matched) {
        totalScore += fieldMatch.score
        matchedCount++
      } else if (fieldConfig.required) {
        requiredMatched = false
      }
    }

    // 检查是否满足匹配要求
    const meetsRequirements =
      (config.requireAllFields ? requiredMatched : true) && matchedCount >= minMatchedFields

    if (!meetsRequirements && fieldMatches.length > 0) {
      continue
    }

    // 计算跨字段分数（如果启用）
    let crossFieldScore = 0
    if (config.crossFieldPhraseMatch) {
      crossFieldScore = calculateCrossFieldScore(item, fieldConfigsToFields(config), query, config)
    }

    // 应用方差惩罚（如果启用）
    if (config.fieldWeightVariancePenalty) {
      const variance = calculateScoreVariance(fieldMatches)
      totalScore *= 1 - variance * 0.1 // 最多减少 10%
    }

    // 生成高亮
    const highlights = fieldMatches
      .filter(fm => fm.matched && fm.highlight)
      .map(fm => ({
        field: fm.field,
        text: fm.highlight!,
        start: fm.start!,
        end: fm.end!,
      }))

    results.push({
      item,
      matchedFields: fieldMatches.filter(fm => fm.matched).map(fm => fm.field),
      highlights,
      score: totalScore,
      fieldMatches,
      meetsRequirements,
      crossFieldScore,
    })
  }

  // 按综合分数排序
  results.sort((a, b) => {
    const scoreA = a.score + a.crossFieldScore
    const scoreB = b.score + b.crossFieldScore
    return scoreB - scoreA
  })

  return results
}

/**
 * 在单个字段中搜索
 */
function searchField<T extends object>(
  item: T,
  query: string,
  searchQuery: string,
  globalConfig: MultiFieldSearchConfig,
  fieldConfig: FieldSearchConfig
): FieldMatch {
  const value = (item as Record<string, unknown>)[fieldConfig.field]
  const weight = fieldConfig.weight ?? 1
  const bonus = fieldConfig.bonusScore ?? 0

  // 非字符串值处理
  if (typeof value !== 'string') {
    return {
      field: fieldConfig.field,
      matched: false,
      score: 0,
      matchType: 'none',
    }
  }

  const text = globalConfig.caseSensitive ? value : value.toLowerCase()
  let matched = false
  let score = 0
  let matchType: FieldMatch['matchType'] = 'none'
  let start = -1
  let end = -1

  // 1. 精确匹配
  if (fieldConfig.exactMatch) {
    if (text === searchQuery) {
      matched = true
      score = 3 * weight + bonus
      matchType = 'exact'
      start = 0
      end = value.length
    }
  } else {
    // 2. 子串匹配
    const index = text.indexOf(searchQuery)
    if (index !== -1) {
      matched = true
      score = (2 + (1 - index / text.length) * 0.5) * weight + bonus
      matchType = 'substring'
      start = index
      end = index + searchQuery.length
    }
    // 3. 模糊匹配
    else if (fieldConfig.fuzzyMatch) {
      const fuzzyResult = fuzzyMatch(text, searchQuery, fieldConfig.fuzzyThreshold ?? 1)
      if (fuzzyResult.match) {
        matched = true
        score = fuzzyResult.score * weight * 0.8 + bonus
        matchType = 'fuzzy'
        start = fuzzyResult.start
        end = fuzzyResult.start + searchQuery.length
      }
    }

    // 4. 拼音匹配
    if (!matched && fieldConfig.pinyinMatch) {
      const pinyinResult = pinyinMatch(value, query)
      if (pinyinResult.match) {
        matched = true
        score = pinyinResult.score * weight * 0.7 + bonus
        matchType = 'pinyin'
        start = pinyinResult.start
        end = Math.min(pinyinResult.start + query.length * 2, value.length)
      }
    }
  }

  // 生成高亮
  let highlight: string | undefined
  if (matched && start >= 0 && globalConfig.includeHighlights !== false) {
    const context = 20
    highlight = value
      .substring(Math.max(0, start - context), Math.min(value.length, end + context))
      .replace(/^\S*\s*/, '')
      .replace(/\s*\S*$/, '')
  }

  return {
    field: fieldConfig.field,
    matched,
    score,
    matchType,
    start,
    end,
    highlight,
  }
}

/**
 * 计算跨字段短语匹配分数
 */
function calculateCrossFieldScore<T extends object>(
  item: T,
  fields: string[],
  query: string,
  config: MultiFieldSearchConfig
): number {
  const values = fields
    .map(field => (item as Record<string, unknown>)[field])
    .filter(v => typeof v === 'string') as string[]

  if (values.length === 0) return 0

  // 组合所有字段的文本
  const combinedText = values.join(' ')
  const caseSensitive = config.caseSensitive || false
  const searchQuery = caseSensitive ? query : query.toLowerCase()
  const searchText = caseSensitive ? combinedText : combinedText.toLowerCase()

  // 查找跨字段匹配
  const index = searchText.indexOf(searchQuery)
  if (index !== -1) {
    return 0.5 * (1 - index / searchText.length) // 最多加 0.5 分
  }

  return 0
}

/**
 * 计算分数方差（用于惩罚不均衡的匹配）
 */
function calculateScoreVariance(fieldMatches: FieldMatch[]): number {
  const scores = fieldMatches.map(fm => fm.score)
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length
  const stdDev = Math.sqrt(variance)

  // 归一化到 0-1
  return Math.min(1, stdDev / mean)
}

/**
 * 模糊匹配（简化版）
 */
function fuzzyMatch(
  text: string,
  query: string,
  threshold: number
): { match: boolean; score: number; start: number } {
  if (query.length === 0) {
    return { match: true, score: 1, start: 0 }
  }

  if (query.length > text.length) {
    return { match: false, score: 0, start: -1 }
  }

  const index = text.indexOf(query)
  if (index !== -1) {
    return {
      match: true,
      score: 1 + (1 - index / text.length) * 0.3,
      start: index,
    }
  }

  // 简化的编辑距离计算（仅前缀）
  let distance = 0
  const maxLen = Math.min(text.length, query.length)
  for (let i = 0; i < maxLen; i++) {
    if (text[i] !== query[i]) {
      distance++
      if (distance > threshold) {
        return { match: false, score: 0, start: -1 }
      }
    }
  }

  if (distance <= threshold) {
    const score = Math.max(0, 1 - distance / Math.max(text.length, query.length))
    return { match: true, score, start: 0 }
  }

  return { match: false, score: 0, start: -1 }
}

/**
 * 拼音匹配（简化版）
 */
function pinyinMatch(
  text: string,
  query: string
): { match: boolean; score: number; start: number } {
  // 简单的拼音检测
  if (!/^[a-zA-Z\s]+$/.test(query)) {
    return { match: false, score: 0, start: -1 }
  }

  // 这里应该有完整的拼音映射，简化版直接返回不匹配
  // 实际使用时应从 search-filter.ts 导入完整的拼音匹配函数
  return { match: false, score: 0, start: -1 }
}

/**
 * 将字段配置转换为字段名数组
 */
function fieldConfigsToFields(config: MultiFieldSearchConfig): string[] {
  return config.fieldConfigs.map(fc => fc.field)
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 创建标准的多字段搜索配置
 */
export function createMultiFieldConfig(
  fields: string[],
  weights?: Record<string, number>
): MultiFieldSearchConfig {
  return {
    fieldConfigs: fields.map(field => ({
      field,
      weight: weights?.[field] ?? 1,
    })),
    target: 'all' as const,
    caseSensitive: false,
    fuzzyMatch: true,
    fuzzyThreshold: 1,
    pinyinMatch: false,
    includeHighlights: true,
    minScore: 0,
  }
}

/**
 * 创建必需字段配置
 */
export function createRequiredFieldsConfig(
  requiredFields: string[],
  optionalFields: string[],
  weights?: Record<string, number>
): MultiFieldSearchConfig {
  return {
    fieldConfigs: [
      ...requiredFields.map(field => ({
        field,
        weight: weights?.[field] ?? 1,
        required: true,
      })),
      ...optionalFields.map(field => ({
        field,
        weight: weights?.[field] ?? 1,
        required: false,
      })),
    ],
    requireAllFields: false,
    minMatchedFields: requiredFields.length,
    target: 'all' as const,
    caseSensitive: false,
    fuzzyMatch: true,
    fuzzyThreshold: 1,
    includeHighlights: true,
    minScore: 0,
  }
}

/**
 * 从多字段搜索结果转换为标准搜索结果
 */
export function toStandardSearchResult<T>(
  multiFieldResults: MultiFieldSearchResult<T>[]
): SearchResult<T>[] {
  return multiFieldResults.map(result => ({
    item: result.item,
    matchedFields: result.matchedFields,
    highlights: result.highlights,
    score: result.score + result.crossFieldScore,
  }))
}

/**
 * 获取多字段搜索统计信息
 */
export function getMultiFieldSearchStats<T>(results: MultiFieldSearchResult<T>[]): {
  totalResults: number
  avgScore: number
  avgCrossFieldScore: number
  avgMatchedFields: number
  fieldMatchRates: Record<string, number>
} {
  if (results.length === 0) {
    return {
      totalResults: 0,
      avgScore: 0,
      avgCrossFieldScore: 0,
      avgMatchedFields: 0,
      fieldMatchRates: {},
    }
  }

  const totalScore = results.reduce((sum, r) => sum + r.score, 0)
  const totalCrossFieldScore = results.reduce((sum, r) => sum + r.crossFieldScore, 0)
  const totalMatchedFields = results.reduce((sum, r) => sum + r.matchedFields.length, 0)

  const fieldMatchRates: Record<string, number> = {}

  // 计算每个字段的匹配率
  const allFields = new Set<string>()
  results.forEach(r => {
    r.fieldMatches.forEach(fm => allFields.add(fm.field))
  })

  allFields.forEach(field => {
    const matched = results.filter(r =>
      r.fieldMatches.some(fm => fm.field === field && fm.matched)
    ).length
    fieldMatchRates[field] = matched / results.length
  })

  return {
    totalResults: results.length,
    avgScore: totalScore / results.length,
    avgCrossFieldScore: totalCrossFieldScore / results.length,
    avgMatchedFields: totalMatchedFields / results.length,
    fieldMatchRates,
  }
}
