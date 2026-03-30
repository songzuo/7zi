/**
 * 令牌桶算法
 *
 * 桶中存放令牌，以固定速率补充令牌，请求消耗令牌
 * 桶容量最大，补充速率可配置
 */

export interface TokenBucketOptions {
  capacity: number;       // 桶容量（最大令牌数）
  refillRate: number;    // 补充速率（令牌/毫秒）
}

export interface TokenBucketResult {
  allowed: boolean;      // 是否允许请求
  remaining: number;     // 剩余令牌数
  resetTime: number;     // 重置时间（时间戳）
}

export class TokenBucket {
  private capacity: number;
  private refillRate: number;      // 令牌/毫秒
  private tokens: number;          // 当前令牌数
  private lastRefillTime: number;  // 最后补充时间（时间戳）

  constructor(options: TokenBucketOptions) {
    this.capacity = options.capacity;
    this.refillRate = options.refillRate;
    this.tokens = options.capacity;
    this.lastRefillTime = Date.now();
  }

  /**
   * 检查是否允许请求
   * @param tokensNeeded 需要的令牌数（默认为 1）
   * @returns 令牌桶结果
   */
  check(tokensNeeded: number = 1): TokenBucketResult {
    const currentTime = Date.now();

    // 补充令牌
    this.refill(currentTime);

    // 检查是否有足够的令牌
    const allowed = this.tokens >= tokensNeeded;

    if (allowed) {
      // 消耗令牌
      this.tokens -= tokensNeeded;
    }

    // 计算剩余令牌数
    const remaining = Math.floor(this.tokens);

    // 计算重置时间（下次补充满的时间）
    const resetTime = this.calculateResetTime(currentTime);

    return {
      allowed,
      remaining,
      resetTime,
    };
  }

  /**
   * 补充令牌
   * @param currentTime 当前时间（时间戳）
   */
  private refill(currentTime: number): void {
    const elapsed = currentTime - this.lastRefillTime;

    if (elapsed > 0) {
      // 计算应该补充的令牌数
      const tokensToAdd = elapsed * this.refillRate;

      // 补充令牌，不超过容量
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefillTime = currentTime;
    }
  }

  /**
   * 计算重置时间（桶重新填满的时间）
   * @param currentTime 当前时间（时间戳）
   * @returns 重置时间（时间戳）
   */
  private calculateResetTime(currentTime: number): number {
    const tokensNeeded = this.capacity - this.tokens;

    if (tokensNeeded <= 0) {
      return currentTime;
    }

    // 计算补充所需令牌的时间
    const timeToFull = tokensNeeded / this.refillRate;
    return currentTime + timeToFull;
  }

  /**
   * 重置令牌桶
   */
  reset(): void {
    this.tokens = this.capacity;
    this.lastRefillTime = Date.now();
  }

  /**
   * 获取当前令牌数
   * @returns 令牌数
   */
  getCurrentTokens(): number {
    const currentTime = Date.now();
    this.refill(currentTime);
    return Math.floor(this.tokens);
  }

  /**
   * 设置补充速率
   * @param refillRate 补充速率（令牌/毫秒）
   */
  setRefillRate(refillRate: number): void {
    this.refillRate = refillRate;
  }

  /**
   * 设置桶容量
   * @param capacity 桶容量
   */
  setCapacity(capacity: number): void {
    this.capacity = capacity;
    // 如果当前令牌数超过新容量，截断
    if (this.tokens > capacity) {
      this.tokens = capacity;
    }
  }
}
