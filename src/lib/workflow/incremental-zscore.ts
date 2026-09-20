/**
 * 增量式 Z-Score 计算器 - 使用 Welford 在线算法
 *
 * 提供 O(1) 内存和 O(1) 时间复杂度的流式异常检测
 */

export class IncrementalZScore {
  private count = 0
  private mean = 0
  private M2 = 0

  /**
   * 更新统计量并计算 Z-Score
   */
  update(value: number): { zScore: number; isAnomaly: boolean } {
    this.count++
    const delta = value - this.mean
    this.mean += delta / this.count
    const delta2 = value - this.mean
    this.M2 += delta * delta2

    const variance = this.count > 1 ? this.M2 / (this.count - 1) : 0
    const stdDev = Math.sqrt(variance)
    const zScore = stdDev > 0 ? (value - this.mean) / stdDev : 0

    return {
      zScore,
      isAnomaly: Math.abs(zScore) > 3,
    }
  }

  /**
   * 重置计算器
   */
  reset(): void {
    this.count = 0
    this.mean = 0
    this.M2 = 0
  }

  /**
   * 获取当前统计信息
   */
  getStats(): { count: number; mean: number; stdDev: number } {
    return {
      count: this.count,
      mean: this.mean,
      stdDev: this.count > 1 ? Math.sqrt(this.M2 / (this.count - 1)) : 0,
    }
  }
}
