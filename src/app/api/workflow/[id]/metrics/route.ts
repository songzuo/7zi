/**
 * 获取工作流性能指标
 * GET /api/workflow/:id/metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { workflowMonitoring } from '@/lib/workflow/monitoring'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params
    
    // 解析查询参数
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const executionId = searchParams.get('executionId')
    const trendDays = parseInt(searchParams.get('trendDays') || '7')
    const includeTrend = searchParams.get('includeTrend') === 'true'
    const includeBottlenecks = searchParams.get('includeBottlenecks') === 'true'
    const bottleneckLimit = parseInt(searchParams.get('bottleneckLimit') || '5')

    const response: Record<string, unknown> = {}

    // 获取特定执行的指标
    if (executionId) {
      const metrics = workflowMonitoring.getMetrics(workflowId, executionId)
      response.metrics = metrics
    }

    // 获取工作流整体指标
    const workflowMetrics = workflowMonitoring.getWorkflowMetrics(workflowId, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })
    response.workflowMetrics = workflowMetrics

    // 获取性能趋势
    if (includeTrend) {
      const trend = workflowMonitoring.getPerformanceTrend(workflowId, trendDays)
      response.trend = trend
    }

    // 获取瓶颈节点
    if (includeBottlenecks) {
      const bottlenecks = workflowMonitoring.getBottleneckNodes(workflowId, bottleneckLimit)
      response.bottlenecks = bottlenecks
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching workflow metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workflow metrics' },
      { status: 500 }
    )
  }
}