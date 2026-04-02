/**
 * i18n 模块入口
 */

export { defaultLanguage, supportedLanguages, languageNames } from './config'
export type { SupportedLanguage } from './config'
export { normalizeLanguage, isSupportedLanguage, getLanguageDirection } from './config'
export { default as i18n } from './client'
export { createServerI18n, getT } from './server'
