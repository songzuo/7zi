/**
 * useDepsVersion - 动态依赖数组的静态化工具
 *
 * 背景：部分自定义 Hook 允许调用方在运行时决定依赖数组（deps 参数），
 * 由于依赖数组不是字面量，ESLint 的 react-hooks/exhaustive-deps 无法静态校验，
 * 会报 "dependency list that is not an array literal" 与 "missing dependency" 警告。
 *
 * 方案：在渲染期对前后两次 deps 做浅比较（语义与 React 自身的依赖比较一致：
 * 逐项 Object.is），在发生变化时递增一个版本号；调用方把该版本号作为
 * 字面量依赖项传给 useEffect。
 *
 * 这样既保留了「deps 变化时 effect 重新执行」的原有行为（对外行为不变），
 * 又能让静态分析通过，无需使用 eslint-disable 注释。
 */

import { useRef, type DependencyList } from 'react'

/**
 * 浅比较两个依赖数组（React 依赖比较语义：逐项 Object.is 比较）
 */
function shallowEqualDeps(a: DependencyList, b: DependencyList): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false
  }
  return true
}

/**
 * 返回依赖数组的版本号：deps 变化时版本号递增，否则保持不变。
 *
 * @example
 * const version = useDepsVersion(deps)
 * useEffect(() => { ... }, [version])
 */
export function useDepsVersion(deps: DependencyList): number {
  const storeRef = useRef<{ deps: DependencyList; version: number }>({
    deps,
    version: 0,
  })

  if (!shallowEqualDeps(storeRef.current.deps, deps)) {
    storeRef.current = { deps, version: storeRef.current.version + 1 }
  }

  return storeRef.current.version
}
