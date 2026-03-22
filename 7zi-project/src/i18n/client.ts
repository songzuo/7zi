'use client';

import { useTranslations as useNextIntlTranslations } from 'next-intl';

// 包装 useTranslations 以提供类型安全
export function useTranslations(namespace?: string) {
  return useNextIntlTranslations(namespace);
}

// 获取当前 locale
export { useLocale } from 'next-intl';
