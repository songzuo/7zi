/**
 * 滑动窗口算法
 *
 * 时间窗口滑动，记录每个请求的时间戳，只保留窗口内的请求
 */

export interface SlidingWindowOptions {
  windowMs: number // 时间窗口（毫秒）
  maxRequests: number // 窗口内最大请求数
}

export interface SlidingWindowResult {
  allowed: boolean // 是否允许请求
  remaining: number // 剩余请求数
  resetTime: number // 重置时间（时间戳）
}

export class SlidingWindow {
  private windowMs: number
  private maxRequests: number
  private timestamps: number[] = []

  constructor(options: SlidingWindowOptions) {
    this.windowMs = options.windowMs
    this.maxRequests = options.maxRequests
  }

  /**
   * 检查是否允许请求
   * @param currentTime 当前时间（时间戳）
   * @returns 滑动窗口结果
   */
  check(currentTime: number): SlidingWindowResult {
    // 清理过期的请求时间戳
    this.cleanup(currentTime)

    // 检查是否超过限制
    const allowed = this.timestamps.length < this.maxRequests

    if (allowed) {
      // 如果允许，记录当前请求
      this.timestamps.push(currentTime)
    }

    // 计算剩余请求数
    const remaining = Math.max(0, this.maxRequests - this.timestamps.length)

    // 计算重置时间（最早的请求过期时间）
    const resetTime = this.calculateResetTime(currentTime)

    return {
      allowed,
      remaining,
      resetTime,
    }
  }

  /**
   * 清理过期的请求时间戳
   * @param currentTime 当前时间（时间戳）
   */
  private cleanup(currentTime: number): void {
    const windowStart = currentTime - this.windowMs
    this.timestamps = this.timestamps.filter(timestamp => timestamp > windowStart)
  }

  /**
   * 计算重置时间
   * @param currentTime 当前时间（时间戳）
   * @returns 重置时间（时间戳）
   */
  private calculateResetTime(currentTime: number): number {
    if (this.timestamps.length === 0) {
      return currentTime + this.windowMs
    }

    const oldestTimestamp = this.timestamps[0]
    return oldestTimestamp + this.windowMs
  }

  /**
   * 重置滑动窗口
   */
  reset(): void {
    this.timestamps = []
  }

  /**
   * 获取当前窗口内的请求数
   * @returns 请求数量
   */
  getCurrentCount(): number {
    const currentTime = Date.now()
    this.cleanup(currentTime)
    return this.timestamps.length
  }

  /**
   * 获取所有时间戳（用于测试）
   * @returns 时间戳数组
   */
  getTimestamps(): number[] {
    return [...this.timestamps]
  }
}
