/**
 * 可订阅的轻量外部存储
 *
 * 用途：让 React 组件在 **effect / 事件回调** 中更新数据，
 * 并通过 `useSyncExternalStore` 在 **render 阶段** 安全读取，
 * 避免 "render 期间读取 ref.current" 与 "effect 中同步 setState" 两类问题。
 *
 * 不引入任何新依赖，语义与 ref + setState 等价。
 */

export type StoreListener = () => void

export interface ObservableStore<T> {
  /** 读取当前值（引用稳定，未 set 时返回同一对象） */
  get: () => T
  /** 更新当前值；值未变化时不触发通知 */
  set: (next: T) => void
  /** 订阅变更，返回取消订阅函数 */
  subscribe: (listener: StoreListener) => () => void
}

/**
 * 创建可订阅存储
 */
export function createObservableStore<T>(initialValue: T): ObservableStore<T> {
  let value = initialValue
  const listeners = new Set<StoreListener>()

  return {
    get: () => value,
    set: (next: T) => {
      if (Object.is(value, next)) return
      value = next
      listeners.forEach((listener) => listener())
    },
    subscribe: (listener: StoreListener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
