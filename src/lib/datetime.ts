/**
 * @fileoverview 统一日期时间工具
 * @module lib/datetime
 * 
 * @description
 * 提供统一的日期时间处理函数，包括：
 * - 日期解析和格式化
 * - 相对时间显示
 * - 日期比较和计算
 * - 友好的时间展示
 * 
 * @example
 * ```typescript
 * import { formatDate, formatTimeAgo, getFriendlyDateTime } from '@/lib/datetime';
 * 
 * // 格式化日期
 * formatDate('2026-03-15'); // '2026/3/15'
 * 
 * // 相对时间
 * formatTimeAgo(Date.now() - 3600000); // '1小时前'
 * 
 * // 智能显示
 * getFriendlyDateTime(new Date()); // '刚刚'
 * ```
 */

import { formatTimeAgo as utilsFormatTimeAgo } from './utils';

// ============================================
// 常量
// ============================================

/**
 * 一天的毫秒数
 */
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 一小时的毫秒数
 */
export const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * 一分钟的毫秒数
 */
export const MS_PER_MINUTE = 60 * 1000;

/**
 * 一秒的毫秒数
 */
export const MS_PER_SECOND = 1000;

// ============================================
// 类型定义
// ============================================

/**
 * 日期时间格式化选项
 */
export interface DateTimeOptions {
  /** 语言环境 (默认: 'zh-CN') */
  locale?: string;
  /** 是否显示时间 */
  showTime?: boolean;
  /** 小时格式 */
  hour?: '2-digit' | 'numeric';
  /** 分钟格式 */
  minute?: '2-digit' | 'numeric';
  /** 秒格式 */
  second?: '2-digit' | 'numeric';
  /** 年份格式 */
  year?: 'numeric' | '2-digit';
  /** 月份格式 */
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
  /** 日期格式 */
  day?: 'numeric' | '2-digit';
  /** 时区 */
  timeZone?: string;
}

/**
 * 时间差计算结果
 */
export interface DateDiff {
  /** 天数差 */
  days: number;
  /** 小时差 */
  hours: number;
  /** 分钟差 */
  minutes: number;
  /** 秒数差 */
  seconds: number;
  /** 总毫秒差 */
  totalMs: number;
  /** 总秒差 */
  totalSeconds: number;
}

// ============================================
// 解析函数
// ============================================

/**
 * 解析日期为 Date 对象
 * 
 * @description
 * 支持多种输入格式：Date 对象、ISO 字符串、时间戳。
 * 
 * @param date - 日期输入
 * @returns Date 对象
 * 
 * @example
 * ```typescript
 * parseDate(new Date());        // Date 对象
 * parseDate('2026-03-15');      // Date 对象
 * parseDate(1710489600000);     // Date 对象
 * ```
 */
export function parseDate(date: Date | string | number): Date {
  if (date instanceof Date) {
    return date;
  }
  
  if (typeof date === 'number') {
    return new Date(date);
  }
  
  // 处理 ISO 字符串和其他格式
  return new Date(date);
}

/**
 * 安全解析日期
 * 
 * @description
 * 解析日期并验证有效性。无效日期返回 null。
 * 
 * @param date - 日期输入
 * @returns Date 对象或 null
 * 
 * @example
 * ```typescript
 * safeParseDate('2026-03-15');  // Date 对象
 * safeParseDate('invalid');      // null
 * ```
 */
export function safeParseDate(date: Date | string | number): Date | null {
  try {
    const parsed = parseDate(date);
    if (isNaN(parsed.getTime())) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

// ============================================
// 格式化函数
// ============================================

/**
 * 格式化相对时间
 * 
 * @description
 * 将日期转换为"几分钟前"、"几小时前"等相对时间格式。
 * 中文本地化输出。
 * 
 * @param date - 日期输入
 * @returns 相对时间字符串
 * 
 * @example
 * ```typescript
 * formatTimeAgo(new Date());              // '刚刚'
 * formatTimeAgo(Date.now() - 30000);      // '刚刚'
 * formatTimeAgo(Date.now() - 180000);     // '3分钟前'
 * formatTimeAgo(Date.now() - 7200000);    // '2小时前'
 * formatTimeAgo(Date.now() - 172800000);  // '2天前'
 * ```
 */
export const formatTimeAgo = utilsFormatTimeAgo;

/**
 * 格式化日期 (年-月-日)
 * 
 * @description
 * 将日期格式化为本地化日期字符串。
 * 
 * @param date - 日期输入
 * @param locale - 语言环境 (默认: 'zh-CN')
 * @param options - 日期格式化选项
 * @returns 格式化后的日期字符串
 * 
 * @example
 * ```typescript
 * formatDate('2026-03-15');                      // '2026/3/15'
 * formatDate('2026-03-15', 'en-US');             // '3/15/2026'
 * formatDate('2026-03-15', 'zh-CN', { month: 'long' }); // '2026年3月15日'
 * ```
 */
export function formatDate(
  date: Date | string | number,
  locale: string = 'zh-CN',
  options?: Intl.DateTimeFormatOptions
): string {
  const d = parseDate(date);
  return d.toLocaleDateString(locale, options);
}

/**
 * 格式化日期时间
 * 
 * @description
 * 将日期格式化为包含日期和时间的字符串。
 * 
 * @param date - 日期输入
 * @param locale - 语言环境
 * @param options - 格式化选项
 * @returns 格式化后的日期时间字符串
 * 
 * @example
 * ```typescript
 * formatDateTime('2026-03-15T10:30:00');  // '2026/03/15 10:30'
 * ```
 */
export function formatDateTime(
  date: Date | string | number,
  locale: string = 'zh-CN',
  options?: DateTimeOptions
): string {
  const d = parseDate(date);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: options?.year ?? 'numeric',
    month: options?.month ?? '2-digit',
    day: options?.day ?? '2-digit',
    hour: options?.hour ?? '2-digit',
    minute: options?.minute ?? '2-digit',
    second: options?.second,
    timeZone: options?.timeZone,
  };
  return d.toLocaleString(locale, defaultOptions);
}

/**
 * 格式化时间 (仅显示时间)
 * 
 * @description
 * 将日期格式化为时间字符串。
 * 
 * @param date - 日期输入
 * @param locale - 语言环境
 * @param options - 格式化选项
 * @returns 格式化后的时间字符串
 * 
 * @example
 * ```typescript
 * formatTime('2026-03-15T10:30:00');  // '10:30'
 * formatTime('2026-03-15T10:30:45', 'zh-CN', { second: '2-digit' }); // '10:30:45'
 * ```
 */
export function formatTime(
  date: Date | string | number,
  locale: string = 'zh-CN',
  options?: Intl.DateTimeFormatOptions
): string {
  const d = parseDate(date);
  return d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: options?.second,
  });
}

/**
 * 格式化完整日期时间 (含毫秒)
 * 
 * @description
 * 用于日志和调试的完整时间格式。
 * 
 * @param date - 日期输入
 * @param locale - 语言环境
 * @returns 完整格式的日期时间字符串
 * 
 * @example
 * ```typescript
 * formatFullDateTime('2026-03-15T10:30:45.123Z');  // '2026/03/15 10:30:45.123'
 * ```
 */
export function formatFullDateTime(
  date: Date | string | number,
  locale: string = 'zh-CN'
): string {
  const d = parseDate(date);
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
}

/**
 * 格式化短日期 (月-日)
 * 
 * @description
 * 用于近期日期的简洁显示。
 * 
 * @param date - 日期输入
 * @param locale - 语言环境
 * @returns 短格式日期字符串
 * 
 * @example
 * ```typescript
 * formatShortDate('2026-03-15');  // '3月15日'
 * formatShortDate('2026-03-15', 'en-US');  // 'Mar 15'
 * ```
 */
export function formatShortDate(
  date: Date | string | number,
  locale: string = 'zh-CN'
): string {
  const d = parseDate(date);
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

/**
 * 格式化 ISO 日期字符串
 * 
 * @description
 * 将日期转换为 ISO 8601 格式字符串。
 * 
 * @param date - 日期输入
 * @returns ISO 格式字符串
 * 
 * @example
 * ```typescript
 * formatISO(new Date());  // '2026-03-15T10:30:45.123Z'
 * ```
 */
export function formatISO(date: Date | string | number): string {
  const d = parseDate(date);
  return d.toISOString();
}

// ============================================
// 比较函数
// ============================================

/**
 * 检查日期是否是今天
 * 
 * @param date - 日期输入
 * @returns 是否是今天
 * 
 * @example
 * ```typescript
 * isToday(new Date());  // true
 * isToday('2026-03-14');  // false (假设今天是 2026-03-15)
 * ```
 */
export function isToday(date: Date | string | number): boolean {
  const d = parseDate(date);
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

/**
 * 检查日期是否是昨天
 * 
 * @param date - 日期输入
 * @returns 是否是昨天
 * 
 * @example
 * ```typescript
 * isYesterday(new Date(Date.now() - 86400000));  // true
 * ```
 */
export function isYesterday(date: Date | string | number): boolean {
  const d = parseDate(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.toDateString() === yesterday.toDateString();
}

/**
 * 检查日期是否是明天
 * 
 * @param date - 日期输入
 * @returns 是否是明天
 */
export function isTomorrow(date: Date | string | number): boolean {
  const d = parseDate(date);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return d.toDateString() === tomorrow.toDateString();
}

/**
 * 检查日期是否在一周内
 * 
 * @param date - 日期输入
 * @returns 是否在一周内
 * 
 * @example
 * ```typescript
 * isThisWeek(new Date());  // true
 * isThisWeek(Date.now() - 8 * MS_PER_DAY);  // false
 * ```
 */
export function isThisWeek(date: Date | string | number): boolean {
  const d = parseDate(date);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * MS_PER_DAY);
  const weekLater = new Date(now.getTime() + 7 * MS_PER_DAY);
  return d.getTime() >= weekAgo.getTime() && d.getTime() <= weekLater.getTime();
}

/**
 * 检查日期是否是本周
 * 
 * @description
 * 检查日期是否在当前自然周内（周一到周日）。
 * 
 * @param date - 日期输入
 * @returns 是否是本周
 */
export function isCurrentWeek(date: Date | string | number): boolean {
  const d = parseDate(date);
  const now = new Date();
  
  // 获取本周一
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  monday.setHours(0, 0, 0, 0);
  
  // 获取本周日
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return d.getTime() >= monday.getTime() && d.getTime() <= sunday.getTime();
}

/**
 * 检查日期是否是同一天
 * 
 * @param date1 - 日期1
 * @param date2 - 日期2
 * @returns 是否是同一天
 */
export function isSameDay(
  date1: Date | string | number,
  date2: Date | string | number
): boolean {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  return d1.toDateString() === d2.toDateString();
}

// ============================================
// 计算函数
// ============================================

/**
 * 获取友好的日期时间显示
 * 
 * @description
 * 根据日期远近自动选择合适的格式：
 * - 今天：显示时间
 * - 昨天：显示"昨天"
 * - 一周内：显示星期
 * - 更早：显示日期
 * 
 * @param date - 日期输入
 * @param locale - 语言环境
 * @returns 友好的日期时间字符串
 * 
 * @example
 * ```typescript
 * getFriendlyDateTime(new Date());           // '10:30'
 * getFriendlyDateTime(Date.now() - 3600000); // '1小时前'
 * getFriendlyDateTime('2026-03-14');         // '昨天'
 * getFriendlyDateTime('2026-03-01');         // '3月1日'
 * ```
 */
export function getFriendlyDateTime(
  date: Date | string | number,
  locale: string = 'zh-CN'
): string {
  const d = parseDate(date);
  
  if (isToday(d)) {
    // 今天显示时间
    return formatTime(d, locale);
  }
  
  if (isYesterday(d)) {
    // 昨天显示"昨天"
    return locale === 'zh-CN' ? '昨天' : 'Yesterday';
  }
  
  if (isCurrentWeek(d)) {
    // 本周内显示星期
    return d.toLocaleDateString(locale, { weekday: 'short' });
  }
  
  // 更早的日期显示短日期
  return formatShortDate(d, locale);
}

/**
 * 计算两个日期之间的时间差
 * 
 * @description
 * 计算两个日期之间的差异，返回天、时、分、秒等单位。
 * 
 * @param date1 - 日期1
 * @param date2 - 日期2 (默认当前时间)
 * @returns 时间差对象
 * 
 * @example
 * ```typescript
 * const diff = getDateDiff('2026-03-15', '2026-03-10');
 * // { days: 5, hours: 0, minutes: 0, seconds: 0, totalMs: 432000000, totalSeconds: 432000 }
 * ```
 */
export function getDateDiff(
  date1: Date | string | number,
  date2: Date | string | number = new Date()
): DateDiff {
  const d1 = parseDate(date1).getTime();
  const d2 = parseDate(date2).getTime();
  const totalMs = Math.abs(d2 - d1);
  const totalSeconds = Math.floor(totalMs / MS_PER_SECOND);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const days = Math.floor(totalSeconds / 86400);

  return { days, hours, minutes, seconds, totalMs, totalSeconds };
}

/**
 * 添加天数
 * 
 * @param date - 日期输入
 * @param days - 天数
 * @returns 新日期
 * 
 * @example
 * ```typescript
 * addDays(new Date(), 7);  // 7 天后的日期
 * addDays('2026-03-15', -1);  // 2026-03-14
 * ```
 */
export function addDays(date: Date | string | number, days: number): Date {
  const d = parseDate(date);
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * 添加小时
 * 
 * @param date - 日期输入
 * @param hours - 小时数
 * @returns 新日期
 */
export function addHours(date: Date | string | number, hours: number): Date {
  const d = parseDate(date);
  return new Date(d.getTime() + hours * MS_PER_HOUR);
}

// ============================================
// 工具函数
// ============================================

/**
 * 获取当前时间戳 (ISO 格式)
 * 
 * @returns ISO 格式时间戳
 * 
 * @example
 * ```typescript
 * now();  // '2026-03-15T10:30:45.123Z'
 * ```
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * 获取当前时间戳 (毫秒)
 * 
 * @returns 毫秒时间戳
 * 
 * @example
 * ```typescript
 * nowMs();  // 1710489600000
 * ```
 */
export function nowMs(): number {
  return Date.now();
}

/**
 * 创建日期并验证
 * 
 * @description
 * 创建指定年月日的日期，并验证有效性。
 * 无效日期返回 null。
 * 
 * @param year - 年
 * @param month - 月 (0-11)
 * @param day - 日
 * @returns Date 对象或 null
 * 
 * @example
 * ```typescript
 * createDate(2026, 2, 15);  // 2026-03-15
 * createDate(2026, 1, 30);  // null (2月没有30日)
 * ```
 */
export function createDate(year: number, month: number, day: number): Date | null {
  const date = new Date(year, month, day);
  
  // 验证日期有效性
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  
  return date;
}

/**
 * 获取一天的开始时间
 * 
 * @param date - 日期输入
 * @returns 当天 00:00:00
 */
export function startOfDay(date: Date | string | number): Date {
  const d = parseDate(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/**
 * 获取一天的结束时间
 * 
 * @param date - 日期输入
 * @returns 当天 23:59:59.999
 */
export function endOfDay(date: Date | string | number): Date {
  const d = parseDate(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

// ============================================
// 默认导出
// ============================================

export default {
  // 常量
  MS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  MS_PER_SECOND,
  
  // 解析
  parseDate,
  safeParseDate,
  
  // 格式化
  formatTimeAgo,
  formatDate,
  formatDateTime,
  formatTime,
  formatFullDateTime,
  formatShortDate,
  formatISO,
  
  // 比较
  isToday,
  isYesterday,
  isTomorrow,
  isThisWeek,
  isCurrentWeek,
  isSameDay,
  
  // 计算
  getFriendlyDateTime,
  getDateDiff,
  addDays,
  addHours,
  
  // 工具
  now,
  nowMs,
  createDate,
  startOfDay,
  endOfDay,
};