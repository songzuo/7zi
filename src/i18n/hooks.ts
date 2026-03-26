/**
 * i18n Hooks and Utilities
 *
 * 集中管理 i18n 相关的 hooks 和工具函数
 */

'use client';

import { useTranslations as useNextIntlTranslations, useLocale as useNextIntlLocale } from 'next-intl';
import type { Locale } from './config';

// ============================================================================
// 基础 Hooks
// ============================================================================

/**
 * 使用翻译的 hook
 *
 * @example
 * ```tsx
 * const t = useTranslations('home');
 * return <h1>{t('hero.title')}</h1>;
 * ```
 *
 * @example
 * ```tsx
 * // 使用默认命名空间
 * const t = useTranslations();
 * return <p>{t('common.siteName')}</p>;
 * ```
 *
 * @param namespace - 翻译命名空间（可选）
 * @returns 翻译函数
 */
export function useTranslations(namespace?: string) {
  return useNextIntlTranslations(namespace);
}

/**
 * 获取当前语言的 hook
 *
 * @example
 * ```tsx
 * const locale = useLocale();
 * console.log(locale); // 'zh', 'en', etc.
 * ```
 *
 * @returns 当前语言代码
 */
export function useLocale(): Locale {
  return useNextIntlLocale() as Locale;
}

// ============================================================================
// 高级 Hooks
// ============================================================================

/**
 * 带命名的翻译 hook
 *
 * 为常用的命名空间提供预定义的 hook
 *
 * @example
 * ```tsx
 * const t = useCommonTranslations();
 * return <span>{t('siteName')}</span>;
 * ```
 */
export function useCommonTranslations() {
  return useTranslations('common');
}

/**
 * 导航翻译 hook
 */
export function useNavTranslations() {
  return useTranslations('nav');
}

/**
 * 首页翻译 hook
 */
export function useHomeTranslations() {
  return useTranslations('home');
}

/**
 * 关于我们翻译 hook
 */
export function useAboutTranslations() {
  return useTranslations('about');
}

/**
 * 团队翻译 hook
 */
export function useTeamTranslations() {
  return useTranslations('team');
}

/**
 * 作品案例翻译 hook
 */
export function usePortfolioTranslations() {
  return useTranslations('portfolio');
}

/**
 * 联系我们翻译 hook
 */
export function useContactTranslations() {
  return useTranslations('contact');
}

/**
 * 控制台翻译 hook
 */
export function useDashboardTranslations() {
  return useTranslations('dashboard');
}

/**
 * 页脚翻译 hook
 */
export function useFooterTranslations() {
  return useTranslations('footer');
}

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 翻译函数类型
 */
export type TranslateFunction = ReturnType<typeof useTranslations>;

/**
 * 带参数的翻译函数类型
 */
export type TranslateWithParams = (
  key: string,
  params?: Record<string, string | number>
) => string;

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取语言名称
 *
 * @example
 * ```tsx
 * const locale = useLocale();
 * const languageName = getLocaleName(locale); // '中文', 'English', etc.
 * ```
 */
export function getLocaleName(locale: Locale): string {
  const localeNames: Record<Locale, string> = {
    zh: '中文',
    en: 'English',
    ja: '日本語',
    ko: '한국어',
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
  };
  return localeNames[locale] || locale;
}

/**
 * 获取语言标签（用于 HTML lang 属性）
 *
 * @example
 * ```tsx
 * const locale = useLocale();
 * const langTag = getLocaleTag(locale); // 'zh-CN', 'en-US', etc.
 * ```
 */
export function getLocaleTag(locale: Locale): string {
  const localeTags: Record<Locale, string> = {
    zh: 'zh-CN',
    en: 'en-US',
    ja: 'ja-JP',
    ko: 'ko-KR',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
  };
  return localeTags[locale] || locale;
}

/**
 * 检查是否为 RTL 语言
 *
 * @example
 * ```tsx
 * const locale = useLocale();
 * const isRTL = isRTL(locale); // false for all current locales
 * ```
 */
export function isRTL(locale: Locale): boolean {
  const rtlLocales: Locale[] = [];
  return rtlLocales.includes(locale);
}

/**
 * 获取语言对应的文本方向
 *
 * @example
 * ```tsx
 * const locale = useLocale();
 * const dir = getTextDirection(locale); // 'ltr'
 * ```
 */
export function getTextDirection(locale: Locale): 'ltr' | 'rtl' {
  return isRTL(locale) ? 'rtl' : 'ltr';
}

/**
 * 格式化日期为本地化格式
 *
 * @example
 * ```tsx
 * const date = new Date();
 * const formatted = formatDate(date, 'zh'); // '2024年3月26日'
 * ```
 */
export function formatDate(date: Date, locale: Locale): string {
  return date.toLocaleDateString(getLocaleTag(locale), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * 格式化数字为本地化格式
 *
 * @example
 * ```tsx
 * const formatted = formatNumber(1234.56, 'en'); // '1,234.56'
 * ```
 */
export function formatNumber(number: number, locale: Locale): string {
  return number.toLocaleString(getLocaleTag(locale));
}

/**
 * 格式化货币为本地化格式
 *
 * @example
 * ```tsx
 * const formatted = formatCurrency(1234.56, 'en', 'USD'); // '$1,234.56'
 * ```
 */
export function formatCurrency(amount: number, locale: Locale, currency: string): string {
  return amount.toLocaleString(getLocaleTag(locale), {
    style: 'currency',
    currency,
  });
}

// ============================================================================
// 服务端工具（需要从 'next-intl/server' 导入）
// ============================================================================

/**
 * 服务端获取翻译
 *
 * @example
 * ```tsx
 * // 在服务器组件中使用
 * import { getTranslations as getTranslationsServer } from 'next-intl/server';
 *
 * export default async function Page({ params }) {
 *   const t = await getTranslationsServer('home');
 *   return <h1>{t('hero.title')}</h1>;
 * }
 * ```
 */

/**
 * 服务端获取消息
 *
 * @example
 * ```tsx
 * import { getMessages } from 'next-intl/server';
 *
 * export async function generateMetadata({ params }) {
 *   const messages = await getMessages();
 *   return {
 *     title: messages.home.meta.title,
 *   };
 * }
 * ```
 */
