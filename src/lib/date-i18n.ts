/**
 * @fileoverview 国际化日期格式化工具
 * @description 支持多语言的时间处理函数，配合 next-intl 使用
 */

/**
 * 格式化相对时间（几分钟前、几小时前等）- 多语言支持
 * @param date - 日期字符串或 Date 对象
 * @param t - next-intl 的翻译函数
 * @param now - 可选的基准时间，用于测试
 * @returns 格式化后的相对时间字符串
 */
export function formatTimeAgo(
  date: Date | string,
  t: (key: string, params?: { count: number }) => string,
  now?: Date
): string {
  const nowDate = now || new Date();
  const then = new Date(date);
  const diffMs = nowDate.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMins < 1) {
    return t('time.justNow');
  }
  if (diffMins < 60) {
    return t('time.minutesAgo', { count: diffMins });
  }
  if (diffHours < 24) {
    return t('time.hoursAgo', { count: diffHours });
  }
  if (diffDays < 7) {
    return t('time.daysAgo', { count: diffDays });
  }
  if (diffWeeks < 4) {
    return t('time.weeksAgo', { count: diffWeeks });
  }
  if (diffMonths < 12) {
    return t('time.monthsAgo', { count: diffMonths });
  }
  return t('time.yearsAgo', { count: diffYears });
}

/**
 * 格式化日期为标准格式（使用 Intl API）
 * @param date - 日期字符串或 Date 对象
 * @param locale - 语言代码 (如 'zh-CN', 'en-US')
 * @param options - 自定义格式化选项
 */
export function formatDate(
  date: Date | string,
  locale: string = 'zh-CN',
  options?: Intl.DateTimeFormatOptions
): string {
  const d = new Date(date);

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  return d.toLocaleDateString(locale, { ...defaultOptions, ...options });
}

/**
 * 格式化日期时间（使用 Intl API）
 * @param date - 日期字符串或 Date 对象
 * @param locale - 语言代码 (如 'zh-CN', 'en-US')
 * @param options - 自定义格式化选项
 */
export function formatDateTime(
  date: Date | string,
  locale: string = 'zh-CN',
  options?: Intl.DateTimeFormatOptions
): string {
  const d = new Date(date);

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  };

  return d.toLocaleString(locale, { ...defaultOptions, ...options });
}

/**
 * 格式化时间（不包含日期）
 * @param date - 日期字符串或 Date 对象
 * @param locale - 语言代码 (如 'zh-CN', 'en-US')
 * @param options - 自定义格式化选项
 */
export function formatTime(
  date: Date | string,
  locale: string = 'zh-CN',
  options?: Intl.DateTimeFormatOptions
): string {
  const d = new Date(date);

  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };

  return d.toLocaleTimeString(locale, { ...defaultOptions, ...options });
}

/**
 * 检查日期是否是今天
 * @param date - 日期字符串或 Date 对象
 */
export function isToday(date: Date | string): boolean {
  const d = new Date(date);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

/**
 * 检查日期是否是昨天
 * @param date - 日期字符串或 Date 对象
 */
export function isYesterday(date: Date | string): boolean {
  const d = new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  );
}

/**
 * 获取今天的日期（用于缓存和测试）
 * @param daysOffset 天数偏移（0=今天，1=昨天）
 */
function getCachedDate(daysOffset: number): Date {
  const nowMs = Date.now();
  const now = new Date(nowMs);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(today);
  targetDate.setDate(targetDate.getDate() - daysOffset);
  return targetDate;
}
