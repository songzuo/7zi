/**
 * 本地存储 Hook
 * @module hooks/useLocalStorage
 * @description 提供类型安全的本地存储操作
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * 本地存储 Hook 返回值
 */
interface UseLocalStorageReturn<T> {
  /** 存储的值 */
  value: T;
  /** 设置值 */
  setValue: (value: T | ((prev: T) => T)) => void;
  /** 删除值 */
  removeValue: () => void;
  /** 是否已加载 */
  loaded: boolean;
  /** 错误信息 */
  error: Error | null;
}

/**
 * 本地存储 Hook
 * @param key 存储键名
 * @param initialValue 初始值
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): UseLocalStorageReturn<T> {
  const [value, setValue] = useState<T>(initialValue);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 从 localStorage 加载初始值
  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoaded(true);
      return;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        setValue(parsed);
      }
      setError(null);
    } catch (err) {
      console.error(`Error reading localStorage key "${key}":`, err);
      setError(err instanceof Error ? err : new Error('Failed to read localStorage'));
    } finally {
      setLoaded(true);
    }
  }, [key]);

  // 设置值
  const setStoredValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      try {
        const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
        setValue(valueToStore);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
        setError(null);
      } catch (err) {
        console.error(`Error setting localStorage key "${key}":`, err);
        setError(err instanceof Error ? err : new Error('Failed to set localStorage'));
      }
    },
    [key, value]
  );

  // 删除值
  const removeValue = useCallback(() => {
    try {
      setValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
      setError(null);
    } catch (err) {
      console.error(`Error removing localStorage key "${key}":`, err);
      setError(err instanceof Error ? err : new Error('Failed to remove localStorage'));
    }
  }, [key, initialValue]);

  return { value, setValue: setStoredValue, removeValue, loaded, error };
}

/**
 * Session 存储 Hook
 * @param key 存储键名
 * @param initialValue 初始值
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T
): UseLocalStorageReturn<T> {
  const [value, setValue] = useState<T>(initialValue);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 从 sessionStorage 加载初始值
  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoaded(true);
      return;
    }

    try {
      const item = window.sessionStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        setValue(parsed);
      }
      setError(null);
    } catch (err) {
      console.error(`Error reading sessionStorage key "${key}":`, err);
      setError(err instanceof Error ? err : new Error('Failed to read sessionStorage'));
    } finally {
      setLoaded(true);
    }
  }, [key]);

  // 设置值
  const setStoredValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      try {
        const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
        setValue(valueToStore);

        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
        }
        setError(null);
      } catch (err) {
        console.error(`Error setting sessionStorage key "${key}":`, err);
        setError(err instanceof Error ? err : new Error('Failed to set sessionStorage'));
      }
    },
    [key, value]
  );

  // 删除值
  const removeValue = useCallback(() => {
    try {
      setValue(initialValue);
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(key);
      }
      setError(null);
    } catch (err) {
      console.error(`Error removing sessionStorage key "${key}":`, err);
      setError(err instanceof Error ? err : new Error('Failed to remove sessionStorage'));
    }
  }, [key, initialValue]);

  return { value, setValue: setStoredValue, removeValue, loaded, error };
}

/**
 * 批量本地存储操作
 */
export function useLocalStorageBatch() {
  const getMultiple = useCallback(<T>(keys: string[]): Record<string, T | null> => {
    if (typeof window === 'undefined') {
      return Object.fromEntries(keys.map(k => [k, null]));
    }

    const result: Record<string, T | null> = {};
    for (const key of keys) {
      try {
        const item = window.localStorage.getItem(key);
        result[key] = item ? JSON.parse(item) : null;
      } catch {
        result[key] = null;
      }
    }
    return result;
  }, []);

  const setMultiple = useCallback(<T>(items: Record<string, T>): void => {
    if (typeof window === 'undefined') return;

    for (const [key, value] of Object.entries(items)) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {
        console.error(`Error setting localStorage key "${key}":`, err);
      }
    }
  }, []);

  const removeMultiple = useCallback((keys: string[]): void => {
    if (typeof window === 'undefined') return;

    for (const key of keys) {
      try {
        window.localStorage.removeItem(key);
      } catch (err) {
        console.error(`Error removing localStorage key "${key}":`, err);
      }
    }
  }, []);

  const clearAll = useCallback((): void => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.clear();
    } catch (err) {
      console.error('Error clearing localStorage:', err);
    }
  }, []);

  return { getMultiple, setMultiple, removeMultiple, clearAll };
}

/**
 * 存储空间信息 Hook
 */
export function useStorageInfo() {
  const [info, setInfo] = useState<{
    used: number;
    quota: number;
    available: number;
  } | null>(null);

  useEffect(() => {
    const estimateStorage = async () => {
      if (typeof navigator !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          setInfo({
            used: estimate.usage || 0,
            quota: estimate.quota || 0,
            available: (estimate.quota || 0) - (estimate.usage || 0),
          });
        } catch {
          setInfo(null);
        }
      }
    };

    estimateStorage();
  }, []);

  return info;
}

export default useLocalStorage;