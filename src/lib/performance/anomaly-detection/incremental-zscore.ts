/**
 * Incremental Z-Score Calculator using Welford's Online Algorithm
 *
 * This implementation provides O(1) memory and O(1) time per update,
 * making it suitable for streaming anomaly detection.
 *
 * Welford's algorithm is numerically stable and avoids catastrophic cancellation
 * that can occur with naive variance calculations.
 */

export interface ZScoreResult {
  zScore: number
  isAnomaly: boolean
}

export interface IncrementalZScoreState {
  count: number
  mean: number
  m2: number // Sum of squared differences from mean
}

export class IncrementalZScore {
  private count: number = 0
  private mean: number = 0
  private m2: number = 0 // Sum of squared differences from mean
  private readonly threshold: number

  /**
   * Create a new IncrementalZScore calculator
   * @param threshold - Z-score threshold for anomaly detection (default: 3)
   */
  constructor(threshold: number = 3) {
    if (threshold <= 0) {
      throw new Error('Threshold must be positive')
    }
    this.threshold = threshold
  }

  /**
   * Update the statistics with a new value and compute its z-score
   * @param value - New observation
   * @returns Object containing z-score and anomaly flag
   */
  update(value: number): ZScoreResult {
    // Update count
    this.count++

    // Welford's algorithm for incremental mean and variance
    const delta = value - this.mean
    this.mean += delta / this.count
    const delta2 = value - this.mean
    this.m2 += delta * delta2

    // Compute z-score
    const zScore = this.computeZScore(value)
    const isAnomaly = Math.abs(zScore) > this.threshold

    return { zScore, isAnomaly }
  }

  /**
   * Compute z-score for a value based on current statistics
   * @param value - Value to compute z-score for
   * @returns Z-score (returns 0 if insufficient data)
   */
  computeZScore(value: number): number {
    if (this.count < 2) {
      return 0 // Need at least 2 points for meaningful variance
    }

    const variance = this.m2 / (this.count - 1)
    const stdDev = Math.sqrt(variance)

    if (stdDev === 0) {
      return 0 // All values are identical
    }

    return (value - this.mean) / stdDev
  }

  /**
   * Get current statistics
   */
  getStats(): {
    count: number
    mean: number
    variance: number
    stdDev: number
  } {
    const variance = this.count > 1 ? this.m2 / (this.count - 1) : 0
    const stdDev = Math.sqrt(variance)

    return {
      count: this.count,
      mean: this.mean,
      variance,
      stdDev,
    }
  }

  /**
   * Reset the calculator to initial state
   */
  reset(): void {
    this.count = 0
    this.mean = 0
    this.m2 = 0
  }

  /**
   * Get internal state (for serialization)
   */
  getState(): IncrementalZScoreState {
    return {
      count: this.count,
      mean: this.mean,
      m2: this.m2,
    }
  }

  /**
   * Restore from saved state
   */
  setState(state: IncrementalZScoreState): void {
    this.count = state.count
    this.mean = state.mean
    this.m2 = state.m2
  }

  /**
   * Merge two IncrementalZScore instances (parallel aggregation)
   * This is useful for distributed computing scenarios
   */
  static merge(a: IncrementalZScore, b: IncrementalZScore): IncrementalZScore {
    const merged = new IncrementalZScore(a.threshold)

    const stateA = a.getState()
    const stateB = b.getState()

    const count = stateA.count + stateB.count
    if (count === 0) {
      return merged
    }

    const mean = (stateA.count * stateA.mean + stateB.count * stateB.mean) / count
    const delta = stateB.mean - stateA.mean
    const m2 = stateA.m2 + stateB.m2 + (delta * delta * stateA.count * stateB.count) / count

    merged.setState({ count, mean, m2 })
    return merged
  }
}

/**
 * Factory function to create a pre-configured IncrementalZScore instance
 */
export function createIncrementalZScore(threshold: number = 3): IncrementalZScore {
  return new IncrementalZScore(threshold)
}
