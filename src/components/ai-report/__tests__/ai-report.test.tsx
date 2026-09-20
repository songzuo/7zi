/**
 * @fileoverview AI 报表模块 - 测试用例
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseQuery, generateSuggestions } from '../QueryParser'
import { generateSQL, validateSQL, formatSQL } from '../SQLGenerator'
import type { ParsedQuery } from '../types'

describe('QueryParser', () => {
  describe('parseQuery', () => {
    it('应该正确解析聚合查询', () => {
      const result = parseQuery('本月销售总额')
      expect(result.intent).toBe('aggregation')
      expect(result.aggregations.length).toBeGreaterThan(0)
    })
    
    it('应该正确解析趋势查询', () => {
      const result = parseQuery('用户增长趋势')
      expect(result.intent).toBe('trend')
    })
    
    it('应该正确解析分布查询', () => {
      const result = parseQuery('各产品类别销售占比')
      expect(result.intent).toBe('distribution')
    })
    
    it('应该正确解析时间范围', () => {
      const result = parseQuery('本周订单数量')
      expect(result.timeRange).toBeDefined()
      expect(result.timeRange?.preset).toBe('week')
    })
    
    it('应该正确解析限制条件', () => {
      const result = parseQuery('前10名销售')
      expect(result.limit).toBe(10)
    })
  })
  
  describe('generateSuggestions', () => {
    it('应该返回默认建议（输入为空时）', () => {
      const suggestions = generateSuggestions('')
      expect(suggestions.length).toBeGreaterThan(0)
    })
    
    it('应该根据输入内容生成建议', () => {
      const suggestions = generateSuggestions('销售')
      expect(suggestions.some(s => s.includes('销售'))).toBe(true)
    })
  })
})

describe('SQLGenerator', () => {
  const mockParsedQuery: ParsedQuery = {
    intent: 'aggregation',
    metrics: ['value'],
    dimensions: ['category'],
    filters: [],
    aggregations: [
      { function: 'sum', field: 'value', alias: 'total' }
    ],
    confidence: 0.8
  }
  
  describe('generateSQL', () => {
    it('应该生成基本的 SELECT 语句', () => {
      const result = generateSQL(mockParsedQuery, 'sales')
      expect(result.sql).toContain('SELECT')
      expect(result.sql).toContain('FROM')
    })
    
    it('应该包含聚合函数', () => {
      const result = generateSQL(mockParsedQuery, 'sales')
      expect(result.sql).toContain('SUM')
    })
    
    it('应该包含 GROUP BY', () => {
      const result = generateSQL(mockParsedQuery, 'sales')
      expect(result.sql).toContain('GROUP BY')
    })
    
    it('应该包含解释说明', () => {
      const result = generateSQL(mockParsedQuery, 'sales')
      expect(result.explanation).toBeTruthy()
    })
  })
  
  describe('validateSQL', () => {
    it('应该验证有效的 SQL', () => {
      const result = validateSQL('SELECT * FROM table')
      expect(result.valid).toBe(true)
    })
    
    it('应该拒绝缺少 SELECT 的 SQL', () => {
      const result = validateSQL('FROM table')
      expect(result.valid).toBe(false)
    })
    
    it('应该拒绝缺少 FROM 的 SQL', () => {
      const result = validateSQL('SELECT *')
      expect(result.valid).toBe(false)
    })
    
    it('应该检查括号匹配', () => {
      const result = validateSQL('SELECT * FROM (SELECT id FROM users')
      expect(result.valid).toBe(false)
    })
  })
  
  describe('formatSQL', () => {
    it('应该在关键字后添加换行', () => {
      const result = formatSQL('SELECT a, b FROM table WHERE c = 1')
      expect(result).toContain('\n')
    })
  })
})

describe('Chart Renderer', () => {
  describe('recommendChartType', () => {
    it('趋势查询应该推荐折线图', () => {
      const type = recommendChartType('trend', 10, 1)
      expect(type).toBe('line')
    })
    
    it('分布查询应该推荐饼图（数据较少时）', () => {
      const type = recommendChartType('distribution', 5, 1)
      expect(type).toBe('pie')
    })
    
    it('对比查询应该推荐柱状图', () => {
      const type = recommendChartType('comparison', 10, 2)
      expect(type).toBe('bar')
    })
  })
})

// 导入测试所需的函数
import { recommendChartType } from '../charts/ChartRenderer'