/**
 * @fileoverview 时间格式化工具
 * @description 统一的时间处理函数，避免在多个组件中重复定义
 * 
 * @deprecated 请使用 @/lib/utils 中的 formatTimeAgo
 */
import { formatTimeAgo as utilsFormatTimeAgo } from './utils';

/**
 * 格式化相对时间（几分钟前、几小时前等）
 * @deprecated 使用 utils.formatTimeAgo 代替
 */
export const formatTimeAgo = utilsFormatTimeAgo;

/**
 * 格式化日期为标准格式
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', options);
}

/**
 * 格式化日期时间
 */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 检查日期是否是今天
 */
export function isToday(date: Date | string): boolean {
  const d = new Date(date);
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

/**
 * 检查日期是否是昨天
 */
export function isYesterday(date: Date | string): boolean {
  const d = new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.toDateString() === yesterday.toDateString();
}