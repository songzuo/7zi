/**
 * @fileoverview SQL 生成器
 * @description 将解析后的查询转换为 SQL 语句
 */

'use client'

import { useCallback } from 'react'
import type { ParsedQuery, GeneratedSQL, DataField } from './types'

/**
 * 生成 SQL 查询
 */
export function generateSQL(parsedQuery: ParsedQuery, tableName: string = 'data'): GeneratedSQL {
  const { intent, metrics, dimensions, filters, timeRange, aggregations, orderBy, limit } = parsedQuery
  
  let sql = ''
  const params: Record<string, unknown> = {}
  const warnings: string[] = []
  
  // SELECT 子句
  const selectFields: string[] = []
  
  // 添加维度字段
  dimensions.forEach(dim => {
    selectFields.push(dim)
  })
  
  // 添加聚合字段
  aggregations.forEach(agg => {
    const field = agg.alias || `${agg.function}_${agg.field}`
    selectFields.push(`${agg.function.toUpperCase()}(${agg.field}) AS ${field}`)
  })
  
  // 如果没有聚合，添加指标字段
  if (aggregations.length === 0 && metrics.length > 0) {
    metrics.forEach(metric => {
      selectFields.push(metric)
    })
  }
  
  sql += `SELECT ${selectFields.join(', ')}\n`
  
  // FROM 子句
  sql += `FROM ${tableName}\n`
  
  // WHERE 子句
  const whereConditions: string[] = []
  
  // 添加时间范围过滤
  if (timeRange) {
    const startDate = timeRange.start.toISOString().split('T')[0]
    const endDate = timeRange.end.toISOString().split('T')[0]
    whereConditions.push(`date >= '${startDate}' AND date <= '${endDate}'`)
  }
  
  // 添加过滤条件
  filters.forEach(filter => {
    const condition = buildFilterCondition(filter, params)
    whereConditions.push(condition)
  })
  
  if (whereConditions.length > 0) {
    sql += `WHERE ${whereConditions.join(' AND ')}\n`
  }
  
  // GROUP BY 子句（聚合查询需要）
  if (aggregations.length > 0 && dimensions.length > 0) {
    sql += `GROUP BY ${dimensions.join(', ')}\n`
  }
  
  // ORDER BY 子句
  if (orderBy) {
    sql += `ORDER BY ${orderBy.field} ${orderBy.direction.toUpperCase()}\n`
  }
  
  // LIMIT 子句
  if (limit) {
    sql += `LIMIT ${limit}`
  }
  
  // 生成解释
  const explanation = generateExplanation(parsedQuery)
  
  // 添加警告
  if (parsedQuery.confidence < 0.5) {
    warnings.push('查询解析置信度较低，建议检查生成的 SQL')
  }
  
  if (dimensions.length === 0 && aggregations.length === 0) {
    warnings.push('查询缺少维度或聚合，可能返回大量数据')
  }
  
  return {
    sql,
    params,
    explanation,
    warnings
  }
}

/**
 * 构建过滤条件
 */
function buildFilterCondition(filter: ParsedQuery['filters'][0], params: Record<string, unknown>): string {
  const { field, operator, value } = filter
  
  switch (operator) {
    case 'eq':
      return `${field} = ${typeof value === 'string' ? `'${value}'` : value}`
    case 'ne':
      return `${field} != ${typeof value === 'string' ? `'${value}'` : value}`
    case 'gt':
      return `${field} > ${typeof value === 'string' ? `'${value}'` : value}`
    case 'gte':
      return `${field} >= ${typeof value === 'string' ? `'${value}'` : value}`
    case 'lt':
      return `${field} < ${typeof value === 'string' ? `'${value}'` : value}`
    case 'lte':
      return `${field} <= ${typeof value === 'string' ? `'${value}'` : value}`
    case 'contains':
      return `${field} LIKE '%${value}%'`
    case 'in':
      const values = Array.isArray(value) ? value : [value]
      const inValues = values.map(v => typeof v === 'string' ? `'${v}'` : v).join(', ')
      return `${field} IN (${inValues})`
    case 'between':
      if (Array.isArray(value) && value.length === 2) {
        return `${field} BETWEEN ${value[0]} AND ${value[1]}`
      }
      return `${field} = ${value}`
    default:
      return `${field} = ${typeof value === 'string' ? `'${value}'` : value}`
  }
}

/**
 * 生成 SQL 解释
 */
function generateExplanation(parsedQuery: ParsedQuery): string {
  const { intent, aggregations, dimensions, timeRange } = parsedQuery
  
  let explanation = ''
  
  // 意图说明
  switch (intent) {
    case 'aggregation':
      explanation += '这是一个聚合查询，用于计算数据的统计指标。'
      break
    case 'comparison':
      explanation += '这是一个对比查询，用于比较不同数据集之间的差异。'
      break
    case 'trend':
      explanation += '这是一个趋势查询，用于分析数据随时间的变化。'
      break
    case 'distribution':
      explanation += '这是一个分布查询，用于展示数据的构成和占比。'
      break
    case 'ranking':
      explanation += '这是一个排名查询，用于对数据进行排序。'
      break
    default:
      explanation += '这是一个基础查询，用于检索数据。'
  }
  
  // 聚合说明
  if (aggregations.length > 0) {
    const aggNames = aggregations.map(a => a.function).join('、')
    explanation += `\n使用 ${aggNames} 函数进行聚合计算。`
  }
  
  // 维度说明
  if (dimensions.length > 0) {
    explanation += `\n按 ${dimensions.join('、')} 维度分组。`
  }
  
  // 时间范围说明
  if (timeRange && timeRange.preset) {
    const presetNames: Record<string, string> = {
      today: '今天',
      week: '本周',
      month: '本月',
      quarter: '本季度',
      year: '今年'
    }
    explanation += `\n时间范围：${presetNames[timeRange.preset] || '自定义'}`
  }
  
  return explanation
}

/**
 * SQL 生成器 Hook
 */
export function useSQLGenerator() {
  const generate = useCallback((parsedQuery: ParsedQuery, tableName?: string) => {
    return generateSQL(parsedQuery, tableName)
  }, [])
  
  return { generate }
}

/**
 * 验证 SQL 语法（简单实现）
 */
export function validateSQL(sql: string): { valid: boolean; error?: string } {
  // 简单的 SQL 语法检查
  const requiredKeywords = ['SELECT', 'FROM']
  
  for (const keyword of requiredKeywords) {
    if (!sql.toUpperCase().includes(keyword)) {
      return {
        valid: false,
        error: `缺少必需的关键字: ${keyword}`
      }
    }
  }
  
  // 检查括号匹配
  let parenCount = 0
  for (const char of sql) {
    if (char === '(') parenCount++
    if (char === ')') parenCount--
  }
  
  if (parenCount !== 0) {
    return {
      valid: false,
      error: '括号不匹配'
    }
  }
  
  return { valid: true }
}

/**
 * 格式化 SQL（美化显示）
 */
export function formatSQL(sql: string): string {
  // 简单的 SQL 格式化
  const keywords = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'AND', 'OR']
  
  let formatted = sql
  
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
    formatted = formatted.replace(regex, `\n${keyword}`)
  })
  
  // 移除多余的换行
  formatted = formatted.replace(/\n\s*\n/g, '\n')
  
  return formatted.trim()
}