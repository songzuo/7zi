/**
 * 客户端 i18n 初始化
 * 优化：使用动态导入翻译资源，减少主 bundle 大小
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import { i18nConfig } from './config'

// 动态加载翻译资源的函数
const getTranslations = async (language: string) => {
  // 默认语言使用静态导入以提高首屏性能
  if (language === 'zh') {
    const [
      { default: common },
      { default: auth },
      { default: navigation },
      { default: errors },
      { default: dashboard },
      { default: rooms },
    ] = await Promise.all([
      import('@/locales/zh/common.json'),
      import('@/locales/zh/auth.json'),
      import('@/locales/zh/navigation.json'),
      import('@/locales/zh/errors.json'),
      import('@/locales/zh/dashboard.json'),
      import('@/locales/zh/rooms.json'),
    ])
    return {
      common,
      auth,
      navigation,
      errors,
      dashboard,
      rooms,
    }
  }

  // 其他语言动态导入
  const [
    { default: common },
    { default: auth },
    { default: navigation },
    { default: errors },
    { default: dashboard },
    { default: rooms },
  ] = await Promise.all([
    import(`@/locales/${language}/common.json`),
    import(`@/locales/${language}/auth.json`),
    import(`@/locales/${language}/navigation.json`),
    import(`@/locales/${language}/errors.json`),
    import(`@/locales/${language}/dashboard.json`),
    import(`@/locales/${language}/rooms.json`),
  ])

  return {
    common,
    auth,
    navigation,
    errors,
    dashboard,
    rooms,
  }
}

// 翻译资源（初始只加载默认语言）
const resources = {
  zh: null, // 延迟加载
  en: null, // 延迟加载
}

// 初始化 i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    ...i18nConfig,
    resources,
    // 延迟加载资源
    partialBundledLanguages: true,
    // 自定义资源加载器
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
  })

// 初始化后加载默认语言
getTranslations('zh').then((zh) => {
  i18n.addResourceBundle('zh', 'translation', zh, true)
})

// 导出初始化函数供需要时调用
export const initLanguage = async (language: string) => {
  if (resources[language as keyof typeof resources] === null) {
    const translations = await getTranslations(language)
    i18n.addResourceBundle(language, 'translation', translations, true)
  }
}

export default i18n
