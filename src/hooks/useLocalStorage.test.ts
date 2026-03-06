import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage, useSessionStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    localStorageMock = {};
    
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => localStorageMock[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageMock[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageMock[key];
        }),
        clear: vi.fn(() => {
          localStorageMock = {};
        }),
        length: 0,
        key: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('初始化', () => {
    it('应该使用初始值当 localStorage 为空时', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
      
      expect(result.current[0]).toBe('initial');
    });

    it('应该从 localStorage 读取已存在的值', () => {
      localStorageMock['test-key'] = JSON.stringify('stored-value');
      
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
      
      expect(result.current[0]).toBe('stored-value');
    });

    it('应该正确处理对象类型的初始值', () => {
      const initialValue = { name: 'test', count: 0 };
      const { result } = renderHook(() => useLocalStorage('test-key', initialValue));
      
      expect(result.current[0]).toEqual(initialValue);
    });

    it('应该正确处理数组类型的初始值', () => {
      const initialValue = [1, 2, 3];
      const { result } = renderHook(() => useLocalStorage('test-key', initialValue));
      
      expect(result.current[0]).toEqual(initialValue);
    });

    it('应该正确处理数字类型的初始值', () => {
      const { result } = renderHook(() => useLocalStorage('count', 42));
      
      expect(result.current[0]).toBe(42);
    });

    it('应该正确处理布尔类型的初始值', () => {
      const { result } = renderHook(() => useLocalStorage('flag', true));
      
      expect(result.current[0]).toBe(true);
    });
  });

  describe('setValue', () => {
    it('应该更新状态值', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
      
      act(() => {
        result.current[1]('new-value');
      });
      
      expect(result.current[0]).toBe('new-value');
    });

    it('应该将值存储到 localStorage', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
      
      act(() => {
        result.current[1]('new-value');
      });
      
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify('new-value')
      );
    });

    it('应该支持函数式更新', () => {
      const { result } = renderHook(() => useLocalStorage('count', 0));
      
      act(() => {
        result.current[1]((prev) => prev + 1);
      });
      
      expect(result.current[0]).toBe(1);
    });

    it('应该支持对象更新', () => {
      const { result } = renderHook(() =>
        useLocalStorage('user', { name: 'John', age: 20 })
      );
      
      act(() => {
        result.current[1]({ name: 'Jane', age: 25 });
      });
      
      expect(result.current[0]).toEqual({ name: 'Jane', age: 25 });
    });

    it('应该支持部分对象更新（使用函数）', () => {
      const { result } = renderHook(() =>
        useLocalStorage('user', { name: 'John', age: 20 })
      );
      
      act(() => {
        result.current[1]((prev) => ({ ...prev, age: 21 }));
      });
      
      expect(result.current[0]).toEqual({ name: 'John', age: 21 });
    });

    it('应该支持数组更新', () => {
      const { result } = renderHook(() => useLocalStorage('items', [1, 2]));
      
      act(() => {
        result.current[1]([1, 2, 3]);
      });
      
      expect(result.current[0]).toEqual([1, 2, 3]);
    });

    it('应该支持数组 push 操作（使用函数）', () => {
      const { result } = renderHook(() => useLocalStorage('items', [1, 2]));
      
      act(() => {
        result.current[1]((prev) => [...prev, 3]);
      });
      
      expect(result.current[0]).toEqual([1, 2, 3]);
    });
  });

  describe('自定义序列化', () => {
    it('应该支持自定义 serialize 函数', () => {
      const customSerialize = (value: Date) => value.toISOString();
      const customDeserialize = (value: string) => new Date(value);
      
      const date = new Date('2024-01-01');
      const { result } = renderHook(() =>
        useLocalStorage('date', date, {
          serialize: customSerialize,
          deserialize: customDeserialize,
        })
      );
      
      expect(result.current[0].toISOString()).toBe(date.toISOString());
    });

    it('应该使用自定义序列化存储值', () => {
      const customSerialize = vi.fn((value: string) => value.toUpperCase());
      const customDeserialize = vi.fn((value: string) => value.toLowerCase());
      
      const { result } = renderHook(() =>
        useLocalStorage('test-key', 'hello', {
          serialize: customSerialize,
          deserialize: customDeserialize,
        })
      );
      
      act(() => {
        result.current[1]('world');
      });
      
      expect(customSerialize).toHaveBeenCalledWith('world');
    });
  });

  describe('错误处理', () => {
    it('当 localStorage.getItem 抛出错误时应该返回初始值', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(() => {
            throw new Error('Storage error');
          }),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
          length: 0,
          key: vi.fn(),
        },
        writable: true,
      });
      
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
      
      expect(result.current[0]).toBe('initial');
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('当 localStorage.setItem 抛出错误时不应该崩溃', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(() => null),
          setItem: vi.fn(() => {
            throw new Error('Storage full');
          }),
          removeItem: vi.fn(),
          clear: vi.fn(),
          length: 0,
          key: vi.fn(),
        },
        writable: true,
      });
      
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
      
      act(() => {
        result.current[1]('new-value');
      });
      
      expect(result.current[0]).toBe('new-value'); // 状态仍然更新
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('当 JSON.parse 失败时应该返回初始值', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      localStorageMock['test-key'] = 'invalid-json{{{';
      
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
      
      expect(result.current[0]).toBe('initial');
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('SSR 兼容性', () => {
    it.skip('在服务端环境下应该返回初始值', () => {
      // 此测试需要特殊环境设置，暂时跳过
      // 在实际 SSR 环境中，hook 会返回初始值
    });
  });
});

describe('useSessionStorage', () => {
  it('应该使用 useLocalStorage 实现', () => {
    const { result } = renderHook(() => useSessionStorage('test-key', 'initial'));
    
    expect(result.current[0]).toBe('initial');
  });

  it('应该支持更新值', () => {
    const { result } = renderHook(() => useSessionStorage('test-key', 'initial'));
    
    act(() => {
      result.current[1]('updated');
    });
    
    expect(result.current[0]).toBe('updated');
  });

  it('应该支持函数式更新', () => {
    const { result } = renderHook(() => useSessionStorage('count', 0));
    
    act(() => {
      result.current[1]((prev) => prev + 10);
    });
    
    expect(result.current[0]).toBe(10);
  });
});