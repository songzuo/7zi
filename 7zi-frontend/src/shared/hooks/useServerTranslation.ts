/**
 * 服务端翻译 Hook (Server Components)
 * 只能在服务端组件中使用
 */

import { getT } from '@/lib/i18n/server';
import type { TranslationFunction, i18n as I18nInstance } from 'i18next';

interface UseServerTranslationOptions {
  /**
   * 命名空间
   */
  ns?: string | string[];
  
  /**
   * 语言代码（可选，默认从 cookie/header 检测）
   */
  lng?: string;
}

/**
 * i18next TranslationFunction with i18n instance
 */
interface TranslationFunctionWithI18n extends TranslationFunction {
  i18n?: I18nInstance;
}

/**
 * 获取服务端翻译函数
 * @param options 配置选项
 * @returns 翻译函数和当前语言
 */
export async function useServerTranslation(options: UseServerTranslationOptions = {}) {
  const t = await getT(options.lng, Array.isArray(options.ns) ? options.ns[0] : options.ns) as TranslationFunctionWithI18n;
  
  // 获取当前语言（如果未提供，从翻译函数推断）
  const currentLng = options.lng || t.i18n?.language || 'zh';
  
  return {
    t,
    lng: currentLng,
  };
}

export type { TranslationFunction };
