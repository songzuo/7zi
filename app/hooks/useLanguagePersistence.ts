'use client';

import { useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { locales, type Locale } from '../i18n/config';

const LANGUAGE_STORAGE_KEY = 'preferred-language';

/**
 * 语言持久化 Hook
 * 
 * 功能：
 * 1. 首次访问时检查 localStorage 中保存的语言偏好
 * 2. 如果偏好语言与当前 URL 语言不一致，自动重定向
 * 3. 提供保存语言偏好的方法
 */
export function useLanguagePersistence() {
  const router = useRouter();
  const pathname = usePathname();

  // 从路径中检测当前语言
  const getCurrentLocale = useCallback((): Locale => {
    const pathLocale = pathname?.split('/')[1];
    if (pathLocale === 'en') return 'en';
    return 'zh';
  }, [pathname]);

  // 从 localStorage 读取保存的语言偏好
  const getSavedLocale = useCallback((): Locale | null => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved && locales.includes(saved as Locale)) {
        return saved as Locale;
      }
    } catch {
      // localStorage 不可用时静默失败
    }
    return null;
  }, []);

  // 保存语言偏好
  const saveLocale = useCallback((locale: Locale) => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
    } catch {
      // localStorage 不可用时静默失败
    }
  }, []);

  // 首次访问时检查并重定向
  useEffect(() => {
    // 只在客户端执行
    if (typeof window === 'undefined') return;

    const currentLocale = getCurrentLocale();
    const savedLocale = getSavedLocale();

    // 如果有保存的语言偏好且与当前不同，重定向
    if (savedLocale && savedLocale !== currentLocale) {
      let newPath = pathname || '/';
      
      if (currentLocale === 'zh' && savedLocale === 'en') {
        // 重定向到英文版
        newPath = `/en${newPath}`;
      } else if (currentLocale === 'en' && savedLocale === 'zh') {
        // 重定向到中文版
        newPath = newPath.replace(/^\/en/, '') || '/';
      }
      
      // 使用 replace 避免在历史记录中留下多余条目
      router.replace(newPath);
    }
  }, [pathname, getCurrentLocale, getSavedLocale, router]);

  return {
    saveLocale,
    getSavedLocale,
    getCurrentLocale,
  };
}

/**
 * 获取保存的语言偏好（非 Hook 版本，用于组件外）
 */
export function getSavedLanguagePreference(): Locale | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && locales.includes(saved as Locale)) {
      return saved as Locale;
    }
  } catch {
    // localStorage 不可用时静默失败
  }
  return null;
}

/**
 * 保存语言偏好（非 Hook 版本，用于组件外）
 */
export function saveLanguagePreference(locale: Locale): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
  } catch {
    // localStorage 不可用时静默失败
  }
}