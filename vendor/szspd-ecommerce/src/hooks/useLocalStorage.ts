'use client'

import { useState, useCallback } from 'react'
import { logger } from '@/lib/logger'

interface UseLocalStorageOptions<T> {
  serialize?: (value: T) => string
  deserialize?: (value: string) => T
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageOptions<T> = {}
): [T, (value: T | ((prev: T) => T)) => void] {
  const { serialize = JSON.stringify, deserialize = (value: string) => JSON.parse(value) as T } =
    options

  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
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

        if (typeof window !== 'undefined') {
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
