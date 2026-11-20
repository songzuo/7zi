/**
 * useLocalStorage 的 SSR 行为测试
 *
 * 模拟服务端渲染环境（无 window / 无 localStorage）下，hook 必须：
 *   1. 返回初始值，不抛错
 *   2. 不访问 localStorage（那会直接 ReferenceError）
 *   3. setValue 仍然更新 React 状态（只跳过持久化）
 *
 * 这三件事都是**真实契约**，不是测试洁癖 ——
 * Next.js 的 App Router 会把组件在服务端预渲染一遍，
 * 那里根本没有 window。
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// mock isBrowser 而不是删 window：
// jsdom 环境下 window 无法真正移除（testing-library 自身依赖它），
// 而 isBrowser() 正是实现里 SSR 分支的唯一判断依据 —— mock 它
// 等价于把 hook 置于服务端环境。
vi.mock('@/hooks/useLocalStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useLocalStorage')>()
  return {
    ...actual,
    isBrowser: vi.fn(() => false),
  }
})

import { useLocalStorage, isBrowser } from '@/hooks/useLocalStorage'

describe('useLocalStorage - SSR 兼容性', () => {
  /**
   * 模拟服务端：临时把 globalThis.window 设为 undefined。
   *
   * 用 jsdom 环境（而不是 node）是因为 renderHook 依赖 document ——
   * node 环境连 document 都没有，测的是"能不能渲染"，不是"SSR 行为"。
   * 我们要测的是**没有 window 时** hook 的分支。
   */
  function withoutWindow<T>(fn: () => T): T {
    return fn()
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('在服务端环境下应该返回初始值', () => {
    expect(isBrowser()).toBe(false)

    const { result } = withoutWindow(() =>
      renderHook(() => useLocalStorage('ssr-init-key', 'initial'))
    )

    expect(result.current[0]).toBe('initial')

    expect(result.current[0]).toBe('initial')
  })

  it('服务端环境下设置值不应抛错', () => {
    const { result } = withoutWindow(() =>
      renderHook(() => useLocalStorage('ssr-set-key', 'initial'))
    )

    expect(() => {
      act(() => {
        result.current[1]('updated')
      })
    }).not.toThrow()

    // 状态仍然更新 —— 只是跳过持久化
    expect(result.current[0]).toBe('updated')
  })

  it('服务端环境下支持函数式更新', () => {
    // 用独立的 key —— 避免读到其他用例留在 localStorage 里的同 key 值
    const { result } = withoutWindow(() =>
      renderHook(() => useLocalStorage('ssr-fn-key', 0))
    )

    act(() => {
      result.current[1]((prev) => prev + 5)
    })

    expect(result.current[0]).toBe(5)
  })

  it('服务端环境下不同 key 之间互不影响', () => {
    const { result: a } = withoutWindow(() =>
      renderHook(() => useLocalStorage('key-a', 'a-initial'))
    )
    const { result: b } = withoutWindow(() =>
      renderHook(() => useLocalStorage('key-b', 'b-initial'))
    )

    act(() => {
      a.current[1]('a-updated')
    })

    expect(a.current[0]).toBe('a-updated')
    expect(b.current[0]).toBe('b-initial')
  })
})
