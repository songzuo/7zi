import { getTranslations } from 'next-intl/server';
import { Locale } from './config';

// 服务端获取翻译的辅助函数
export async function getServerTranslations(locale: Locale, namespace?: string) {
  return await getTranslations({ locale, namespace });
}

// 格式化日期
export function formatDate(locale: Locale, date: Date | string, options?: Intl.DateTimeFormatOptions) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  }).format(d);
}

// 格式化数字
export function formatNumber(locale: Locale, number: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale, options).format(number);
}
