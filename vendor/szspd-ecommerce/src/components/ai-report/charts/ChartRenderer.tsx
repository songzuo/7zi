/**
 * @fileoverview 图表渲染组件
 * @description 支持多种图表类型的统一渲染器
 */

'use client'

import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import type { ChartType, ChartConfig, QueryResult } from '../types'

/**
 * 根据查询意图推荐图表类型
 */
export function recommendChartType(
  intent: string,
  dataLength: number,
  dimensions: number
): ChartType {
  switch (intent) {
    case 'trend':
      return 'line'
    case 'distribution':
      return dataLength > 5 ? 'pie' : 'bar'
    case 'comparison':
      return 'bar'
    case 'ranking':
      return 'bar'
    case 'aggregation':
      return dimensions > 1 ? 'bar' : 'table'
    default:
      return dataLength > 20 ? 'line' : 'bar'
  }
}

/**
 * 生成图表配置
 */
export function generateChartConfig(
  data: Record<string, unknown>[],
  parsedQuery: { intent: string; dimensions: string[]; metrics: string[] },
  title: string
): ChartConfig {
  const chartType = recommendChartType(
    parsedQuery.intent,
    data.length,
    parsedQuery.dimensions.length
  )
  
  const config: ChartConfig = {
    type: chartType,
    title,
    responsive: true,
    height: 400,
    series: []
  }
  
  if (data.length === 0) {
    return config
  }
  
  // 获取字段名
  const fields = Object.keys(data[0])
  const dimensionField = fields.find(f => 
    typeof data[0][f] === 'string' || f.includes('date') || f.includes('time')
  ) || fields[0]
  
  const metricField = fields.find(f => 
    typeof data[0][f] === 'number'
  ) || fields[1]
  
  // 配置 X 轴
  config.xAxis = {
    field: dimensionField,
    type: dimensionField.includes('date') ? 'time' : 'category'
  }
  
  // 配置 Y 轴
  config.yAxis = {
    field: metricField,
    type: 'value'
  }
  
  // 配置数据系列
  config.series = [{
    name: metricField,
    field: metricField,
    type: chartType === 'line' ? 'line' : chartType === 'area' ? 'area' : 'bar',
    smooth: true
  }]
  
  // 配置颜色
  config.colors = [
    '#06b6d4', // cyan
    '#8b5cf6', // purple
    '#f59e0b', // amber
    '#10b981', // emerald
    '#ef4444', // red
    '#3b82f6', // blue
    '#ec4899', // pink
  ]
  
  // 配置图例
  config.legend = {
    show: true,
    position: 'bottom'
  }
  
  // 配置提示框
  config.tooltip = {
    show: true
  }
  
  return config
}

/**
 * 图表渲染器组件
 */
export function ChartRenderer({
  config,
  data,
  loading = false,
  error = null,
  className = ''
}: {
  config: ChartConfig
  data: Record<string, unknown>[]
  loading?: boolean
  error?: Error | null
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  
  // 监听容器尺寸变化
  useEffect(() => {
    if (!containerRef.current) return
    
    const observer = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect
      setContainerWidth(width)
    })
    
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])
  
  // 渲染加载状态
  if (loading) {
    return (
      <div className={`flex h-64 items-center justify-center ${className}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
          <p className="text-sm text-zinc-500">正在渲染图表...</p>
        </div>
      </div>
    )
  }
  
  // 渲染错误状态
  if (error) {
    return (
      <div className={`flex h-64 items-center justify-center ${className}`}>
        <div className="rounded-lg bg-red-50 p-6 text-center dark:bg-red-900/20">
          <p className="text-lg font-medium text-red-600 dark:text-red-400">图表渲染失败</p>
          <p className="mt-2 text-sm text-red-500">{error.message}</p>
        </div>
      </div>
    )
  }
  
  // 空数据状态
  if (!data || data.length === 0) {
    return (
      <div className={`flex h-64 items-center justify-center ${className}`}>
        <div className="text-center">
          <p className="text-4xl">📊</p>
          <p className="mt-2 text-sm text-zinc-500">暂无数据</p>
        </div>
      </div>
    )
  }
  
  // 根据图表类型渲染
  return (
    <div ref={containerRef} className={className}>
      {/* 图表标题 */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
          {config.title}
        </h3>
        {config.subtitle && (
          <p className="mt-1 text-sm text-zinc-500">{config.subtitle}</p>
        )}
      </div>
      
      {/* 图表容器 */}
      <div style={{ height: config.height || 400 }}>
        {renderChartByType(config, data, containerWidth)}
      </div>
    </div>
  )
}

/**
 * 根据类型渲染图表
 */
function renderChartByType(
  config: ChartConfig,
  data: Record<string, unknown>[],
  width: number
) {
  switch (config.type) {
    case 'line':
      return <LineChart config={config} data={data} width={width} />
    case 'bar':
      return <BarChart config={config} data={data} width={width} />
    case 'pie':
      return <PieChart config={config} data={data} />
    case 'area':
      return <AreaChart config={config} data={data} width={width} />
    case 'scatter':
      return <ScatterChart config={config} data={data} width={width} />
    case 'heatmap':
      return <HeatmapChart config={config} data={data} />
    case 'table':
    default:
      return <DataTable config={config} data={data} />
  }
}

/**
 * 折线图组件
 */
function LineChart({
  config,
  data,
  width
}: {
  config: ChartConfig
  data: Record<string, unknown>[]
  width: number
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  
  const { chartWidth, chartHeight, padding } = useMemo(() => {
    const w = Math.max(width, 300)
    const h = config.height || 400
    const p = { top: 20, right: 20, bottom: 40, left: 50 }
    return { chartWidth: w, chartHeight: h, padding: p }
  }, [width, config.height])
  
  const { points, xLabels, yMax } = useMemo(() => {
    const xField = config.xAxis?.field || 'x'
    const yField = config.yAxis?.field || 'y'
    
    const values = data.map((d, i) => ({
      x: i,
      xLabel: String(d[xField] || ''),
      y: Number(d[yField]) || 0
    }))
    
    const max = Math.max(...values.map(v => v.y))
    const innerWidth = chartWidth - padding.left - padding.right
    const innerHeight = chartHeight - padding.top - padding.bottom
    
    const pts = values.map(v => ({
      x: padding.left + (v.x / (values.length - 1 || 1)) * innerWidth,
      y: chartHeight - padding.bottom - (v.y / (max || 1)) * innerHeight
    }))
    
    return {
      points: pts,
      xLabels: values.map(v => v.xLabel),
      yMax: max
    }
  }, [data, chartWidth, chartHeight, padding, config.xAxis, config.yAxis])
  
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  
  return (
    <svg ref={svgRef} width="100%" height={chartHeight} className="overflow-visible">
      {/* 网格线 */}
      {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
        <line
          key={ratio}
          x1={padding.left}
          x2={chartWidth - padding.right}
          y1={chartHeight - padding.bottom - ratio * (chartHeight - padding.top - padding.bottom)}
          y2={chartHeight - padding.bottom - ratio * (chartHeight - padding.top - padding.bottom)}
          stroke="#e5e7eb"
          strokeWidth="1"
          strokeDasharray="4"
        />
      ))}
      
      {/* X 轴 */}
      <line
        x1={padding.left}
        x2={chartWidth - padding.right}
        y1={chartHeight - padding.bottom}
        y2={chartHeight - padding.bottom}
        stroke="#374151"
        strokeWidth="2"
      />
      
      {/* Y 轴 */}
      <line
        x1={padding.left}
        x2={padding.left}
        y1={padding.top}
        y2={chartHeight - padding.bottom}
        stroke="#374151"
        strokeWidth="2"
      />
      
      {/* Y 轴标签 */}
      {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
        <text
          key={ratio}
          x={padding.left - 10}
          y={chartHeight - padding.bottom - ratio * (chartHeight - padding.top - padding.bottom)}
          textAnchor="end"
          className="fill-zinc-500 text-xs"
        >
          {Math.round(ratio * yMax).toLocaleString()}
        </text>
      ))}
      
      {/* X 轴标签 */}
      {xLabels.slice(0, 10).map((label, i) => {
        const x = padding.left + (i / (xLabels.length - 1 || 1)) * (chartWidth - padding.left - padding.right)
        return (
          <text
            key={i}
            x={x}
            y={chartHeight - padding.bottom + 20}
            textAnchor="middle"
            className="fill-zinc-500 text-xs"
          >
            {label.length > 8 ? label.slice(0, 8) + '...' : label}
          </text>
        )
      })}
      
      {/* 折线 */}
      <path
        d={pathD}
        fill="none"
        stroke={config.colors?.[0] || '#06b6d4'}
        strokeWidth="2"
        className="drop-shadow-sm"
      />
      
      {/* 数据点 */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="4"
          fill={config.colors?.[0] || '#06b6d4'}
          stroke="white"
          strokeWidth="2"
          className="cursor-pointer transition-all hover:r-6"
        />
      ))}
    </svg>
  )
}

/**
 * 柱状图组件
 */
function BarChart({
  config,
  data,
  width
}: {
  config: ChartConfig
  data: Record<string, unknown>[]
  width: number
}) {
  const { chartWidth, chartHeight, padding } = useMemo(() => {
    const w = Math.max(width, 300)
    const h = config.height || 400
    const p = { top: 20, right: 20, bottom: 40, left: 50 }
    return { chartWidth: w, chartHeight: h, padding: p }
  }, [width, config.height])
  
  const { bars, yMax } = useMemo(() => {
    const xField = config.xAxis?.field || 'x'
    const yField = config.yAxis?.field || 'y'
    
    const values = data.map(d => ({
      xLabel: String(d[xField] || ''),
      y: Number(d[yField]) || 0
    }))
    
    const max = Math.max(...values.map(v => v.y))
    const innerWidth = chartWidth - padding.left - padding.right
    const innerHeight = chartHeight - padding.top - padding.bottom
    const barWidth = Math.max(10, Math.min(50, innerWidth / values.length - 10))
    
    const barData = values.map((v, i) => ({
      x: padding.left + (i + 0.5) * (innerWidth / values.length) - barWidth / 2,
      y: chartHeight - padding.bottom - (v.y / (max || 1)) * innerHeight,
      width: barWidth,
      height: (v.y / (max || 1)) * innerHeight,
      xLabel: v.xLabel,
      value: v.y
    }))
    
    return { bars: barData, yMax: max }
  }, [data, chartWidth, chartHeight, padding, config.xAxis, config.yAxis])
  
  return (
    <svg width="100%" height={chartHeight} className="overflow-visible">
      {/* 网格线 */}
      {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
        <line
          key={ratio}
          x1={padding.left}
          x2={chartWidth - padding.right}
          y1={chartHeight - padding.bottom - ratio * (chartHeight - padding.top - padding.bottom)}
          y2={chartHeight - padding.bottom - ratio * (chartHeight - padding.top - padding.bottom)}
          stroke="#e5e7eb"
          strokeWidth="1"
          strokeDasharray="4"
        />
      ))}
      
      {/* Y 轴 */}
      {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
        <text
          key={ratio}
          x={padding.left - 10}
          y={chartHeight - padding.bottom - ratio * (chartHeight - padding.top - padding.bottom)}
          textAnchor="end"
          className="fill-zinc-500 text-xs"
        >
          {Math.round(ratio * yMax).toLocaleString()}
        </text>
      ))}
      
      {/* 柱子 */}
      {bars.map((bar, i) => (
        <g key={i}>
          <rect
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            fill={config.colors?.[i % (config.colors?.length || 7)] || '#06b6d4'}
            rx="4"
            className="cursor-pointer transition-all hover:opacity-80"
          />
          <text
            x={bar.x + bar.width / 2}
            y={chartHeight - padding.bottom + 20}
            textAnchor="middle"
            className="fill-zinc-500 text-xs"
          >
            {bar.xLabel.length > 6 ? bar.xLabel.slice(0, 6) + '..' : bar.xLabel}
          </text>
        </g>
      ))}
    </svg>
  )
}

/**
 * 饼图组件
 */
function PieChart({
  config,
  data
}: {
  config: ChartConfig
  data: Record<string, unknown>[]
}) {
  const size = 300
  const center = size / 2
  const radius = size / 2 - 40
  
  const { slices } = useMemo(() => {
    const labelField = config.xAxis?.field || 'x'
    const valueField = config.yAxis?.field || 'y'
    
    const values = data.map(d => ({
      label: String(d[labelField] || ''),
      value: Number(d[valueField]) || 0
    }))
    
    const total = values.reduce((sum, v) => sum + v.value, 0)
    let currentAngle = -90
    
    const sliceData = values.map((v, i) => {
      const angle = (v.value / total) * 360
      const startAngle = currentAngle
      currentAngle += angle
      return {
        label: v.label,
        value: v.value,
        percentage: ((v.value / total) * 100).toFixed(1),
        startAngle,
        endAngle: currentAngle,
        color: config.colors?.[i % (config.colors?.length || 7)] || '#06b6d4'
      }
    })
    
    return { slices: sliceData }
  }, [data, config.xAxis, config.yAxis, config.colors])
  
  const describeArc = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(center, center, radius, endAngle)
    const end = polarToCartesian(center, center, radius, startAngle)
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1
    
    return [
      'M', center, center,
      'L', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      'Z'
    ].join(' ')
  }
  
  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
    const rad = (angle * Math.PI) / 180
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    }
  }
  
  return (
    <div className="flex items-center justify-center gap-8">
      <svg width={size} height={size}>
        {slices.map((slice, i) => (
          <path
            key={i}
            d={describeArc(slice.startAngle, slice.endAngle)}
            fill={slice.color}
            stroke="white"
            strokeWidth="2"
            className="cursor-pointer transition-all hover:opacity-80"
          />
        ))}
      </svg>
      
      {/* 图例 */}
      <div className="space-y-2">
        {slices.map((slice, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {slice.label}: {slice.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 面积图组件（复用折线图逻辑）
 */
function AreaChart(props: { config: ChartConfig; data: Record<string, unknown>[]; width: number }) {
  // 简化实现，使用折线图样式
  return <LineChart {...props} />
}

/**
 * 散点图组件
 */
function ScatterChart({
  config,
  data,
  width
}: {
  config: ChartConfig
  data: Record<string, unknown>[]
  width: number
}) {
  const chartHeight = config.height || 400
  const padding = { top: 20, right: 20, bottom: 40, left: 50 }
  
  const points = useMemo(() => {
    const xField = config.xAxis?.field || 'x'
    const yField = config.yAxis?.field || 'y'
    
    const values = data.map(d => ({
      x: Number(d[xField]) || 0,
      y: Number(d[yField]) || 0
    }))
    
    const xMax = Math.max(...values.map(v => v.x))
    const yMax = Math.max(...values.map(v => v.y))
    const innerWidth = width - padding.left - padding.right
    const innerHeight = chartHeight - padding.top - padding.bottom
    
    return values.map(v => ({
      cx: padding.left + (v.x / (xMax || 1)) * innerWidth,
      cy: chartHeight - padding.bottom - (v.y / (yMax || 1)) * innerHeight
    }))
  }, [data, width, chartHeight, padding, config.xAxis, config.yAxis])
  
  return (
    <svg width="100%" height={chartHeight}>
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.cx}
          cy={p.cy}
          r="6"
          fill={config.colors?.[0] || '#06b6d4'}
          opacity="0.7"
          className="cursor-pointer transition-all hover:opacity-100"
        />
      ))}
    </svg>
  )
}

/**
 * 热力图组件
 */
function HeatmapChart({
  config,
  data
}: {
  config: ChartConfig
  data: Record<string, unknown>[]
}) {
  // 简化实现：使用表格显示
  return <DataTable config={config} data={data} />
}

/**
 * 数据表格组件
 */
function DataTable({
  config,
  data
}: {
  config: ChartConfig
  data: Record<string, unknown>[]
}) {
  const fields = Object.keys(data[0] || {})
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
        <thead className="bg-zinc-50 dark:bg-zinc-800">
          <tr>
            {fields.map(field => (
              <th
                key={field}
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
              >
                {field}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-700 dark:bg-zinc-900">
          {data.slice(0, 50).map((row, i) => (
            <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
              {fields.map(field => (
                <td
                  key={field}
                  className="whitespace-nowrap px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100"
                >
                  {formatCellValue(row[field])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * 格式化单元格值
 */
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'number') return value.toLocaleString()
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}