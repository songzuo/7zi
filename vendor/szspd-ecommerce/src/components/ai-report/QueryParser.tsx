/**
 * @fileoverview 自然语言查询解析器
 * @description 将自然语言转换为结构化查询意图
 */

'use client'

import { useState, useCallback } from 'react'
import type { 
  ParsedQuery, 
  QueryIntent, 
  QueryFilter, 
  Aggregation,
  TimeRange 
} from './types'

// 意图关键词映射
const INTENT_KEYWORDS: Record<QueryIntent, string[]> = {
  aggregation: ['总计', '总和', '平均', '数量', '统计', '汇总', 'sum', 'avg', 'count', 'total'],
  comparison: ['对比', '同比', '环比', '比较', '差异', 'vs', 'versus', 'compare'],
  trend: ['趋势', '变化', '增长', '下降', '走势', '时间', 'trend', 'change', 'growth'],
  distribution: ['分布', '占比', '比例', '构成', '分布图', 'distribution', 'percentage'],
  ranking: ['排名', '前', '后', 'top', 'bottom', 'ranking', 'sort'],
  unknown: []
}

// 时间关键词映射
const TIME_KEYWORDS: Record<string, TimeRange['preset']> = {
  '今天': 'today',
  '本周': 'week',
  '本月': 'month',
  '本季度': 'quarter',
  '今年': 'year',
  'today': 'today',
  'this week': 'week',
  'this month': 'month',
  'this quarter': 'quarter',
  'this year': 'year'
}

// 聚合函数映射
const AGGREGATION_KEYWORDS: Record<string, Aggregation['function']> = {
  '总计': 'sum',
  '总和': 'sum',
  '平均': 'avg',
  '平均值': 'avg',
  '数量': 'count',
  '统计': 'count',
  '最大': 'max',
  '最小': 'min',
  'sum': 'sum',
  'avg': 'avg',
  'count': 'count',
  'max': 'max',
  'min': 'min'
}

// 过滤操作符映射
const OPERATOR_KEYWORDS: Record<string, QueryFilter['operator']> = {
  '等于': 'eq',
  '不等于': 'ne',
  '大于': 'gt',
  '小于': 'lt',
  '大于等于': 'gte',
  '小于等于': 'lte',
  '包含': 'contains',
  '在': 'in',
  'between': 'between',
  '=': 'eq',
  '!=': 'ne',
  '>': 'gt',
  '<': 'lt',
  '>=': 'gte',
  '<=': 'lte'
}

/**
 * 解析查询意图
 */
function detectIntent(query: string): QueryIntent {
  const lowerQuery = query.toLowerCase()
  
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        return intent as QueryIntent
      }
    }
  }
  
  return 'unknown'
}

/**
 * 解析时间范围
 */
function parseTimeRange(query: string): TimeRange | undefined {
  const now = new Date()
  
  for (const [keyword, preset] of Object.entries(TIME_KEYWORDS)) {
    if (query.includes(keyword)) {
      let start: Date
      const end: Date = now
      
      switch (preset) {
        case 'today':
          start = new Date(now.setHours(0, 0, 0, 0))
          break
        case 'week':
          start = new Date(now)
          start.setDate(start.getDate() - start.getDay())
          start.setHours(0, 0, 0, 0)
          break
        case 'month':
          start = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3)
          start = new Date(now.getFullYear(), quarter * 3, 1)
          break
        case 'year':
          start = new Date(now.getFullYear(), 0, 1)
          break
        default:
          return undefined
      }
      
      return { start, end, preset }
    }
  }
  
  return undefined
}

/**
 * 解析聚合函数
 */
function parseAggregations(query: string): Aggregation[] {
  const aggregations: Aggregation[] = []
  
  for (const [keyword, func] of Object.entries(AGGREGATION_KEYWORDS)) {
    if (query.includes(keyword)) {
      // 简单实现：假设聚合作用于某个字段
      // 实际应用中需要更复杂的 NLP 解析
      aggregations.push({
        function: func,
        field: 'value', // 默认字段，实际应该从查询中提取
        alias: `${func}_value`
      })
    }
  }
  
  return aggregations
}

/**
 * 解析过滤条件
 */
function parseFilters(query: string): QueryFilter[] {
  const filters: QueryFilter[] = []
  
  // 简单实现：提取 "字段 操作符 值" 模式
  // 实际应用中需要更复杂的 NLP 解析
  const patterns = [
    /(\w+)\s*(等于|=)\s*([^\s]+)/g,
    /(\w+)\s*(大于|>)\s*([^\s]+)/g,
    /(\w+)\s*(小于|<)\s*([^\s]+)/g
  ]
  
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(query)) !== null) {
      const [, field, operator, value] = match
      filters.push({
        field,
        operator: OPERATOR_KEYWORDS[operator] || 'eq',
        value: isNaN(Number(value)) ? value : Number(value)
      })
    }
  }
  
  return filters
}

/**
 * 解析排序
 */
function parseOrderBy(query: string): ParsedQuery['orderBy'] {
  if (query.includes('降序') || query.includes('desc')) {
    return { field: 'value', direction: 'desc' }
  }
  if (query.includes('升序') || query.includes('asc')) {
    return { field: 'value', direction: 'asc' }
  }
  return undefined
}

/**
 * 解析限制数量
 */
function parseLimit(query: string): number | undefined {
  const match = query.match(/(?:前|top)\s*(\d+)/)
  if (match) {
    return parseInt(match[1], 10)
  }
  return undefined
}

/**
 * 主解析函数
 */
export function parseQuery(query: string): ParsedQuery {
  const intent = detectIntent(query)
  const timeRange = parseTimeRange(query)
  const aggregations = parseAggregations(query)
  const filters = parseFilters(query)
  const orderBy = parseOrderBy(query)
  const limit = parseLimit(query)
  
  // 计算置信度（简单实现）
  const confidence = intent !== 'unknown' ? 0.8 : 0.3
  
  return {
    intent,
    metrics: ['value'], // 默认指标
    dimensions: ['category', 'date'], // 默认维度
    filters,
    timeRange,
    aggregations,
    orderBy,
    limit,
    confidence
  }
}

/**
 * 查询解析器 Hook
 */
export function useQueryParser() {
  const [isParsing, setIsParsing] = useState(false)
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery | null>(null)
  const [error, setError] = useState<Error | null>(null)
  
  const parse = useCallback(async (query: string) => {
    if (!query.trim()) {
      setParsedQuery(null)
      return null
    }
    
    setIsParsing(true)
    setError(null)
    
    try {
      // 模拟异步解析（实际可能调用 AI API）
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const result = parseQuery(query)
      setParsedQuery(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('解析失败')
      setError(error)
      return null
    } finally {
      setIsParsing(false)
    }
  }, [])
  
  return {
    parse,
    isParsing,
    parsedQuery,
    error
  }
}

/**
 * 查询建议生成器
 */
export function generateSuggestions(partialQuery: string): string[] {
  const suggestions: string[] = []
  
  // 基于意图生成建议
  if (partialQuery.length < 2) {
    return [
      '显示今天的销售总额',
      '本月用户增长趋势',
      '各产品类别销售占比',
      '本周订单数量统计',
      '各地区销售额对比'
    ]
  }
  
  // 基于输入内容生成建议
  const lowerQuery = partialQuery.toLowerCase()
  
  if (lowerQuery.includes('销售')) {
    suggestions.push(
      '销售总额按地区分布',
      '销售趋势分析',
      '销售排行榜'
    )
  }
  
  if (lowerQuery.includes('用户')) {
    suggestions.push(
      '用户活跃度统计',
      '用户增长趋势',
      '用户地区分布'
    )
  }
  
  if (lowerQuery.includes('订单')) {
    suggestions.push(
      '订单数量统计',
      '订单金额分布',
      '订单完成率'
    )
  }
  
  return suggestions
}