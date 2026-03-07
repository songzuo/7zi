/**
 * 本地存储测试
 * @module hooks/__tests__/useLocalStorage.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage, useSessionStorage, useLocalStorageBatch } from '../useLocalStorage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get store() {
      return store;
    },
  };
})();

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get store() {
      return store;
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

describe('useLocalStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('should return initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    
    expect(result.current.value).toBe('default');
    expect(result.current.loaded).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should load value from localStorage', () => {
    localStorageMock.setItem('test-key', JSON.stringify('stored-value'));
    
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    
    expect(result.current.value).toBe('stored-value');
  });

  it('should update value and localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    
    act(() => {
      result.current.setValue('new-value');
    });
    
    expect(result.current.value).toBe('new-value');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', JSON.stringify('new-value'));
  });

  it('should support functional updates', () => {
    const { result } = renderHook(() => useLocalStorage('count', 0));
    
    act(() => {
      result.current.setValue((prev) => prev + 1);
    });
    
    expect(result.current.value).toBe(1);
  });

  it('should remove value from localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    
    act(() => {
      result.current.setValue('new-value');
    });
    
    expect(result.current.value).toBe('new-value');
    
    act(() => {
      result.current.removeValue();
    });
    
    expect(result.current.value).toBe('default');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-key');
  });

  it('should handle object values', () => {
    const { result } = renderHook(() =>
      useLocalStorage('user', { name: '', age: 0 })
    );
    
    act(() => {
      result.current.setValue({ name: 'John', age: 30 });
    });
    
    expect(result.current.value).toEqual({ name: 'John', age: 30 });
  });

  it('should handle array values', () => {
    const { result } = renderHook(() => useLocalStorage<string[]>('items', []));
    
    act(() => {
      result.current.setValue(['a', 'b', 'c']);
    });
    
    expect(result.current.value).toEqual(['a', 'b', 'c']);
  });
});

describe('useSessionStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageMock.clear();
  });

  it('should return initial value when sessionStorage is empty', () => {
    const { result } = renderHook(() => useSessionStorage('session-key', 'default'));
    
    expect(result.current.value).toBe('default');
    expect(result.current.loaded).toBe(true);
  });

  it('should update sessionStorage', () => {
    const { result } = renderHook(() => useSessionStorage('session-key', 'default'));
    
    act(() => {
      result.current.setValue('session-value');
    });
    
    expect(result.current.value).toBe('session-value');
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith('session-key', JSON.stringify('session-value'));
  });
});

describe('useLocalStorageBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('should get multiple values', () => {
    localStorageMock.setItem('key1', JSON.stringify('value1'));
    localStorageMock.setItem('key2', JSON.stringify('value2'));
    
    const { result } = renderHook(() => useLocalStorageBatch());
    
    const values = result.current.getMultiple<string>(['key1', 'key2', 'key3']);
    
    expect(values['key1']).toBe('value1');
    expect(values['key2']).toBe('value2');
    expect(values['key3']).toBeNull();
  });

  it('should set multiple values', () => {
    const { result } = renderHook(() => useLocalStorageBatch());
    
    act(() => {
      result.current.setMultiple({
        key1: 'value1',
        key2: 'value2',
      });
    });
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith('key1', JSON.stringify('value1'));
    expect(localStorageMock.setItem).toHaveBeenCalledWith('key2', JSON.stringify('value2'));
  });

  it('should remove multiple values', () => {
    const { result } = renderHook(() => useLocalStorageBatch());
    
    act(() => {
      result.current.removeMultiple(['key1', 'key2']);
    });
    
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('key1');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('key2');
  });

  it('should clear all localStorage', () => {
    const { result } = renderHook(() => useLocalStorageBatch());
    
    act(() => {
      result.current.clearAll();
    });
    
    expect(localStorageMock.clear).toHaveBeenCalled();
  });
});