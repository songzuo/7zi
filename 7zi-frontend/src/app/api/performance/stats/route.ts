/**
 * Performance Statistics API
 *
 * 提供综合的性能统计信息，包括缓存、查询、压缩等
 */

import { NextRequest, NextResponse } from 'next/server'
import { HotDataCache, CachePresets } from '@/lib/cache/hot-data-cache'
import { QueryOptimizer, QueryOptimizerPresets } from '@/lib/db/query-optimizer'
import { ResponseCompressionMiddleware } from '@/middleware/response-compression'

// 全局实例（实际使用时应从依赖注入获取）
let cacheInstance: HotDataCache | null = null
let queryOptimizer: QueryOptimizer | null = null
let compressionMiddleware: ResponseCompressionMiddleware | null = null

/**
 * 初始化全局实例
 */
function initializeInstances() {
  if (!cacheInstance) {
    cacheInstance = new HotDataCache(CachePresets.MEDIUM)
  }

  if (!queryOptimizer) {
    queryOptimizer = new QueryOptimizer(QueryOptimizerPresets.PRODUCTION)
  }

  if (!compressionMiddleware) {
    compressionMiddleware = new ResponseCompressionMiddleware()
  }
}

/**
 * GET /api/performance/stats
 *
 * 获取综合性能统计
 */
export async function GET(request: NextRequest) {
  try {
    initializeInstances()

    const searchParams = request.nextUrl.searchParams
    const include = searchParams.get('include')?.split(',') || ['all']

    const stats: Record<string, unknown> = {}

    // 缓存统计
    if (include.includes('all') || include.includes('cache')) {
      stats.cache = cacheInstance?.getStats()
    }

    // 查询统计
    if (include.includes('all') || include.includes('queries')) {
      stats.queries = queryOptimizer?.getStats()
    }

    // 压缩统计
    if (include.includes('all') || include.includes('compression')) {
      stats.compression = compressionMiddleware?.getStats()
    }

    // 系统概览
    if (include.includes('all') || include.includes('overview')) {
      stats.overview = {
        timestamp: Date.now(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      }
    }

    // 添加时间范围过滤
    const timeRange = searchParams.get('timeRange')
    if (timeRange) {
      const now = Date.now()
      let startTime = 0

      switch (timeRange) {
        case '1h':
          startTime = now - 60 * 60 * 1000
          break
        case '24h':
          startTime = now - 24 * 60 * 60 * 1000
          break
        case '7d':
          startTime = now - 7 * 24 * 60 * 60 * 1000
          break
        default:
          startTime = 0
      }

      stats.timeRange = { start: startTime, end: now }
    }

    return NextResponse.json({
      success: true,
      data: stats,
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
 * DELETE /api/performance/stats
 *
 * 重置所有统计信息
 */
export async function DELETE(request: NextRequest) {
  try {
    initializeInstances()

    const searchParams = request.nextUrl.searchParams
    const target = searchParams.get('target') || 'all'

    if (target === 'all' || target === 'cache') {
      // 不清除缓存数据，只清除统计
    }

    if (target === 'all' || target === 'queries') {
      queryOptimizer?.resetStats()
    }

    if (target === 'all' || target === 'compression') {
      compressionMiddleware?.resetStats()
    }

    return NextResponse.json({
      success: true,
      message: 'Statistics reset successfully',
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