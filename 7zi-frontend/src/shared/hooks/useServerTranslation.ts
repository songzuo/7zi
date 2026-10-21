/**
 * 服务端翻译 Hook (Server Components)
 * 只能在服务端组件中使用
 */

import { getT } from '@/lib/i18n/server'
import type { TFunction } from 'i18next'

interface UseServerTranslationOptions {
  /**
   * 命名空间
   */
  ns?: string | string[]

  /**
   * 语言代码（可选，默认从 cookie/header 检测）
   */
  lng?: string
}

/**
 * i18next TFunction type
 */
export type { TFunction as TranslationFunction }
