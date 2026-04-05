/**
 * Cache Performance API
 *
 * 提供缓存性能监控和管理
 */

import { NextRequest, NextResponse } from 'next/server'
import { HotDataCache, CachePresets } from '@/lib/cache/hot-data-cache'

// 全局实例
let cacheInstance: HotDataCache | null = null

/**
 * 初始化缓存实例
 */
function getCacheInstance(): HotDataCache {
  if (!cacheInstance) {
    cacheInstance = new HotDataCache(CachePresets.MEDIUM)
  }
  return cacheInstance
}

/**
 * GET /api/performance/cache
 *
 * 获取缓存统计信息
 */
export async function GET(request: NextRequest) {
  try {
    const cache = getCacheInstance()
    const stats = cache.getStats()

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
 * DELETE /api/performance/cache
 *
 * 清除缓存
 */
export async function DELETE(request: NextRequest) {
  try {
    const cache = getCacheInstance()
    const searchParams = request.nextUrl.searchParams
    const pattern = searchParams.get('pattern')
    const tenantId = searchParams.get('tenantId')
    const userId = searchParams.get('userId')
    const endpoint = searchParams.get('endpoint')

    let deletedCount = 0

    if (pattern) {
      deletedCount = cache.deleteByPattern(new RegExp(pattern))
    } else if (tenantId) {
      deletedCount = cache.deleteByTenant(tenantId)
    } else if (userId) {
      deletedCount = cache.deleteByUser(userId)
    } else if (endpoint) {
      deletedCount = cache.deleteByEndpoint(endpoint)
    } else {
      cache.clear()
      deletedCount = -1 // 表示全部清除
    }

    return NextResponse.json({
      success: true,
      data: {
        deletedCount,
        message: deletedCount === -1 ? 'All cache cleared' : `${deletedCount} entries deleted`,
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
 * POST /api/performance/cache/warmup
 *
 * 预热缓存
 */
export async function POST(request: NextRequest) {
  try {
    const cache = getCacheInstance()
    const body = await request.json()

    const items = body.items || []
    cache.warmup(items)

    return NextResponse.json({
      success: true,
      data: {
        warmedUpCount: items.length,
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