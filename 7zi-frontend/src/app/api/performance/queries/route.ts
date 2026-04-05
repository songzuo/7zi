/**
 * Query Performance API
 *
 * 提供查询性能监控和优化建议
 */

import { NextRequest, NextResponse } from 'next/server'
import { QueryOptimizer, QueryOptimizerPresets } from '@/lib/db/query-optimizer'

// 全局实例
let queryOptimizer: QueryOptimizer | null = null

/**
 * 获取查询优化器实例
 */
function getQueryOptimizer(): QueryOptimizer {
  if (!queryOptimizer) {
    queryOptimizer = new QueryOptimizer(QueryOptimizerPresets.PRODUCTION)
  }
  return queryOptimizer
}

/**
 * GET /api/performance/queries
 *
 * 获取查询统计和日志
 */
export async function GET(request: NextRequest) {
  try {
    const optimizer = getQueryOptimizer()
    const searchParams = request.nextUrl.searchParams

    // 获取查询日志
    const logs = optimizer.getQueryLogs({
      type: searchParams.get('type') as any,
      isN1: searchParams.get('isN1') === 'true',
      minDuration: searchParams.get('minDuration') ? parseInt(searchParams.get('minDuration')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    })

    // 获取优化建议
    const suggestions = optimizer.getOptimizationSuggestions()

    // 获取统计
    const stats = optimizer.getStats()

    return NextResponse.json({
      success: true,
      data: {
        logs,
        suggestions,
        stats,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/performance/queries
 *
 * 清除查询日志
 */
export async function DELETE(request: NextRequest) {
  try {
    const optimizer = getQueryOptimizer()
    const searchParams = request.nextUrl.searchParams
    const target = searchParams.get('target') || 'logs'

    if (target === 'logs') {
      optimizer.clearLogs()
    } else if (target === 'cache') {
      optimizer.clearCache()
    } else if (target === 'all') {
      optimizer.clearLogs()
      optimizer.clearCache()
      optimizer.resetStats()
    }

    return NextResponse.json({
      success: true,
      message: `Cleared ${target}`,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/performance/queries/execute
 *
 * 执行带优化的查询
 */
export async function POST(request: NextRequest) {
  try {
    const optimizer = getQueryOptimizer()
    const body = await request.json()

    const { queryFn, query, params, options } = body

    if (!queryFn || !query) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing queryFn or query',
        },
        { status: 400 }
      )
    }

    // 执行优化后的查询
    const result = await optimizer.executeQuery(
      queryFn,
      query,
      params,
      options
    )

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}