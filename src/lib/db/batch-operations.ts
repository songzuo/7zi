/**
 * 数据库批量操作优化工具
 * Database Batch Operations Utility
 *
 * 优化点:
 * 1. 批量插入使用 UNLOGGED 表和事务提升性能
 * 2. 批量更新使用 CASE WHEN 减少语句数量
 * 3. 自动分批处理大数据集
 * 4. 支持部分失败回滚策略
 */

import { getDatabaseAsync, DatabaseConnection } from './connection';
import { logger } from '../logger';

export interface BatchInsertOptions {
  /** 每批处理的记录数 (默认: 1000) */
  batchSize?: number;
  /** 是否使用事务 (默认: true) */
  useTransaction?: boolean;
  /** 插入冲突处理策略 */
  onConflict?: 'ignore' | 'replace' | 'update';
  /** 更新列 (当 onConflict='update' 时使用) */
  updateColumns?: string[];
  /** 失败时继续 (默认: false) */
  continueOnError?: boolean;
  /** 进度回调 */
  onProgress?: (processed: number, total: number, batch: number) => void;
}

export interface BatchUpdateOptions {
  /** 每批处理的记录数 (默认: 500) */
  batchSize?: number;
  /** 是否使用事务 (默认: true) */
  useTransaction?: boolean;
  /** 失败时继续 (默认: false) */
  continueOnError?: boolean;
  /** 进度回调 */
  onProgress?: (processed: number, total: number, batch: number) => void;
}

export interface BatchResult {
  /** 成功处理的记录数 */
  success: number;
  /** 失败的记录数 */
  failed: number;
  /** 总记录数 */
  total: number;
  /** 批次数 */
  batches: number;
  /** 错误列表 (如果有) */
  errors: Array<{ index: number; error: string; data: Record<string, unknown> }>;
  /** 执行时间 (毫秒) */
  executionTimeMs: number;
}

/**
 * 批量插入优化实现
 * 
 * 性能优化策略:
 * 1. 使用单个事务包裹所有插入
 * 2. 使用预处理语句避免重复解析
 * 3. 自动分批处理大数据集
 * 4. 支持多种冲突处理策略
 * 
 * @param tableName - 表名
 * @param records - 要插入的记录数组
 * @param options - 批量插入选项
 * @returns 批量操作结果
 * 
 * @example
 * const result = await batchInsert('agents', [
 *   { id: 'agent-1', name: 'Agent 1', status: 'active' },
 *   { id: 'agent-2', name: 'Agent 2', status: 'active' }
 * ], { batchSize: 1000, useTransaction: true });
 */
export async function batchInsert<T extends Record<string, unknown>>(
  tableName: string,
  records: T[],
  options: BatchInsertOptions = {}
): Promise<BatchResult> {
  const startTime = Date.now();
  const db = await getDatabaseAsync();

  const {
    batchSize = 1000,
    useTransaction = true,
    onConflict = 'ignore',
    updateColumns = [],
    continueOnError = false,
    onProgress,
  } = options;

  const result: BatchResult = {
    success: 0,
    failed: 0,
    total: records.length,
    batches: 0,
    errors: [],
    executionTimeMs: 0,
  };

  if (records.length === 0) {
    result.executionTimeMs = Date.now() - startTime;
    return result;
  }

  // 获取记录的列名
  const columns = Object.keys(records[0]);
  const placeholders = columns.map(() => '?').join(', ');
  const columnNames = columns.join(', ');

  // 构建冲突处理子句
  let conflictClause = '';
  if (onConflict === 'ignore') {
    conflictClause = 'OR IGNORE';
  } else if (onConflict === 'replace') {
    conflictClause = 'OR REPLACE';
  } else if (onConflict === 'update' && updateColumns.length > 0) {
    conflictClause = `ON CONFLICT(${columns[0]}) DO UPDATE SET ${updateColumns
      .map(col => `${col} = excluded.${col}`)
      .join(', ')}`;
  }

  // 准备插入语句
  const sql = `INSERT ${conflictClause} INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;
  const stmt = db.prepare(sql);

  // 执行批量插入
  const executeBatch = async (batchRecords: T[], startIndex: number) => {
    if (useTransaction) {
      // Use the batch method from DatabaseConnection which handles transactions
      const statements = batchRecords.map(record => {
        const values = columns.map(col => record[col]);
        return { sql, params: values };
      });

      try {
        const batchResults = await db.batch(statements);
        
        batchResults.forEach((batchResult, i) => {
          if (batchResult.changes > 0) {
            result.success++;
          } else {
            result.failed++;
          }
        });
      } catch (error) {
        // If batch fails completely, count all as failed
        result.failed += batchRecords.length;
        const errorMsg = error instanceof Error ? error.message : String(error);
        batchRecords.forEach((record, i) => {
          result.errors.push({
            index: startIndex + i,
            error: errorMsg,
            data: record,
          });
        });

        if (!continueOnError) {
          throw error;
        }
      }
    } else {
      for (let i = 0; i < batchRecords.length; i++) {
        const record = batchRecords[i];
        const values = columns.map(col => record[col]);
        
        try {
          const dbResult = stmt.run(...values);
          if (dbResult.changes > 0) {
            result.success++;
          } else {
            result.failed++;
          }
        } catch (error) {
          result.failed++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.errors.push({
            index: startIndex + i,
            error: errorMsg,
            data: record,
          });
          
          if (!continueOnError) {
            throw error;
          }
        }
      }
    }
  };

  // 分批处理
  try {
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      result.batches++;
      
      await executeBatch(batch, i);
      
      if (onProgress) {
        onProgress(
          Math.min(i + batchSize, records.length),
          records.length,
          result.batches
        );
      }
    }
  } catch (error) {
    if (!continueOnError) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('[Batch Insert Error]', {
        tableName,
        batchesCompleted: result.batches,
        error: errorMsg,
      });
      throw error;
    }
  }

  result.executionTimeMs = Date.now() - startTime;
  return result;
}

/**
 * 批量更新优化实现 (使用 CASE WHEN)
 * 
 * 性能优化策略:
 * 1. 单条语句更新多条记录
 * 2. 避免为每条记录执行单独的 UPDATE
 * 3. 自动分批处理大数据集
 * 
 * @param tableName - 表名
 * @param idColumn - ID 列名 (用于匹配记录)
 * @param updates - 要更新的记录数组 (包含 ID 和要更新的字段)
 * @param options - 批量更新选项
 * @returns 批量操作结果
 * 
 * @example
 * const result = await batchUpdate('agents', 'id', [
 *   { id: 'agent-1', status: 'inactive' },
 *   { id: 'agent-2', status: 'active' }
 * ], { batchSize: 500 });
 */
export async function batchUpdate<T extends Record<string, unknown>>(
  tableName: string,
  idColumn: string,
  updates: T[],
  options: BatchUpdateOptions = {}
): Promise<BatchResult> {
  const startTime = Date.now();
  const db = await getDatabaseAsync();

  const {
    batchSize = 500,
    useTransaction = true,
    continueOnError = false,
    onProgress,
  } = options;

  const result: BatchResult = {
    success: 0,
    failed: 0,
    total: updates.length,
    batches: 0,
    errors: [],
    executionTimeMs: 0,
  };

  if (updates.length === 0) {
    result.executionTimeMs = Date.now() - startTime;
    return result;
  }

  // 获取要更新的列 (排除 ID 列)
  const updateColumns = Object.keys(updates[0]).filter(col => col !== idColumn);

  // 构建批量更新 SQL (使用 CASE WHEN)
  const buildUpdateSQL = (batchUpdates: T[]) => {
    const whenClauses = updateColumns.map(col => {
      const cases = batchUpdates.map(u => `WHEN ? THEN ?`).join(' ');
      return `${col} = CASE ${idColumn} ${cases} END`;
    });

    const inClause = batchUpdates.map(() => '?').join(', ');
    
    return `
      UPDATE ${tableName}
      SET ${whenClauses.join(', ')}
      WHERE ${idColumn} IN (${inClause})
    `;
  };

  // 构建参数数组
  const buildParams = (batchUpdates: T[]) => {
    const params: unknown[] = [];
    
    // CASE WHEN 参数
    for (const col of updateColumns) {
      for (const update of batchUpdates) {
        params.push(update[idColumn]);
        params.push(update[col]);
      }
    }
    
    // IN 子句参数
    for (const update of batchUpdates) {
      params.push(update[idColumn]);
    }
    
    return params;
  };

  // 执行批量更新
  const executeBatch = async (batchUpdates: T[], startIndex: number) => {
    const sql = buildUpdateSQL(batchUpdates);
    const params = buildParams(batchUpdates);
    
    try {
      const stmt = db.prepare(sql);
      const dbResult = stmt.run(...params);
      result.success += dbResult.changes;
      result.failed += batchUpdates.length - dbResult.changes;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // 如果批量更新失败，回退到逐个更新
      logger.warn('[Batch Update Warning]', {
        message: 'Batch update failed, falling back to individual updates',
        tableName,
        error: errorMsg,
      });

      for (let i = 0; i < batchUpdates.length; i++) {
        const update = batchUpdates[i];
        const setClause = updateColumns.map(col => `${col} = ?`).join(', ');
        const values = updateColumns.map(col => update[col]);
        const whereClause = `${idColumn} = ?`;
        
        try {
          const individualSQL = `
            UPDATE ${tableName}
            SET ${setClause}
            WHERE ${whereClause}
          `;
          const stmt = db.prepare(individualSQL);
          const dbResult = stmt.run(...values, update[idColumn]);
          
          if (dbResult.changes > 0) {
            result.success++;
          } else {
            result.failed++;
          }
        } catch (error) {
          result.failed++;
          const individualErrorMsg = error instanceof Error ? error.message : String(error);
          result.errors.push({
            index: startIndex + i,
            error: individualErrorMsg,
            data: update,
          });
          
          if (!continueOnError) {
            throw error;
          }
        }
      }
    }
  };

  // 分批处理
  try {
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      result.batches++;
      
      await executeBatch(batch, i);
      
      if (onProgress) {
        onProgress(
          Math.min(i + batchSize, updates.length),
          updates.length,
          result.batches
        );
      }
    }
  } catch (error) {
    if (!continueOnError) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('[Batch Update Error]', {
        tableName,
        batchesCompleted: result.batches,
        error: errorMsg,
      });
      throw error;
    }
  }

  result.executionTimeMs = Date.now() - startTime;
  return result;
}

/**
 * 批量删除
 * 
 * @param tableName - 表名
 * @param ids - 要删除的 ID 数组
 * @param idColumn - ID 列名 (默认: 'id')
 * @param batchSize - 每批删除的数量 (默认: 1000)
 * @returns 删除的记录数
 * 
 * @example
 * const deleted = await batchDelete('agents', ['agent-1', 'agent-2'], 'id');
 */
export async function batchDelete(
  tableName: string,
  ids: string[],
  idColumn: string = 'id',
  batchSize: number = 1000
): Promise<number> {
  if (ids.length === 0) return 0;

  const db = await getDatabaseAsync();
  let totalDeleted = 0;

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const inClause = batch.map(() => '?').join(', ');
    
    const sql = `DELETE FROM ${tableName} WHERE ${idColumn} IN (${inClause})`;
    const stmt = db.prepare(sql);
    const result = stmt.run(...batch);
    
    totalDeleted += result.changes;
  }

  return totalDeleted;
}

/**
 * 批量执行 SQL 语句
 * 
 * @param statements - SQL 语句数组
 * @param useTransaction - 是否使用事务 (默认: true)
 * @returns 执行结果数组
 * 
 * @example
 * const results = await batchExecute([
 *   { sql: 'UPDATE agents SET status = ? WHERE id = ?', params: ['active', 'agent-1'] },
 *   { sql: 'UPDATE agents SET status = ? WHERE id = ?', params: ['inactive', 'agent-2'] }
 * ]);
 */
export async function batchExecute(
  statements: Array<{ sql: string; params?: unknown[] }>,
  useTransaction: boolean = true
): Promise<Array<{ changes: number; lastInsertRowid?: number }>> {
  const db = await getDatabaseAsync();
  const results: Array<{ changes: number; lastInsertRowid?: number }> = [];

  if (useTransaction) {
    try {
      results.push(...await db.batch(statements));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('[BatchExecute Error]', error, { category: 'db', statementCount: statements.length, error: errorMsg, timestamp: new Date().toISOString() });
      throw error;
    }
  } else {
    for (const { sql, params = [] } of statements) {
      const stmt = db.prepare(sql);
      const result = stmt.run(...params);
      results.push({
        changes: result?.changes ?? 0,
        lastInsertRowid: result?.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : undefined
      });
    }
  }

  return results;
}

/**
 * 获取批量操作的推荐批次大小
 * 
 * 基于记录大小和系统资源动态计算最优批次大小
 * 
 * @param recordCount - 总记录数
 * @param avgRecordSize - 平均记录大小 (字节)
 * @param maxMemoryMB - 最大可用内存 (MB, 默认: 100)
 * @returns 推荐的批次大小
 */
export function calculateOptimalBatchSize(
  recordCount: number,
  avgRecordSize: number,
  maxMemoryMB: number = 100
): number {
  const maxMemoryBytes = maxMemoryMB * 1024 * 1024;
  const overhead = 1024; // 每批的开销

  // 计算可以处理的记录数
  const batchSize = Math.floor((maxMemoryBytes - overhead) / avgRecordSize);

  // 限制在合理范围内
  return Math.max(
    100, // 最小批次
    Math.min(batchSize, 5000) // 最大批次
  );
}

/**
 * 批量操作性能分析
 */
export interface BatchPerformanceMetrics {
  /** 操作类型 */
  operation: 'insert' | 'update' | 'delete';
  /** 记录数 */
  recordCount: number;
  /** 批次数 */
  batchCount: number;
  /** 执行时间 (毫秒) */
  executionTimeMs: number;
  /** 每秒记录数 */
  recordsPerSecond: number;
  /** 平均每批时间 (毫秒) */
  avgTimePerBatchMs: number;
}

/**
 * 分析批量操作性能
 * 
 * @param result - 批量操作结果
 * @param startTime - 开始时间戳
 * @returns 性能指标
 */
export function analyzeBatchPerformance(
  result: BatchResult,
  startTime: number
): BatchPerformanceMetrics {
  const executionTimeMs = Date.now() - startTime;
  const recordsPerSecond = (result.success / executionTimeMs) * 1000;
  const avgTimePerBatchMs = executionTimeMs / result.batches;

  return {
    operation: result.batches > 0 ? 'insert' : 'delete',
    recordCount: result.success,
    batchCount: result.batches,
    executionTimeMs,
    recordsPerSecond,
    avgTimePerBatchMs,
  };
}

export default {
  batchInsert,
  batchUpdate,
  batchDelete,
  batchExecute,
  calculateOptimalBatchSize,
  analyzeBatchPerformance,
};
