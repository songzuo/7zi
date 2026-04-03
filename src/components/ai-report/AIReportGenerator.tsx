/**
 * @fileoverview AI 报表生成器主组件
 * @description 自然语言查询生成数据分析报表
 */

'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQueryParser, generateSuggestions } from './QueryParser'
import { useSQLGenerator, generateSQL, validateSQL, formatSQL } from './SQLGenerator'
import { ChartRenderer, recommendChartType, generateChartConfig } from './charts/ChartRenderer'
import { ExportPanel, useReportExport } from './export/ReportExporter'
import type {
  ReportConfig,
  ReportTemplate,
  QueryStatus,
  ParsedQuery,
  QueryResult,
  ChartConfig,
  ExportOptions
} from './types'

// 默认报表模板
const DEFAULT_TEMPLATES: ReportTemplate[] = [
  {
    id: '1',
    name: '销售统计',
    description: '按时间统计销售数据',
    category: 'sales',
    template: '本月销售总额',
    defaultTimeRange: 'month',
    defaultChartType: 'line',
    icon: '💰'
  },
  {
    id: '2',
    name: '用户增长',
    description: '用户增长趋势分析',
    category: 'marketing',
    template: '用户增长趋势',
    defaultTimeRange: 'month',
    defaultChartType: 'line',
    icon: '👥'
  },
  {
    id: '3',
    name: '订单分析',
    description: '订单数量和金额统计',
    category: 'operations',
    template: '本周订单数量',
    defaultTimeRange: 'week',
    defaultChartType: 'bar',
    icon: '📦'
  },
  {
    id: '4',
    name: '地区分布',
    description: '按地区分布统计',
    category: 'sales',
    template: '各地区销售额',
    defaultTimeRange: 'month',
    defaultChartType: 'pie',
    icon: '🗺️'
  }
]

// 模拟数据生成
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
 * AI 报表生成器主组件
 */
export function AIReportGenerator({
  dataSource = 'default',
  templates = DEFAULT_TEMPLATES,
  onSave,
  onExport,
  className = ''
}: {
  dataSource?: string
  templates?: ReportTemplate[]
  onSave?: (config: ReportConfig) => void
  onExport?: (options: ExportOptions) => void
  className?: string
}) {
  // 状态
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<QueryStatus>('idle')
  const [reportConfig, setReportConfig] = useState<ReportConfig | null>(null)
  const [showExport, setShowExport] = useState(false)
  const [history, setHistory] = useState<{ query: string; timestamp: Date; status: string }[]>([])
  
  // Hooks
  const { parse, isParsing, parsedQuery } = useQueryParser()
  const { generate } = useSQLGenerator()
  const { exportReport, isExporting } = useReportExport()
  
  // 处理查询提交
  const handleSubmit = useCallback(async () => {
    if (!query.trim()) return
    
    setStatus('parsing')
    
    try {
      // 1. 解析查询
      const parsed = await parse(query)
      if (!parsed) {
        setStatus('error')
        return
      }
      
      setStatus('generating')
      
      // 2. 生成 SQL
      const sql = generate(parsed, dataSource)
      const validation = validateSQL(sql.sql)
      if (!validation.valid) {
        console.warn('SQL 验证警告:', validation.error)
      }
      
      // 3. 生成图表配置
      const result = generateMockData(parsed)
      const chartConfig = generateChartConfig(
        result.data,
        { intent: parsed.intent, dimensions: parsed.dimensions, metrics: parsed.metrics },
        query
      )
      
      setStatus('rendering')
      
      // 4. 构建报表配置
      const config: ReportConfig = {
        id: `report-${Date.now()}`,
        name: query.slice(0, 30),
        query,
        parsedQuery: parsed,
        sql,
        chartConfig,
        result,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user',
        isPublic: false,
        tags: []
      }
      
      setReportConfig(config)
      setStatus('success')
      
      // 添加到历史记录
      setHistory(prev => [{
        query,
        timestamp: new Date(),
        status: 'success'
      }, ...prev.slice(0, 9)])
      
      // 回调
      onSave?.(config)
    } catch (error) {
      console.error('查询失败:', error)
      setStatus('error')
    }
  }, [query, parse, generate, dataSource, onSave])
  
  // 处理导出
  const handleExport = useCallback(async (options: ExportOptions) => {
    if (!reportConfig) return
    
    await exportReport(reportConfig, options)
    onExport?.(options)
  }, [reportConfig, exportReport, onExport])
  
  // 处理模板选择
  const handleTemplateSelect = useCallback((template: ReportTemplate) => {
    setQuery(template.template)
  }, [])
  
  // 建议查询
  const suggestions = useMemo(() => {
    return query.length > 0 ? generateSuggestions(query) : []
  }, [query])
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* 头部 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
          📊 AI 智能报表
        </h2>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          用自然语言描述您的数据需求，AI 自动生成报表
        </p>
      </div>
      
      {/* 查询输入区 */}
      <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-800">
        {/* 输入框 */}
        <div className="relative">
          <textarea
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="例如：本月销售总额趋势、各产品类别销售占比、用户增长统计..."
            className="min-h-[120px] w-full rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-zinc-900 placeholder-zinc-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
            disabled={status === 'parsing' || status === 'generating'}
          />
          
          {/* 建议列表 */}
          {suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.slice(0, 3).map((suggestion: string, i: number) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuery(suggestion)
                    suggestions.splice(i, 1)
                  }}
                  className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* 操作按钮 */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* 模板选择 */}
            <div className="flex gap-1">
              {templates.slice(0, 4).map(template => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm transition-all hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  title={template.description}
                >
                  <span>{template.icon}</span>
                  <span className="hidden text-zinc-600 dark:text-zinc-400 sm:inline">
                    {template.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={!query.trim() || status === 'parsing' || status === 'generating'}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-3 font-medium text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === 'parsing' || status === 'generating' ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>处理中...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>生成报表</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* 解析结果 / 报表显示 */}
      {status !== 'idle' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          {status === 'success' && reportConfig ? (
            <div className="space-y-4">
              {/* SQL 显示 */}
              <div className="rounded-xl bg-zinc-900 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-zinc-400">生成 SQL</h3>
                  <button
                    onClick={() => navigator.clipboard.writeText(reportConfig.sql.sql)}
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    复制
                  </button>
                </div>
                <pre className="overflow-x-auto text-xs text-zinc-300">
                  {formatSQL(reportConfig.sql.sql)}
                </pre>
                {reportConfig.sql.warnings.length > 0 && (
                  <div className="mt-2 text-xs text-amber-400">
                    ⚠️ {reportConfig.sql.warnings[0]}
                  </div>
                )}
              </div>
              
              {/* 图表 */}
              <div className="rounded-xl bg-white p-6 shadow-lg dark:bg-zinc-800">
                <ChartRenderer
                  config={reportConfig.chartConfig}
                  data={reportConfig.result.data}
                />
              </div>
              
              {/* 操作栏 */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-500">
                  执行时间: {reportConfig.result.executionTime.toFixed(0)}ms | 
                  数据量: {reportConfig.result.totalCount} 条
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowExport(!showExport)}
                    className="flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                  >
                    <span>📥</span>
                    导出
                  </button>
                  
                  <button
                    onClick={() => {
                      setQuery('')
                      setStatus('idle')
                      setReportConfig(null)
                    }}
                    className="flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                  >
                    <span>🔄</span>
                    新建
                  </button>
                </div>
              </div>
              
              {/* 导出面板 */}
              {showExport && (
                <div className="animate-in fade-in duration-200">
                  <ExportPanel onExport={handleExport} />
                </div>
              )}
            </div>
          ) : status === 'error' ? (
            <div className="rounded-xl bg-red-50 p-6 text-center dark:bg-red-900/20">
              <p className="text-lg font-medium text-red-600 dark:text-red-400">
                查询处理失败
              </p>
              <p className="mt-2 text-sm text-red-500">
                请检查您的查询语句或稍后重试
              </p>
              <button
                onClick={() => setStatus('idle')}
                className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
              >
                重试
              </button>
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center">
              <div className="flex items-center gap-3">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
                <span className="text-zinc-500">正在分析...</span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* 历史记录 */}
      {history.length > 0 && (
        <div className="rounded-xl bg-white p-4 shadow dark:bg-zinc-800">
          <h3 className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            📜 查询历史
          </h3>
          <div className="space-y-2">
            {history.slice(0, 3).map((item, i) => (
              <button
                key={i}
                onClick={() => setQuery(item.query)}
                className="flex w-full items-center justify-between rounded-lg p-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-700"
              >
                <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">
                  {item.query}
                </span>
                <span className="text-xs text-zinc-400">
                  {item.timestamp.toLocaleTimeString()}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 简化版：直接使用自然语言查询
 */
export function AIRaportSimple() {
  return (
    <div className="mx-auto max-w-4xl">
      <AIReportGenerator />
    </div>
  )
}

export default AIReportGenerator