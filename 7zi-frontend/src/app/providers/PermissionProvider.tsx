'use client'

/**
 * Permission Provider - 提供权限管理功能
 */

import {
  PermissionProvider as BasePermissionProvider,
  createUserFromPayload,
} from '@/contexts/PermissionContext'
import { useEffect, useState } from 'react'

interface PermissionProviderProps {
  children: React.ReactNode
}

/**
 * Permission Provider
 *
 * 从 Cookie 或其他存储中获取用户信息并初始化权限
 */
export function PermissionProvider({ children }: PermissionProviderProps) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // 初始化时可以检查本地存储中的用户信息
    // 目前先设置为就绪状态
    setIsReady(true)
  }, [])

  if (!isReady) {
    return <>{children}</>
  }

  return <BasePermissionProvider>{children}</BasePermissionProvider>
}
