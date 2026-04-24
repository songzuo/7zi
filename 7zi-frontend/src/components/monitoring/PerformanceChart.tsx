/**
 * Performance Chart Component
 * 轻量级性能图表组件 - 使用 SVG 绘制，不依赖大型图表库
 */

'use client'

import React, { useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export interface ChartDataPoint {
  timestamp: number
  value: number
}

export interface PerformanceChartProps {
  data: ChartDataPoint[]
  title: string
  unit?: string
  color?: string
  height?: number
  showGrid?: boolean
  showArea?: boolean
  minY?: number
  maxY?: number
  threshold?: number
  thresholdColor?: string
  thresholdLabel?: string
}

export function PerformanceChart({
  data,
  title,
  unit = '',
  color = '#3b82f6',
  height = 200,
  showGrid = true,
  showArea = true,
  minY,
  maxY,
  threshold,
  thresholdColor = '#ef4444',
  thresholdLabel,
}: PerformanceChartProps): React.ReactElement {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return

    const svg = svgRef.current
    const width = svg.clientWidth
    const padding = { top: 20, right: 20, bottom: 30, left: 50 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    // 计算Y轴范围
    const values = data.map(d => d.value)
    const minValue = minY !== undefined ? minY : Math.min(...values, 0)
    const maxValue = maxY !== undefined ? maxY : Math.max(...values)

    const valueRange = maxValue - minValue || 1

    // 清空SVG
    svg.innerHTML = ''

    // 创建组
    const chartGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    chartGroup.setAttribute('transform', `translate(${padding.left}, ${padding.top})`)
    svg.appendChild(chartGroup)

    // 绘制网格线
    if (showGrid) {
      const gridLines = 5
      for (let i = 0; i <= gridLines; i++) {
        const y = (chartHeight / gridLines) * i
        const value = maxValue - (valueRange / gridLines) * i

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        line.setAttribute('x1', '0')
        line.setAttribute('y1', y.toString())
        line.setAttribute('x2', chartWidth.toString())
        line.setAttribute('y2', y.toString())
        line.setAttribute('stroke', '#e5e7eb')
        line.setAttribute('stroke-width', '1')
        line.setAttribute('stroke-dasharray', '4')
        chartGroup.appendChild(line)

        // Y轴标签
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        text.setAttribute('x', '-10')
        text.setAttribute('y', (y + 4).toString())
        text.setAttribute('text-anchor', 'end')
        text.setAttribute('font-size', '10')
        text.setAttribute('fill', '#6b7280')
        text.textContent = value.toFixed(0)
        chartGroup.appendChild(text)
      }
    }

    // 绘制阈值线
    if (threshold !== undefined) {
      const thresholdY = chartHeight - ((threshold - minValue) / valueRange) * chartHeight

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('x1', '0')
      line.setAttribute('y1', thresholdY.toString())
      line.setAttribute('x2', chartWidth.toString())
      line.setAttribute('y2', thresholdY.toString())
      line.setAttribute('stroke', thresholdColor)
      line.setAttribute('stroke-width', '2')
      line.setAttribute('stroke-dasharray', '5,5')
      chartGroup.appendChild(line)

      if (thresholdLabel) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        text.setAttribute('x', '5')
        text.setAttribute('y', (thresholdY - 5).toString())
        text.setAttribute('font-size', '10')
        text.setAttribute('fill', thresholdColor)
        text.textContent = thresholdLabel
        chartGroup.appendChild(text)
      }
    }

    // 计算数据点坐标
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1 || 1)) * chartWidth
      const y = chartHeight - ((d.value - minValue) / valueRange) * chartHeight
      return { x, y, value: d.value, timestamp: d.timestamp }
    })

    if (points.length === 0) return

    // 绘制面积
    if (showArea) {
      const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      const d = `M ${points[0].x},${chartHeight} L ${points.map(p => `${p.x},${p.y}`).join(' L ')} L ${points[points.length - 1].x},${chartHeight} Z`
      areaPath.setAttribute('d', d)
      areaPath.setAttribute('fill', color)
      areaPath.setAttribute('fill-opacity', '0.2')
      chartGroup.appendChild(areaPath)
    }

    // 绘制线条
    const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    const lineD = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`
    linePath.setAttribute('d', lineD)
    linePath.setAttribute('fill', 'none')
    linePath.setAttribute('stroke', color)
    linePath.setAttribute('stroke-width', '2')
    linePath.setAttribute('stroke-linejoin', 'round')
    linePath.setAttribute('stroke-linecap', 'round')
    chartGroup.appendChild(linePath)

    // 绘制数据点（鼠标悬停时显示）
    points.forEach((p, i) => {
      if (i % Math.ceil(points.length / 10) !== 0) return // 只显示部分点以避免拥挤

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      circle.setAttribute('cx', p.x.toString())
      circle.setAttribute('cy', p.y.toString())
      circle.setAttribute('r', '3')
      circle.setAttribute('fill', color)
      circle.setAttribute('stroke', 'white')
      circle.setAttribute('stroke-width', '2')
      chartGroup.appendChild(circle)
    })

    // 添加鼠标交互
    svg.addEventListener('mousemove', (e) => {
      const rect = svg.getBoundingClientRect()
      const mouseX = e.clientX - rect.left - padding.left

      if (mouseX < 0 || mouseX > chartWidth) return

      // 找到最近的数据点
      const index = Math.round((mouseX / chartWidth) * (points.length - 1))
      const point = points[Math.max(0, Math.min(index, points.length - 1))]

      // 清除旧的tooltip
      const oldTooltip = svg.querySelector('.tooltip')
      if (oldTooltip) oldTooltip.remove()

      // 添加tooltip
      const tooltip = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      tooltip.setAttribute('class', 'tooltip')

      const rectTooltip = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rectTooltip.setAttribute('x', (point.x + 10).toString())
      rectTooltip.setAttribute('y', (point.y - 30).toString())
      rectTooltip.setAttribute('width', '80')
      rectTooltip.setAttribute('height', '40')
      rectTooltip.setAttribute('fill', 'rgba(0, 0, 0, 0.8)')
      rectTooltip.setAttribute('rx', '4')
      tooltip.appendChild(rectTooltip)

      const tooltipText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      tooltipText.setAttribute('x', (point.x + 50).toString())
      tooltipText.setAttribute('y', (point.y - 12).toString())
      tooltipText.setAttribute('text-anchor', 'middle')
      tooltipText.setAttribute('font-size', '11')
      tooltipText.setAttribute('fill', 'white')
      tooltipText.textContent = `${point.value.toFixed(2)}${unit}`
      tooltip.appendChild(tooltipText)

      const tooltipTime = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      tooltipTime.setAttribute('x', (point.x + 50).toString())
      tooltipTime.setAttribute('y', (point.y + 2).toString())
      tooltipTime.setAttribute('text-anchor', 'middle')
      tooltipTime.setAttribute('font-size', '9')
      tooltipTime.setAttribute('fill', '#9ca3af')
      const date = new Date(point.timestamp)
      tooltipTime.textContent = `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
      tooltip.appendChild(tooltipTime)

      chartGroup.appendChild(tooltip)
    })

    svg.addEventListener('mouseleave', () => {
      const tooltip = svg.querySelector('.tooltip')
      if (tooltip) tooltip.remove()
    })
  }, [data, color, height, showGrid, showArea, minY, maxY, threshold, thresholdColor, thresholdLabel, unit])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          style={{ display: 'block' }}
        />
      </CardContent>
    </Card>
  )
}
