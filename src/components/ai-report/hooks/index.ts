/**
 * @fileoverview AI 报表生成系统 - 自定义 Hooks
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import type { 
  ParsedQuery, 
  QueryResult, 
  ChartConfig, 
  ReportConfig,
  QueryStatus 
} from '../types'

/**
 * 查询状态 Hook
 */
export function useQueryState() {
  const [status, setStatus] = useState<QueryStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  
  const setStatusWithReset = useCallback((newStatus: QueryStatus) => {
    setStatus(newStatus)
    if (newStatus === 'idle') {
      setError(null)
    }
  }, [])
  
  const setErrorState = useCallback((err: Error | string) => {
    const error = typeof err === 'string' ? new Error(err) : err
    setError(error)
    setStatus('error')
  }, [])
  
  return {
    status,
    setStatus: setStatusWithReset,
    error,
    setError: setErrorState,
    isProcessing: status === 'parsing' || status === 'generating' || status === 'rendering',
    isSuccess: status === 'success',
    isError: status === 'error'
  }
}

/**
 * 报表配置 Hook
 */
export function useReportConfig() {
  const [config, setConfig] = useState<ReportConfig | null>(null)
  const [history, setHistory] = useState<ReportConfig[]>([])
  
  const saveConfig = useCallback((newConfig: ReportConfig) => {
    setConfig(newConfig)
    setHistory(prev => [newConfig, ...prev.slice(0, 9)])
    
    // 保存到 localStorage
    try {
      const saved = JSON.parse(localStorage.getItem('report-history') || '[]')
      localStorage.setItem('report-history', JSON.stringify([newConfig, ...saved.slice(0, 9)]))
    } catch (err) {
      console.warn('无法保存历史记录:', err)
    }
  }, [])
  
  const loadHistory = useCallback(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('report-history') || '[]')
      setHistory(saved)
    } catch (err) {
      console.warn('无法加载历史记录:', err)
    }
  }, [])
  
  const clearHistory = useCallback(() => {
    setHistory([])
    localStorage.removeItem('report-history')
  }, [])
  
  useEffect(() => {
    loadHistory()
  }, [loadHistory])
  
  return {
    config,
    history,
    saveConfig,
    loadHistory,
    clearHistory
  }
}

/**
 * 数据获取 Hook
 */
export function useDataFetch() {
  const [data, setData] = useState<QueryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const fetchData = useCallback(async (parsedQuery: ParsedQuery, dataSource: string) => {
    setLoading(true)
    setError(null)
    
    try {
      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 生成模拟数据
      const mockData = generateMockData(parsedQuery)
      setData(mockData)
      
      return mockData
    } catch (err) {
      const error = err instanceof Error ? err : new Error('数据获取失败')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])
  
  return {
    data,
    loading,
    error,
    fetchData
  }
}

/**
 * 图表配置 Hook
 */
export function useChartConfig() {
  const [config, setConfig] = useState<ChartConfig | null>(null)
  
  const generateConfig = useCallback((
    data: QueryResult,
    parsedQuery: ParsedQuery,
    title: string
  ) => {
    const newConfig = generateChartConfig(data, parsedQuery, title)
    setConfig(newConfig)
    return newConfig
  }, [])
  
  return {
    config,
    generateConfig
  }
}

/**
 * 模拟数据生成
 */
function generateMockData(parsedQuery: ParsedQuery): QueryResult {
  const { intent, dimensions, metrics } = parsedQuery
  
  const data: Record<string, unknown>[] = []
  const baseData = [
    { category: '1月', value: Math.floor(Math.random() * 10000) + 5000 },
    { category: '2月', value: Math.floor(Math.random() * 10000) + 5000 },
    { category: '3月', value: Math.floor(Math.random() * 10000) + 5000 },
    { category: '4月', value: Math.floor(Math.random() * 10000) + 5000 },
    { category: '5月', value: Math.floor(Math.random() * 10000) + 5000 },
    { category: '6月', value: Math.floor(Math.random() * 10000) + 5000 }
  ]
  
  const dimensionField = dimensions[0] || 'category'
  const metricField = metrics[0] || 'value'
  
  baseData.forEach(item => {
    data.push({
      [dimensionField]: item.category,
      [metricField]: item.value
    })
  })
  
  return {
    data,
    fields: [
      { name: dimensionField, type: 'string' },
      { name: metricField, type: 'number' }
    ],
    totalCount: data.length,
    executionTime: Math.random() * 500 + 100,
    cached: false
  }
}

/**
 * 图表配置生成
 */
function generateChartConfig(
  result: QueryResult,
  parsedQuery: ParsedQuery,
  title: string
): ChartConfig {
  const { intent, dimensions, metrics } = parsedQuery
  
  // 根据意图推荐图表类型
  let chartType: ChartConfig['type'] = 'bar'
  switch (intent) {
    case 'trend':
      chartType = 'line'
      break
    case 'distribution':
      chartType = result.data.length > 5 ? 'pie' : 'bar'
      break
    case 'comparison':
      chartType = 'bar'
      break
    default:
      chartType = 'bar'
  }
  
  const config: ChartConfig = {
    type: chartType,
    title,
    responsive: true,
    height: 400,
    colors: [
      '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899'
    ],
    legend: { show: true, position: 'bottom' },
    tooltip: { show: true },
    series: []
  }
  
  if (result.data.length === 0) {
    return config
  }
  
  const fields = Object.keys(result.data[0])
  const dimensionField = fields.find(f => 
    typeof result.data[0][f] === 'string'
  ) || fields[0]
  
  const metricField = fields.find(f => 
    typeof result.data[0][f] === 'number'
  ) || fields[1]
  
  config.xAxis = {
    field: dimensionField,
    type: dimensionField.includes('date') ? 'time' : 'category'
  }
  
  config.yAxis = {
    field: metricField,
    type: 'value'
  }
  
  config.series = [{
    name: metricField,
    field: metricField,
    type: chartType === 'line' ? 'line' : 'bar',
    smooth: true
  }]
  
  return config
}

/**
 * 防抖 Hook
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    
    return () => clearTimeout(handler)
  }, [value, delay])
  
  return debouncedValue
}

/**
 * 本地存储 Hook
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (err) {
      console.warn(`无法读取 ${key}:`, err)
      return initialValue
    }
  })
  
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (err) {
      console.warn(`无法保存 ${key}:`, err)
    }
  }, [key, storedValue])
  
  return [storedValue, setValue] as const
}