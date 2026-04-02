'use client'

/**
 * i18n Provider - 提供 i18next 实例给客户端组件
 * 解决 "NO_I18NEXT_INSTANCE" 警告
 */

import { I18nextProvider } from 'react-i18next'
import { useEffect, useState } from 'react'
import i18n from '@/lib/i18n/client'

interface I18nProviderProps {
  children: React.ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // 确保 i18n 已初始化
    if (i18n.isInitialized) {
      setIsReady(true)
    } else {
      i18n.on('initialized', () => {
        setIsReady(true)
      })
    }
  }, [])

  // 避免水合错误，等待客户端初始化
  if (!isReady) {
    return null
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
