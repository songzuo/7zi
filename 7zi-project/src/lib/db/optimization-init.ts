/**
 * 数据库优化启动脚本
 * Database Optimization Startup Script
 *
 * 这个脚本在应用启动时运行，初始化缓存和数据库优化任务
 */

import { startCacheCleanup, warmupCache } from '@/lib/db/cache';
import { getDatabaseAsync } from '@/lib/db';
import { logger } from '@/lib/logger';

let cacheCleanupInterval: NodeJS.Timeout | null = null;

/**
 * 初始化数据库优化
 */
export async function initializeDatabaseOptimization(): Promise<void> {
  logger.info('Initializing database optimization...', { category: 'db' });

  try {
    // 1. 确保数据库已连接
    const db = await getDatabaseAsync();
    logger.info('Database connected', { category: 'db' });

    // 2. 预热缓存
    logger.info('Warming up cache...', { category: 'db' });
    await warmupCache();
    logger.info('Cache warmed up successfully', { category: 'db' });

    // 3. 启动定期缓存清理
    logger.info('Starting periodic cache cleanup...', { category: 'db' });
    cacheCleanupInterval = startCacheCleanup(60 * 1000); // 每60秒清理一次
    logger.info('Cache cleanup started', { category: 'db' });

    // 4. 在生产环境，可以考虑运行定期优化
    if (process.env.NODE_ENV === 'production') {
      // 可以在这里添加 cron 任务或其他定期任务
      logger.debug('Production mode detected', { category: 'db' });
    }

    logger.info('Initialization completed', { category: 'db' });
  } catch (error) {
    logger.error('Initialization failed', error, { category: 'db' });
    throw error;
  }
}

/**
 * 清理数据库优化资源
 */
export function cleanupDatabaseOptimization(): void {
  logger.info('Cleaning up database optimization resources...', { category: 'db' });

  if (cacheCleanupInterval) {
    clearInterval(cacheCleanupInterval);
    cacheCleanupInterval = null;
    logger.info('Cache cleanup interval cleared', { category: 'db' });
  }

  logger.info('Cleanup completed', { category: 'db' });
}

/**
 * 获取优化状态
 */
export function getOptimizationStatus(): {
  isCacheCleanupRunning: boolean;
  cleanupIntervalMs: number;
} {
  return {
    isCacheCleanupRunning: cacheCleanupInterval !== null,
    cleanupIntervalMs: cacheCleanupInterval ? 60000 : 0,
  };
}

// 如果在服务端运行，自动初始化
if (typeof window === 'undefined') {
  // 只在 Node.js 环境中自动初始化
  initializeDatabaseOptimization().catch(error => {
    logger.error('Auto-initialization failed', error, { category: 'db' });
  });
}

// 导出给应用使用
export default {
  initialize: initializeDatabaseOptimization,
  cleanup: cleanupDatabaseOptimization,
  getStatus: getOptimizationStatus,
};
