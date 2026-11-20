/**
 * @fileoverview useLocalStorage hook 边界条件测试
 * @description 测试极端输入、存储异常、序列化问题等边界情况
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage, useSessionStorage } from '../../hooks/useLocalStorage'

describe('useLocalStorage - 边界条件测试', () => {
  let localStorageMock: { [key: string]: string }
  let mockStorage: Storage

  beforeEach(() => {
    localStorageMock = {}

    mockStorage = {
      getItem: vi.fn((key: string) => localStorageMock[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key]
      }),
      clear: vi.fn(() => {
        localStorageMock = {}
      }),
      length: 0,
      key: vi.fn(),
    } as Storage

    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ==================== Key 边界测试 ====================
  describe('key 边界条件', () => {
    it('处理空字符串 key', () => {
      const { result } = renderHook(() => useLocalStorage('', 'value'))
      expect(result.current[0]).toBe('value')
    })

    it('处理超长 key', () => {
      const longKey = 'a'.repeat(10000)
      const { result } = renderHook(() => useLocalStorage(longKey, 'value'))
      expect(result.current[0]).toBe('value')
    })

    it('处理包含特殊字符的 key', () => {
      const specialKey = 'key-with-特殊字符-🎉-and/slashes\\backslash'
      const { result } = renderHook(() => useLocalStorage(specialKey, 'value'))
      expect(result.current[0]).toBe('value')
    })

    it('处理 key 为 null 的边界情况', () => {
      // @ts-expect-error - 测试运行时行为
      const { result } = renderHook(() => useLocalStorage(null, 'default'))
      // 取决于实现，可能使用 "null" 作为 key 或抛出错误
      expect(result.current[0]).toBeDefined()
    })

    it('处理 key 为数字的边界情况', () => {
      // @ts-expect-error - 测试运行时行为
      const { result } = renderHook(() => useLocalStorage(123, 'default'))
      expect(result.current[0]).toBeDefined()
    })
  })

  // ==================== 初始值边界测试 ====================
  describe('initialValue 边界条件', () => {
    it('处理 null 初始值', () => {
      const { result } = renderHook(() => useLocalStorage<null>('key', null))
      expect(result.current[0]).toBe(null)
    })

    it('处理 undefined 初始值', () => {
      const { result } = renderHook(() => useLocalStorage<undefined>('key', undefined))
      expect(result.current[0]).toBe(undefined)
    })

    it('处理空字符串初始值', () => {
      const { result } = renderHook(() => useLocalStorage('key', ''))
      expect(result.current[0]).toBe('')
    })

    it('处理 0 初始值', () => {
      const { result } = renderHook(() => useLocalStorage('key', 0))
      expect(result.current[0]).toBe(0)
    })

    it('处理 false 初始值', () => {
      const { result } = renderHook(() => useLocalStorage('key', false))
      expect(result.current[0]).toBe(false)
    })

    it('处理 NaN 初始值', () => {
      const { result } = renderHook(() => useLocalStorage('key', NaN))
      expect(result.current[0]).toBeNaN()
    })

    it('处理 Infinity 初始值', () => {
      const { result } = renderHook(() => useLocalStorage('key', Infinity))
      expect(result.current[0]).toBe(Infinity)
    })

    it('处理 BigInt 初始值', () => {
      const { result } = renderHook(() => useLocalStorage('key', BigInt(123)))
      expect(result.current[0]).toBe(BigInt(123))
    })

    it('处理 Symbol 初始值', () => {
      const sym = Symbol('test')
      // Symbol 不能被 JSON.stringify 序列化
      const { result } = renderHook(() => useLocalStorage('key', sym))
      expect(result.current[0]).toBe(sym)
    })

    it('处理函数初始值', () => {
      const fn = () => 'test'
      // 函数序列化会丢失
      const { result } = renderHook(() => useLocalStorage('key', fn))
      expect(typeof result.current[0]).toBe('function')
    })

    it('处理 Date 对象初始值', () => {
      const date = new Date('2024-01-01')
      const { result } = renderHook(() => useLocalStorage('key', date))
      // Date 会被序列化为字符串
      expect(result.current[0]).toBeInstanceOf(Date)
    })

    it('处理正则表达式初始值', () => {
      const regex = /test/gi
      const { result } = renderHook(() => useLocalStorage('key', regex))
      expect(result.current[0]).toBeInstanceOf(RegExp)
    })

    it('处理 Map 初始值', () => {
      const map = new Map([['key', 'value']])
      const { result } = renderHook(() => useLocalStorage('key', map))
      expect(result.current[0]).toBeInstanceOf(Map)
    })

    it('处理 Set 初始值', () => {
      const set = new Set([1, 2, 3])
      const { result } = renderHook(() => useLocalStorage('key', set))
      expect(result.current[0]).toBeInstanceOf(Set)
    })

    it('处理循环引用对象', () => {
      const circular: { self?: typeof circular } = { self: undefined }
      circular.self = circular
      // 循环引用会导致 JSON.stringify 抛出错误
      const { result } = renderHook(() => useLocalStorage('key', circular))
      // 由于序列化错误，可能返回初始值或抛出错误
      expect(result.current[0]).toBeDefined()
    })

    it('处理深层嵌套对象', () => {
      const deep = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: 'deep',
                },
              },
            },
          },
        },
      }
      const { result } = renderHook(() => useLocalStorage('key', deep))
      expect(result.current[0]).toEqual(deep)
    })

    it('处理大数组初始值', () => {
      const largeArray = Array(10000).fill({ id: 1, name: 'item' })
      const { result } = renderHook(() => useLocalStorage('key', largeArray))
      expect(result.current[0]).toEqual(largeArray)
    })
  })

  // ==================== setValue 边界测试 ====================
  describe('setValue 边界条件', () => {
    it('设置为 null', () => {
      const { result } = renderHook(() => useLocalStorage<string | null>('key', 'initial'))

      act(() => {
        result.current[1](null)
      })

      expect(result.current[0]).toBe(null)
    })

    it('设置为 undefined', () => {
      const { result } = renderHook(() => useLocalStorage<string | undefined>('key', 'initial'))

      act(() => {
        result.current[1](undefined)
      })

      expect(result.current[0]).toBe(undefined)
    })

    it('设置为空字符串', () => {
      const { result } = renderHook(() => useLocalStorage('key', 'initial'))

      act(() => {
        result.current[1]('')
      })

      expect(result.current[0]).toBe('')
    })

    it('设置为 0', () => {
      const { result } = renderHook(() => useLocalStorage('key', 100))

      act(() => {
        result.current[1](0)
      })

      expect(result.current[0]).toBe(0)
    })

    it('设置为 false', () => {
      const { result } = renderHook(() => useLocalStorage('key', true))

      act(() => {
        result.current[1](false)
      })

      expect(result.current[0]).toBe(false)
    })

    it('使用函数更新设置为相同值', () => {
      const { result } = renderHook(() => useLocalStorage('key', 'value'))

      act(() => {
        result.current[1](prev => prev)
      })

      expect(result.current[0]).toBe('value')
    })

    it('使用函数更新多次', () => {
      const { result } = renderHook(() => useLocalStorage('count', 0))

      // React 18 自动批处理会在同一个事件处理程序中合并更新
      // 为了确保每次更新都独立执行，需要分开调用 act
      act(() => {
        result.current[1](prev => prev + 1)
      })
      act(() => {
        result.current[1](prev => prev + 1)
      })
      act(() => {
        result.current[1](prev => prev + 1)
      })

      expect(result.current[0]).toBe(3)
    })

    it('使用异步风格的函数更新', async () => {
      const { result } = renderHook(() => useLocalStorage('count', 0))

      await act(async () => {
        result.current[1](prev => prev + 10)
      })

      expect(result.current[0]).toBe(10)
    })
  })

  // ==================== 存储错误边界测试 ====================
  describe('存储错误处理', () => {
    it('处理 localStorage.getItem 抛出错误', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      Object.defineProperty(window, 'localStorage', {
        value: {
          ...mockStorage,
          getItem: vi.fn(() => {
            throw new Error('Storage access denied')
          }),
        },
        writable: true,
      })

      const { result } = renderHook(() => useLocalStorage('key', 'default'))

      expect(result.current[0]).toBe('default')
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('处理 localStorage.setItem 抛出 QuotaExceededError', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      Object.defineProperty(window, 'localStorage', {
        value: {
          ...mockStorage,
          setItem: vi.fn(() => {
            const error = new Error('Quota exceeded')
            error.name = 'QuotaExceededError'
            throw error
          }),
        },
        writable: true,
      })

      const { result } = renderHook(() => useLocalStorage('key', 'initial'))

      act(() => {
        result.current[1]('new-value')
      })

      // 状态仍然更新，即使存储失败
      expect(result.current[0]).toBe('new-value')
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('处理 localStorage 不可用', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // 模拟 localStorage 不存在
      const originalLocalStorage = window.localStorage
      // @ts-expect-error - 测试 localStorage 不存在的情况
      delete window.localStorage

      // 需要重新定义 localStorage 为会抛错的实现
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('localStorage not available')
        },
        configurable: true,
      })

      const { result } = renderHook(() => useLocalStorage('key', 'default'))

      expect(result.current[0]).toBe('default')

      // 恢复
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
        configurable: true,
      })

      consoleSpy.mockRestore()
    })

    it('处理存储损坏数据', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      localStorageMock['key'] = 'not valid json {{{'

      const { result } = renderHook(() => useLocalStorage('key', 'default'))

      expect(result.current[0]).toBe('default')
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('处理存储空字符串', () => {
      localStorageMock['key'] = ''

      const { result } = renderHook(() => useLocalStorage('key', 'default'))

      // 空字符串不是有效的 JSON，会返回默认值
      expect(result.current[0]).toBe('default')
    })

    it('处理存储 "null" 字符串', () => {
      localStorageMock['key'] = 'null'

      const { result } = renderHook(() => useLocalStorage<string | null>('key', 'default'))

      // JSON.parse('null') 返回 null
      expect(result.current[0]).toBe(null)
    })

    it('处理存储 "undefined" 字符串', () => {
      localStorageMock['key'] = 'undefined'

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { result } = renderHook(() => useLocalStorage('key', 'default'))

      // 'undefined' 不是有效的 JSON，会返回默认值
      expect(result.current[0]).toBe('default')

      consoleSpy.mockRestore()
    })
  })

  // ==================== 自定义序列化边界测试 ====================
  describe('自定义序列化边界', () => {
    it('使用自定义序列化器处理 Date', () => {
      const date = new Date('2024-01-15T12:00:00')

      const { result } = renderHook(() =>
        useLocalStorage<Date>('key', date, {
          serialize: d => d.toISOString(),
          deserialize: s => new Date(s),
        })
      )

      expect(result.current[0].toISOString()).toBe(date.toISOString())
    })

    it('自定义序列化器抛出错误', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { result } = renderHook(() =>
        useLocalStorage('key', 'initial', {
          serialize: () => {
            throw new Error('Serialize error')
          },
          deserialize: s => s,
        })
      )

      act(() => {
        result.current[1]('new-value')
      })

      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('自定义反序列化器抛出错误', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      localStorageMock['key'] = 'some-value'

      const { result } = renderHook(() =>
        useLocalStorage('key', 'default', {
          serialize: s => s,
          deserialize: () => {
            throw new Error('Deserialize error')
          },
        })
      )

      expect(result.current[0]).toBe('default')
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('自定义序列化器返回 undefined', () => {
      const { result } = renderHook(() =>
        useLocalStorage('key', 'initial', {
          serialize: () => undefined as unknown as string,
          deserialize: s => s,
        })
      )

      act(() => {
        result.current[1]('new-value')
      })

      // 应该不会崩溃
      expect(result.current[0]).toBe('new-value')
    })

    it('自定义序列化器返回非字符串', () => {
      const { result } = renderHook(() =>
        useLocalStorage('key', 'initial', {
          serialize: () => 123 as unknown as string,
          deserialize: s => String(s),
        })
      )

      act(() => {
        result.current[1]('new-value')
      })

      expect(result.current[0]).toBe('new-value')
    })
  })

  // ==================== 并发更新边界测试 ====================
  describe('并发更新边界', () => {
    it('快速连续更新', () => {
      const { result } = renderHook(() => useLocalStorage('count', 0))

      for (let i = 0; i < 100; i++) {
        act(() => {
          result.current[1](prev => prev + 1)
        })
      }

      expect(result.current[0]).toBe(100)
    })

    it('交替更新不同类型的值', () => {
      const { result } = renderHook(() => useLocalStorage<string | number>('key', 'string'))

      act(() => {
        result.current[1](123)
      })
      expect(result.current[0]).toBe(123)

      act(() => {
        result.current[1]('back to string')
      })
      expect(result.current[0]).toBe('back to string')

      act(() => {
        result.current[1](0)
      })
      expect(result.current[0]).toBe(0)
    })

    it('同时更新多个 key', () => {
      const { result: result1 } = renderHook(() => useLocalStorage('key1', 0))
      const { result: result2 } = renderHook(() => useLocalStorage('key2', 0))
      const { result: result3 } = renderHook(() => useLocalStorage('key3', 0))

      act(() => {
        result1.current[1](1)
        result2.current[1](2)
        result3.current[1](3)
      })

      expect(result1.current[0]).toBe(1)
      expect(result2.current[0]).toBe(2)
      expect(result3.current[0]).toBe(3)
    })
  })

  // ==================== SSR 兼容性边界测试 ====================
  describe('SSR 兼容性', () => {
    it('在 window 未定义时返回初始值', () => {
      // 保存原始 window 引用
      const originalWindow = globalThis.window

      // 注意：React Testing Library 需要 window 来渲染组件
      // 所以这里只测试 hook 在 localStorage 不可用时能正确返回默认值
      // 我们通过模拟 localStorage 抛出错误来模拟 SSR 环境

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('localStorage is not available')
        },
        configurable: true,
      })

      const { result } = renderHook(() => useLocalStorage('key', 'ssr-value'))

      // 在 SSR 环境下应该返回初始值
      expect(result.current[0]).toBe('ssr-value')

      // 恢复 localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalWindow.localStorage,
        writable: true,
        configurable: true,
      })

      consoleSpy.mockRestore()
    })
  })
})

// ==================== useSessionStorage 边界测试 ====================
describe('useSessionStorage - 边界条件测试', () => {
  let sessionStorageMock: { [key: string]: string }
  let mockStorage: Storage
  let originalSessionStorage: Storage

  beforeEach(() => {
    sessionStorageMock = {}
    // 保存原始 sessionStorage
    originalSessionStorage = window.sessionStorage

    mockStorage = {
      getItem: vi.fn((key: string) => sessionStorageMock[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        sessionStorageMock[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete sessionStorageMock[key]
      }),
      clear: vi.fn(() => {
        sessionStorageMock = {}
      }),
      length: 0,
      key: vi.fn(),
    } as Storage

    // 使用 defineProperty 确保正确设置
    Object.defineProperty(window, 'sessionStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    // 恢复原始 sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: originalSessionStorage,
      writable: true,
      configurable: true,
    })
    vi.clearAllMocks()
  })

  it('使用 sessionStorage 而非 localStorage', () => {
    const { result } = renderHook(() => useSessionStorage('key', 'value'))

    expect(result.current[0]).toBe('value')

    act(() => {
      result.current[1]('updated')
    })

    expect(mockStorage.setItem).toHaveBeenCalled()
  })

  it('处理 null 初始值', () => {
    const { result } = renderHook(() => useSessionStorage<null>('key', null))
    expect(result.current[0]).toBe(null)
  })

  it('处理复杂对象', () => {
    const complex = { nested: { value: [1, 2, 3] } }
    const { result } = renderHook(() => useSessionStorage('key', complex))

    expect(result.current[0]).toEqual(complex)
  })

  it('处理函数式更新', () => {
    const { result } = renderHook(() => useSessionStorage('count', 0))

    act(() => {
      result.current[1](prev => prev + 10)
    })

    expect(result.current[0]).toBe(10)
  })
})
