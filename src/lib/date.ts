/**
 * @fileoverview 时间格式化工具（已废弃）
 * @deprecated 请使用 @/lib/datetime 或 @/lib/utils 中的日期时间函数
 * 
 * @description
 * 此文件已废弃，所有功能已迁移到：
 * - @/lib/datetime - 统一的日期时间处理
 * - @/lib/utils - 包含 formatTimeAgo 等工具函数
 * 
 * @example
 * ```typescript
 * // 旧用法（已废弃）
 * import { formatTimeAgo } from '@/lib/date';
 * 
 * // 新用法（推荐）
 * import { formatTimeAgo, formatDate, isToday } from '@/lib/datetime';
 * // 或
 * import { formatTimeAgo } from '@/lib/utils';
 * ```
 */

import {
  formatTimeAgo as datetimeFormatTimeAgo,
  formatDate as datetimeFormatDate,
  formatDateTime as datetimeFormatDateTime,
  isToday as datetimeIsToday,
  isYesterday as datetimeIsYesterday,
} from './datetime';

/**
 * 格式化相对时间（几分钟前、几小时前等）
 * @deprecated 使用 @/lib/datetime 中的 formatTimeAgo 代替
 */
export const formatTimeAgo = datetimeFormatTimeAgo;

/**
 * 格式化日期为标准格式
 * @deprecated 使用 @/lib/datetime 中的 formatDate 代替
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  return datetimeFormatDate(date, 'zh-CN', options);
}

/**
 * 格式化日期时间
 * @deprecated 使用 @/lib/datetime 中的 formatDateTime 代替
 */
export function formatDateTime(date: Date | string): string {
  return datetimeFormatDateTime(date);
}

/**
 * 检查日期是否是今天
 * @deprecated 使用 @/lib/datetime 中的 isToday 代替
 */
export function isToday(date: Date | string): boolean {
  return datetimeIsToday(date);
}

/**
 * 检查日期是否是昨天
 * @deprecated 使用 @/lib/datetime 中的 isYesterday 代替
 */
export function isYesterday(date: Date | string): boolean {
  return datetimeIsYesterday(date);
}

/**
 * @deprecated 此模块已废弃，请迁移到 @/lib/datetime
 */
export default {
  formatTimeAgo,
  formatDate,
  formatDateTime,
  isToday,
  isYesterday,
};