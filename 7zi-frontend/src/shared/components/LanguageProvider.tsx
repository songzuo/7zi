'use client'

/**
 * i18n 提供者组件
 * 包裹在根布局中，确保所有组件都可以访问翻译
 */

import { useEffect, useState } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/lib/i18n/client'
import { defaultLanguage } from '@/lib/i18n/config'

interface LanguageProviderProps {
  children: React.ReactNode
  /**
   * 初始语言（SSR）
   */
  initialLanguage?: string
}

export function LanguageProvider({ children, initialLanguage }: LanguageProviderProps) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // 如果有初始语言，设置它
    if (initialLanguage && i18n.language !== initialLanguage) {
      i18n.changeLanguage(initialLanguage)
    }

    // 确保 i18n 已初始化
    if (i18n.isInitialized) {
      setIsReady(true)
    } else {
      i18n.on('initialized', () => {
        setIsReady(true)
      })
    }

    // 更新 HTML lang 属性
    const html = document.documentElement
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'lang') {
          const newLang = html.getAttribute('lang')
          if (newLang && newLang !== i18n.language) {
            i18n.changeLanguage(newLang)
          }
        }
      })
    })

    observer.observe(html, { attributes: true })

    return () => {
      observer.disconnect()
    }
  }, [initialLanguage])

  // 避免水合错误，等待客户端初始化
  if (!isReady) {
    return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}

export default LanguageProvider
