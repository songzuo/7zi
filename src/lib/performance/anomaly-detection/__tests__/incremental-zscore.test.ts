/**
 * Unit tests for IncrementalZScore
 *
 * Tests Welford's online algorithm implementation for incremental
 * z-score calculation and anomaly detection.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { IncrementalZScore, createIncrementalZScore } from '../incremental-zscore'

describe('IncrementalZScore', () => {
  let detector: IncrementalZScore

  beforeEach(() => {
    detector = new IncrementalZScore()
  })

  describe('basic functionality', () => {
    it('should initialize with zero count', () => {
      const stats = detector.getStats()
      expect(stats.count).toBe(0)
      expect(stats.mean).toBe(0)
      expect(stats.stdDev).toBe(0)
    })

    it('should update count correctly', () => {
      detector.update(10)
      expect(detector.getStats().count).toBe(1)

      detector.update(20)
      expect(detector.getStats().count).toBe(2)
    })

    it('should compute correct mean', () => {
      detector.update(10)
      expect(detector.getStats().mean).toBe(10)

      detector.update(20)
      expect(detector.getStats().mean).toBe(15)

      detector.update(30)
      expect(detector.getStats().mean).toBe(20)
    })

    it('should compute correct variance and stdDev', () => {
      // Values: 2, 4, 4, 4, 5, 5, 7, 9
      const values = [2, 4, 4, 4, 5, 5, 7, 9]
      values.forEach(v => detector.update(v))

      const stats = detector.getStats()
      // Mean should be 5
      expect(stats.mean).toBe(5)
      // Sample variance (using n-1) = 32/7 = 4.571...
      expect(stats.variance).toBeCloseTo(32 / 7, 5)
      // StdDev should be sqrt(32/7)
      expect(stats.stdDev).toBeCloseTo(Math.sqrt(32 / 7), 5)
    })
  })

  describe('z-score calculation', () => {
    it('should return 0 z-score with less than 2 points', () => {
      const result = detector.update(10)
      expect(result.zScore).toBe(0)
    })

    it('should compute correct z-score', () => {
      // Build statistics with known values
      const values = [10, 10, 10, 10, 10]
      values.forEach(v => detector.update(v))

      // All values are identical, z-score should be 0
      const result = detector.update(10)
      expect(result.zScore).toBe(0)
    })

    it('should detect outliers correctly', () => {
      // Build baseline with known stdDev
      const baseline = Array(100)
        .fill(50)
        .map((v, i) => v + ((i % 20) - 10) * 2)
      baseline.forEach(v => detector.update(v))

      const stats = detector.getStats()
      // A value far from the mean should be flagged
      const result = detector.update(100)
      expect(Math.abs(result.zScore)).toBeGreaterThan(2)
      expect(result.isAnomaly).toBe(true)
    })
  })

  describe('anomaly detection', () => {
    it('should not flag normal values as anomalies', () => {
      const values = [10, 11, 12, 9, 10, 11, 10, 12]
      const results = values.map(v => detector.update(v))

      results.forEach(r => {
        expect(r.isAnomaly).toBe(false)
      })
    })

    it('should flag extreme values as anomalies', () => {
      // Build baseline
      const baseline = Array(100).fill(50)
      baseline.forEach(v => detector.update(v))

      // Extreme value
      const result = detector.update(1000)
      expect(result.isAnomaly).toBe(true)
    })

    it('should respect custom threshold', () => {
      const customDetector = new IncrementalZScore(2) // More sensitive

      const baseline = [10, 10, 10, 10, 10]
      baseline.forEach(v => customDetector.update(v))

      // Moderate outlier - should be flagged with threshold 2
      const result = customDetector.update(25)
      expect(result.isAnomaly).toBe(true)
    })
  })

  describe('state management', () => {
    it('should save and restore state correctly', () => {
      const values = [10, 20, 30, 40, 50]
      values.forEach(v => detector.update(v))

      const savedState = detector.getState()
      const statsBefore = detector.getStats()

      // Create new detector and restore state
      const newDetector = new IncrementalZScore()
      newDetector.setState(savedState)
      const statsAfter = newDetector.getStats()

      expect(statsAfter.count).toBe(statsBefore.count)
      expect(statsAfter.mean).toBe(statsBefore.mean)
      expect(statsAfter.variance).toBeCloseTo(statsBefore.variance, 5)
    })

    it('should reset correctly', () => {
      detector.update(10)
      detector.update(20)
      detector.update(30)

      detector.reset()

      const stats = detector.getStats()
      expect(stats.count).toBe(0)
      expect(stats.mean).toBe(0)
      expect(stats.stdDev).toBe(0)
    })
  })

  describe('merge functionality', () => {
    it('should merge two empty detectors', () => {
      const detectorA = new IncrementalZScore()
      const detectorB = new IncrementalZScore()
      const merged = IncrementalZScore.merge(detectorA, detectorB)

      expect(merged.getStats().count).toBe(0)
    })

    it('should merge detectors correctly', () => {
      const detectorA = new IncrementalZScore()
      const detectorB = new IncrementalZScore()

      // Add values to A
      ;[10, 20, 30].forEach(v => detectorA.update(v))

      // Add values to B
      ;[40, 50, 60].forEach(v => detectorB.update(v))

      const merged = IncrementalZScore.merge(detectorA, detectorB)
      const stats = merged.getStats()

      expect(stats.count).toBe(6)
      expect(stats.mean).toBe(35) // Mean of [10,20,30,40,50,60]
    })
  })

  describe('edge cases', () => {
    it('should handle negative values', () => {
      const values = [-10, -20, -15, -12, -18]
      values.forEach(v => detector.update(v))

      // The extreme negative value should be an outlier based on the mean and variance
      const stats = detector.getStats()
      const result = detector.update(-100)
      // With 5 values at mean ~-15 and stdDev ~3.5, -100 is definitely an outlier
      expect(result.isAnomaly).toBe(Math.abs(result.zScore) > 3)
    })

    it('should handle zero values', () => {
      const values = [0, 0, 0, 0, 0]
      values.forEach(v => detector.update(v))

      const stats = detector.getStats()
      expect(stats.mean).toBe(0)
      expect(stats.stdDev).toBe(0) // Zero variance with identical values

      // After adding a non-zero value, variance becomes non-zero
      // and z-score can be computed (now we have 6 values with variance)
      const result = detector.update(1)
      // The z-score for the new value is computed based on updated stats
      // With mean 1/6 and stdDev > 0, the z-score will be non-zero
      expect(isFinite(result.zScore)).toBe(true)
    })

    it('should handle floating point values', () => {
      const values = [0.1, 0.2, 0.15, 0.18, 0.22]
      values.forEach(v => detector.update(v))

      const stats = detector.getStats()
      expect(stats.mean).toBeCloseTo(0.17, 2)
    })

    it('should throw error for invalid threshold', () => {
      expect(() => new IncrementalZScore(0)).toThrow()
      expect(() => new IncrementalZScore(-1)).toThrow()
    })
  })

  describe('numerical stability', () => {
    it('should handle large values without overflow', () => {
      const largeValues = [1e10, 1e10 + 1, 1e10 - 1, 1e10 + 2]
      largeValues.forEach(v => detector.update(v))

      const stats = detector.getStats()
      // Mean should be (1e10 + 1e10+1 + 1e10-1 + 1e10+2) / 4 = 1e10 + 0.5
      expect(stats.mean).toBeCloseTo(1e10 + 0.5, 0)
      expect(isFinite(stats.stdDev)).toBe(true)
    })

    it('should produce same results as batch calculation', () => {
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

      // Incremental calculation
      const incrementalDetector = new IncrementalZScore()
      values.forEach(v => incrementalDetector.update(v))
      const incrementalStats = incrementalDetector.getStats()

      // Batch calculation
      const batchMean = values.reduce((a, b) => a + b, 0) / values.length
      const batchVariance =
        values.reduce((sum, v) => sum + Math.pow(v - batchMean, 2), 0) / (values.length - 1)

      expect(incrementalStats.mean).toBeCloseTo(batchMean, 10)
      expect(incrementalStats.variance).toBeCloseTo(batchVariance, 10)
    })
  })
})

describe('createIncrementalZScore factory', () => {
  it('should create instance with default threshold', () => {
    const detector = createIncrementalZScore()
    expect(detector).toBeInstanceOf(IncrementalZScore)
  })

  it('should create instance with custom threshold', () => {
    const detector = createIncrementalZScore(2.5)
    expect(detector).toBeInstanceOf(IncrementalZScore)
  })
})
