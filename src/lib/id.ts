/**
 * @fileoverview 统一 ID 生成工具
 * @module lib/id
 * 
 * @description
 * 提供统一的 ID 生成函数，避免在多处重复相同的生成逻辑。
 * 支持多种 ID 前缀类型。
 */

/**
 * ID 前缀类型
 */
export type IdPrefix = 
  | 'req'    // 请求 ID
  | 'task'   // 任务 ID
  | 'node'   // 知识节点 ID
  | 'edge'   // 知识边 ID
  | 'act'    // 活动 ID
  | 'log'    // 日志 ID
  | 'gene'   // Gene ID (Evomap)
  | 'dream'  // Dream ID
  | 'comment' // 评论 ID
  | 'notif'  // 通知 ID
  | 'proj'   // 项目 ID
  | 'user';  // 用户 ID

/**
 * 默认随机字符串长度
 */
const DEFAULT_RANDOM_LENGTH = 9;

/**
 * 生成随机字符串
 * @param length - 随机字符串长度
 */
function generateRandomString(length: number = DEFAULT_RANDOM_LENGTH): string {
  // 使用多次 Math.random 拼接以支持更长长度
  let result = '';
  while (result.length < length) {
    result += Math.random().toString(36).substring(2);
  }
  return result.substring(0, length);
}

/**
 * 生成统一格式的 ID
 * 
 * @description
 * 格式: `{prefix}_{timestamp}_{random}`
 * 例如: task_169999999999_abc123def
 * 
 * @param prefix - ID 前缀
 * @param randomLength - 随机字符串长度 (默认 9)
 * @returns 格式化的 ID 字符串
 * 
 * @example
 * ```typescript
 * generateId('task');     // 'task_169999999999_abc123def'
 * generateId('node', 6);  // 'node-169999999999-abc123'
 * ```
 */
export function generateId(prefix: IdPrefix, randomLength: number = DEFAULT_RANDOM_LENGTH): string {
  return `${prefix}_${Date.now()}_${generateRandomString(randomLength)}`;
}

/**
 * 生成带连字符的 ID (适合 URL 友好)
 * 
 * @param prefix - ID 前缀
 * @param randomLength - 随机字符串长度
 */
export function generateSlugId(prefix: string, randomLength: number = DEFAULT_RANDOM_LENGTH): string {
  return `${prefix}-${Date.now()}-${generateRandomString(randomLength)}`;
}

/**
 * 生成短 ID (时间戳 + 4 位随机)
 * 适合需要较短 ID 的场景
 * 
 * @param prefix - ID 前缀
 */
export function generateShortId(prefix: IdPrefix): string {
  return `${prefix}_${Date.now()}_${generateRandomString(4)}`;
}

/**
 * 生成请求 ID
 */
export function generateRequestId(): string {
  return generateId('req');
}

/**
 * 生成任务 ID
 */
export function generateTaskId(): string {
  return generateId('task');
}

/**
 * 生成知识节点 ID
 */
export function generateNodeId(): string {
  return generateSlugId('node');
}

/**
 * 生成知识边 ID
 */
export function generateEdgeId(): string {
  return generateSlugId('edge');
}

/**
 * 生成活动 ID
 */
export function generateActivityId(): string {
  return generateId('act');
}

/**
 * 生成评论 ID
 */
export function generateCommentId(): string {
  return generateId('comment');
}

/**
 * 生成通知 ID
 */
export function generateNotificationId(): string {
  return generateId('notif');
}

/**
 * 生成日志 ID
 */
export function generateLogId(): string {
  return generateId('log');
}

// ============================================
// 便捷导出
// ============================================

export default {
  generateId,
  generateSlugId,
  generateShortId,
  generateRequestId,
  generateTaskId,
  generateNodeId,
  generateEdgeId,
  generateActivityId,
  generateCommentId,
  generateNotificationId,
  generateLogId,
};
