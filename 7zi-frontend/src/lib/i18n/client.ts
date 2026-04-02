/**
 * 客户端 i18n 初始化
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// 导入翻译资源
import zhCommon from '@/locales/zh/common.json'
import zhAuth from '@/locales/zh/auth.json'
import zhNavigation from '@/locales/zh/navigation.json'
import zhErrors from '@/locales/zh/errors.json'
import zhDashboard from '@/locales/zh/dashboard.json'
import zhRooms from '@/locales/zh/rooms.json'

import enCommon from '@/locales/en/common.json'
import enAuth from '@/locales/en/auth.json'
import enNavigation from '@/locales/en/navigation.json'
import enErrors from '@/locales/en/errors.json'
import enDashboard from '@/locales/en/dashboard.json'
import enRooms from '@/locales/en/rooms.json'

import { i18nConfig } from './config'

// 翻译资源
const resources = {
  zh: {
    common: zhCommon,
    auth: zhAuth,
    navigation: zhNavigation,
    errors: zhErrors,
    dashboard: zhDashboard,
    rooms: zhRooms,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    navigation: enNavigation,
    errors: enErrors,
    dashboard: enDashboard,
    rooms: enRooms,
  },
}

// 初始化 i18next
i18n
  .use(LanguageDetector) // 语言检测
  .use(initReactI18next) // React 绑定
  .init({
    ...i18nConfig,
    resources,
  })

export default i18n
