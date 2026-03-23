import { NextResponse } from 'next/server';
import { getDatabaseAsync, getDatabaseStats } from '@/lib/db';
import { getDatabaseHealth, type DatabaseHealthResult as DatabaseHealth } from '@/lib/db/migrations';
import { generatePerformanceReport, type PerformanceReport } from '@/lib/db/performance-analyzer';
import { getCacheStats } from '@/lib/db/cache';

import { createSuccessResponse } from '@/lib/api/utils';
import { createErrorResponse } from '@/lib/api/error-handler';
import { getLocaleFromRequest } from '@/lib/api/user-messages';
import { createApiContext, logApiError } from '@/lib/api/error-logger';
import { withRateLimit } from '@/lib/middleware/rate-limit';
import { withCors } from '@/middleware/cors';

/**
 * Cache stats from getCacheStats()
 */
interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  entries: number;
  totalSize: number;
  evictions: number;
}

/**
 * GET /api/database/health - 获取数据库健康状态
 */
async function GETHandler(request: Request) {
  const startTime = Date.now();
  const requestId = (request.headers as Headers).get('x-request-id') || crypto.randomUUID();
  const locale = getLocaleFromRequest(request);
  const context = createApiContext(request);

  try {
    const db = await getDatabaseAsync();

    // 检查数据库连接 - 使用 getDatabaseStats 来获取真实连接状态
    const stats = getDatabaseStats();
    const connectionHealth = {
      connected: db !== null,
      isOpen: stats.isOpen,
      isMemoryDatabase: stats.isMemoryDatabase,
      connectionCount: stats.connectionCount,
    };

    if (!connectionHealth.connected || !connectionHealth.isOpen) {
      const error = new Error('Database connection failed');
      logApiError(error, { ...context, requestId, duration: Date.now() - startTime });

      return NextResponse.json(
        {
          success: false,
          health: 'unhealthy',
          error: {
            type: 'SERVICE_UNAVAILABLE',
            message: 'Database connection failed',
            timestamp: new Date().toISOString(),
          },
          requestId,
        },
        { status: 503 }
      );
    }

    // 获取数据库健康报告
    const dbHealth = await getDatabaseHealth();

    // 获取性能报告
    const perfReport = await generatePerformanceReport();

    // 获取缓存统计
    const cacheStats = getCacheStats();

    // 计算整体健康分数
    const healthScore = calculateHealthScore(dbHealth, perfReport, cacheStats);

    // 确定健康状态
    let healthStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (healthScore < 50) {
      healthStatus = 'unhealthy';
    } else if (healthScore < 80) {
      healthStatus = 'degraded';
    }

    // 生成建议
    const recommendations = generateRecommendations(dbHealth, perfReport, cacheStats, healthScore);

    return createSuccessResponse({
      health: healthStatus,
      healthScore: Number(healthScore.toFixed(2)),
      connection: connectionHealth,
      database: {
        size: dbHealth.size,
        migrations: {
          current: dbHealth.migrationVersion,
          latest: dbHealth.latestMigration,
          needsMigration: dbHealth.needsMigration,
        },
      },
      performance: {
        slowQueries: perfReport.slowQueries.length,
        missingIndexes: perfReport.missingIndexes.length,
        databaseSize: perfReport.databaseSize,
      },
      cache: {
        ...cacheStats,
        hitRatePercent: Number((cacheStats.hitRate * 100).toFixed(2)),
        totalSizeMB: Number((cacheStats.totalSize / (1024 * 1024)).toFixed(2)),
        status: cacheStats.hitRate > 0.7 ? 'good' : cacheStats.hitRate > 0.5 ? 'fair' : 'poor',
      },
      recommendations,
      details: {
        tables: perfReport.tableAnalyses.map(t => ({
          name: t.name,
          rowCount: t.rowCount,
          indexCount: t.indexes.length,
          hasSuggestions: t.suggestions.length > 0,
        })),
      },
    });
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error('Failed to check database health');
    const duration = Date.now() - startTime;

    logApiError(errorObj, { ...context, requestId, duration });
    return await createErrorResponse(errorObj, undefined, undefined, locale, requestId);
  }
}

export const GET = withCors(
  withRateLimit((request: Request) => GETHandler(request), { windowMs: 60000, maxRequests: 50 })
);

/**
 * 计算健康分数 (0-100)
 */
function calculateHealthScore(
  dbHealth: DatabaseHealth,
  perfReport: PerformanceReport,
  cacheStats: CacheStats
): number {
  let score = 100;

  // 检查数据库迁移
  if (dbHealth.needsMigration) {
    score -= 20;
  }

  // 检查慢查询
  if (perfReport.slowQueries.length > 10) {
    score -= 30;
  } else if (perfReport.slowQueries.length > 5) {
    score -= 15;
  } else if (perfReport.slowQueries.length > 0) {
    score -= 5;
  }

  // 检查缺失的索引
  if (perfReport.missingIndexes.length > 5) {
    score -= 20;
  } else if (perfReport.missingIndexes.length > 0) {
    score -= 10;
  }

  // 检查数据库大小
  const dbSize = perfReport.databaseSize.sizeInMB || 0;
  if (dbSize > 1000) {
    score -= 15;
  } else if (dbSize > 500) {
    score -= 5;
  }

  // 检查碎片率
  const fragmentationPercent = dbHealth.size
    ? (dbHealth.size.freePages / dbHealth.size.pageCount) * 100
    : 0;
  if (fragmentationPercent > 20) {
    score -= 15;
  } else if (fragmentationPercent > 10) {
    score -= 5;
  }

  // 检查缓存命中率
  if (cacheStats.hitRate < 0.5) {
    score -= 20;
  } else if (cacheStats.hitRate < 0.7) {
    score -= 10;
  } else if (cacheStats.hitRate < 0.8) {
    score -= 5;
  }

  // 确保分数在 0-100 之间
  return Math.max(0, Math.min(100, score));
}

/**
 * 生成建议
 */
function generateRecommendations(
  dbHealth: DatabaseHealth,
  perfReport: PerformanceReport,
  cacheStats: CacheStats,
  healthScore: number
): string[] {
  const recommendations: string[] = [];

  // 数据库迁移
  if (dbHealth.needsMigration) {
    recommendations.push('运行数据库迁移以保持最新版本');
  }

  // 慢查询
  if (perfReport.slowQueries.length > 0) {
    recommendations.push(`发现 ${perfReport.slowQueries.length} 个慢查询，建议添加索引或优化查询`);
    for (const sq of perfReport.slowQueries.slice(0, 3)) {
      if (sq.suggestedIndex) {
        recommendations.push(`  - 考虑添加索引: ${sq.suggestedIndex}`);
      }
    }
  }

  // 缺失的索引
  if (perfReport.missingIndexes.length > 0) {
    recommendations.push(`发现 ${perfReport.missingIndexes.length} 个缺失的索引`);
    for (const idx of perfReport.missingIndexes.slice(0, 3)) {
      recommendations.push(`  - 表 ${idx.table}: ${idx.reason} (${idx.columns.join(', ')})`);
    }
  }

  // 数据库大小
  const dbSize = perfReport.databaseSize.sizeInMB || 0;
  if (dbSize > 500) {
    recommendations.push(`数据库较大 (${dbSize.toFixed(2)}MB)，建议清理旧数据或运行 VACUUM`);
  }

  // 碎片率
  const fragmentationPercent = dbHealth.size
    ? (dbHealth.size.freePages / dbHealth.size.pageCount) * 100
    : 0;
  if (fragmentationPercent > 10) {
    recommendations.push(`数据库碎片率较高 (${fragmentationPercent.toFixed(1)}%)，建议运行 VACUUM`);
  }

  // 缓存
  if (cacheStats.hitRate < 0.7) {
    recommendations.push(
      `缓存命中率较低 (${(cacheStats.hitRate * 100).toFixed(1)}%)，建议调整缓存策略或TTL`
    );
  }

  // 表分析
  for (const table of perfReport.tableAnalyses) {
    if (table.suggestions.length > 0) {
      recommendations.push(`${table.name}: ${table.suggestions[0]}`);
    }
  }

  // 如果整体健康度低，添加紧急建议
  if (healthScore < 60) {
    recommendations.push('⚠️ 数据库健康状况不佳，建议立即运行优化');
  }

  return recommendations;
}
