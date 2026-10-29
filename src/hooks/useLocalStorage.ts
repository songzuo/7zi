'use client'

import { useState, useCallback } from 'react'
import { logger } from '@/lib/logger'

interface UseLocalStorageOptions<T> {
  serialize?: (value: T) => string
  deserialize?: (value: string) => T
}

/**
 * 是否运行在浏览器环境
 *
 * 提取成导出函数有两个好处：
 *   1. SSR 分支的判断条件只有一处定义，不会散落
 *   2. 可被测试直接断言 —— jsdom 环境下无法真的删掉 window，
 *      但可以 mock 这个判断来验证 SSR 路径的行为
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageOptions<T> = {}
): [T, (value: T | ((prev: T) => T)) => void] {
  const { serialize = JSON.stringify, deserialize = (value: string) => JSON.parse(value) as T } =
    options

  const [storedValue, setStoredValue] = useState<T>(() => {
    if (!isBrowser()) {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? deserialize(item) : initialValue
    } catch (error) {
      logger.warn(`Error reading localStorage key "${key}"`, { error: String(error) })
      return initialValue
    }
  })

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue(currentValue => {
        const valueToStore = value instanceof Function ? value(currentValue) : value

        if (isBrowser()) {
          try {
            window.localStorage.setItem(key, serialize(valueToStore))
          } catch (error) {
            logger.warn(`Error setting localStorage key "${key}"`, { error: String(error) })
          }
        }

        return valueToStore
      })
    },
    [key, serialize]
  )

  return [storedValue, setValue]
}

// Hook for session storage
export function useSessionStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  return useLocalStorage<T>(key, initialValue, {
    serialize: JSON.stringify,
    deserialize: value => JSON.parse(value) as T,
  })
}
