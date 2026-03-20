/**
 * @fileoverview 数字格式化工具
 * @description 支持多语言的数字、货币、百分比格式化
 */

/**
 * 格式化数字（添加千位分隔符）
 * @param num - 要格式化的数字
 * @param locale - 语言代码 (如 'zh-CN', 'en-US')
 * @param options - 自定义格式化选项
 */
export function formatNumber(
  num: number,
  locale: string = 'zh-CN',
  options?: Intl.NumberFormatOptions
): string {
  const defaultOptions: Intl.NumberFormatOptions = {
    maximumFractionDigits: 2,
  };

  return new Intl.NumberFormat(locale, { ...defaultOptions, ...options }).format(
    num
  );
}

/**
 * 格式化货币
 * @param amount - 金额
 * @param currency - 货币代码 (如 'CNY', 'USD', 'EUR')
 * @param locale - 语言代码 (如 'zh-CN', 'en-US')
 * @param options - 自定义格式化选项
 */
export function formatCurrency(
  amount: number,
  currency: string = 'CNY',
  locale: string = 'zh-CN',
  options?: Intl.NumberFormatOptions
): string {
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };

  return new Intl.NumberFormat(locale, { ...defaultOptions, ...options }).format(
    amount
  );
}

/**
 * 格式化百分比
 * @param value - 值 (0-1 之间的数)
 * @param locale - 语言代码 (如 'zh-CN', 'en-US')
 * @param decimals - 小数位数，默认为 0
 */
export function formatPercent(
  value: number,
  locale: string = 'zh-CN',
  decimals: number = 0
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * 格式化文件大小
 * @param bytes - 字节数
 * @param locale - 语言代码 (如 'zh-CN', 'en-US')
 */
export function formatFileSize(bytes: number, locale: string = 'zh-CN'): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const threshold = 1024;

  if (bytes < threshold) {
    return formatNumber(bytes, locale) + ' ' + units[0];
  }

  let size = bytes;
  let unitIndex = 0;

  while (size >= threshold && unitIndex < units.length - 1) {
    size /= threshold;
    unitIndex++;
  }

  return formatNumber(size, locale, { maximumFractionDigits: 1 }) + ' ' + units[unitIndex];
}

/**
 * 格式化数字为简短形式（如 1K, 1M, 1B）
 * @param num - 数字
 * @param locale - 语言代码 (如 'zh-CN', 'en-US')
 */
export function formatNumberShort(num: number, locale: string = 'zh-CN'): string {
  const suffixes = ['', 'K', 'M', 'B', 'T'];
  const threshold = 1000;

  if (Math.abs(num) < threshold) {
    return formatNumber(num, locale, { maximumFractionDigits: 0 });
  }

  let absNum = Math.abs(num);
  let suffixIndex = 0;

  while (absNum >= threshold && suffixIndex < suffixes.length - 1) {
    absNum /= threshold;
    suffixIndex++;
  }

  const sign = num < 0 ? '-' : '';
  return (
    sign + formatNumber(absNum, locale, { maximumFractionDigits: 1 }) + suffixes[suffixIndex]
  );
}
