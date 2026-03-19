import { NextResponse } from 'next/server';
import { getDatabaseAsync } from '@/lib/db';
import { getDatabaseHealth } from '@/lib/db/migrations';
import { generatePerformanceReport } from '@/lib/db/performance-analyzer';
import { getCacheStats } from '@/lib/db/cache';
import { logger } from '@/lib/logger';

/**
 * GET /api/database/health - 获取数据库健康状态
 */
export async function GET() {
  try {
    const db = await getDatabaseAsync();

    // 检查数据库连接
    const connectionHealth = {
      connected: db !== null,
      isOpen: (db as any)?.open ?? false,
    };

    if (!connectionHealth.connected || !connectionHealth.isOpen) {
      return NextResponse.json(
        {
          success: false,
          health: 'unhealthy',
          error: 'Database connection failed',
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

    return NextResponse.json({
      success: true,
      health: healthStatus,
      healthScore: Number(healthScore.toFixed(2)),
      timestamp: new Date().toISOString(),
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
    logger.error('Failed to check database health', error);
    return NextResponse.json(
      {
        success: false,
        health: 'unhealthy',
        error: 'Failed to check database health',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * 计算健康分数 (0-100)
 */
function calculateHealthScore(
  dbHealth: any,
  perfReport: any,
  cacheStats: any
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
  const fragmentation = dbHealth.size?.fragmentationPercent || 0;
  if (fragmentation > 20) {
    score -= 15;
  } else if (fragmentation > 10) {
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
  dbHealth: any,
  perfReport: any,
  cacheStats: any,
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
      if (idx.priority === 'high') {
        recommendations.push(`  - 高优先级: ${idx.suggestedIndex}`);
      }
    }
  }

  // 数据库大小
  const dbSize = perfReport.databaseSize.sizeInMB || 0;
  if (dbSize > 500) {
    recommendations.push(`数据库较大 (${dbSize.toFixed(2)}MB)，建议清理旧数据或运行 VACUUM`);
  }

  // 碎片率
  const fragmentation = dbHealth.size?.fragmentationPercent || 0;
  if (fragmentation > 10) {
    recommendations.push(`数据库碎片率较高 (${fragmentation.toFixed(1)}%)，建议运行 VACUUM`);
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
