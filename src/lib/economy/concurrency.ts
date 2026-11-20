/**
 * 7zi Agent 经济系统 - 并发控制原语
 * @module economy/concurrency
 */

/**
 * 按 key 串行化的异步锁（互斥量）
 *
 * 经济系统里所有的「读余额 → 判断 → 写余额」都必须串行，否则并发操作会同时
 * 通过校验，造成超扣 / 超额退款 —— 这是真金白银的资损。
 *
 * 实现：每个 key 一条 Promise 链，后到的调用挂在前面调用的尾巴上，
 * 保证同一 key 上的临界区严格不重叠；不同 key 互不影响。
 */
export class KeyedMutex {
  private chains: Map<string, Promise<unknown>> = new Map()

  /**
   * 在 key 对应的临界区内执行 fn（同一 key 串行，不同 key 并行）
   */
  async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.chains.get(key) ?? Promise.resolve()

    // 前一个任务失败时也要继续执行后续任务（失败不能卡死队列）
    const current = previous.then(
      () => fn(),
      () => fn()
    )

    // 记录一条「永不 reject」的链，保证后续调用者能继续排队
    const tracked = current.then(
      () => undefined,
      () => undefined
    )
    this.chains.set(key, tracked)

    try {
      return await current
    } finally {
      // 只有当队尾仍然是自己时才清理，避免误删后来者的链
      if (this.chains.get(key) === tracked) {
        this.chains.delete(key)
      }
    }
  }

  /**
   * 当前是否有等待/执行中的任务（用于诊断与测试）
   */
  get pendingKeys(): string[] {
    return Array.from(this.chains.keys())
  }
}
