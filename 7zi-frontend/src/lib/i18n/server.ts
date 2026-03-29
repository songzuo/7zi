/**
 * 服务端 i18n 初始化
 * SSR 兼容
 */

import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { InitOptions } from 'i18next';

// 导入翻译资源
import zhCommon from '@/locales/zh/common.json';
import zhAuth from '@/locales/zh/auth.json';
import zhNavigation from '@/locales/zh/navigation.json';
import zhErrors from '@/locales/zh/errors.json';
import zhDashboard from '@/locales/zh/dashboard.json';
import zhRooms from '@/locales/zh/rooms.json';

import enCommon from '@/locales/en/common.json';
import enAuth from '@/locales/en/auth.json';
import enNavigation from '@/locales/en/navigation.json';
import enErrors from '@/locales/en/errors.json';
import enDashboard from '@/locales/en/dashboard.json';
import enRooms from '@/locales/en/rooms.json';

import { defaultLanguage, supportedLanguages } from './config';

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
};

/**
 * 创建服务端 i18n 实例
 * @param lng 语言代码
 * @param ns 命名空间
 */
export async function createServerI18n(lng: string = defaultLanguage, ns: string | string[] = 'common') {
  const i18nInstance = createInstance();
  
  const config: InitOptions = {
    lng: lng.startsWith('zh') ? 'zh' : lng.startsWith('en') ? 'en' : defaultLanguage,
    supportedLngs: [...supportedLanguages],
    fallbackLng: defaultLanguage,
    ns: Array.isArray(ns) ? ns : [ns],
    defaultNS: Array.isArray(ns) ? ns[0] : ns,
    resources,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  };
  
  await i18nInstance.use(initReactI18next).init(config);
  
  return i18nInstance;
}

/**
 * 获取翻译函数
 * @param lng 语言代码
 * @param ns 命名空间
 */
export async function getT(lng?: string, ns: string = 'common') {
  const i18nInstance = await createServerI18n(lng, ns);
  return i18nInstance.getFixedT(lng ?? 'en', ns);
}
