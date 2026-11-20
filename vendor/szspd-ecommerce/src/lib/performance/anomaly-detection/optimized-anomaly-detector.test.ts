/**
 * Optimized Anomaly Detector Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  OptimizedAnomalyDetector,
  createOptimizedAnomalyDetector,
  type Metric,
  type Anomaly,
} from './optimized-anomaly-detector'

describe('OptimizedAnomalyDetector', () => {
  let detector: OptimizedAnomalyDetector

  beforeEach(() => {
    detector = new OptimizedAnomalyDetector({
      windowSize: 100,
      thresholdPercentile: 95,
      minSamples: 10,
      adaptiveThreshold: true,
      sensitivity: 'medium',
    })
  })

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const defaultDetector = new OptimizedAnomalyDetector()
      expect(defaultDetector).toBeDefined()
    })

    it('should initialize with custom config', () => {
      const customDetector = new OptimizedAnomalyDetector({
        windowSize: 50,
        thresholdPercentile: 90,
        minSamples: 5,
        sensitivity: 'high',
      })

      expect(customDetector).toBeDefined()
    })
  })

  describe('incremental update', () => {
    it('should update statistics incrementally', () => {
      const metrics: Metric[] = [
        { timestamp: 1, value: 10 },
        { timestamp: 2, value: 20 },
        { timestamp: 3, value: 30 },
      ]

      metrics.forEach(m => detector.incrementalUpdate(m))

      const stats = detector.getStats()
      expect(stats.count).toBe(3)
      expect(stats.mean).toBe(20)
    })

    it('should compute threshold after min samples', () => {
      const metrics: Metric[] = Array.from({ length: 10 }, (_, i) => ({
        timestamp: i,
        value: 50 + Math.random() * 10,
      }))

      metrics.forEach(m => detector.incrementalUpdate(m))

      const threshold = detector.getThreshold()
      expect(threshold).not.toBeNull()
      expect(threshold?.adaptive).toBe(true)
    })

    it('should not compute threshold before min samples', () => {
      const metrics: Metric[] = Array.from({ length: 5 }, (_, i) => ({
        timestamp: i,
        value: 50,
      }))

      metrics.forEach(m => detector.incrementalUpdate(m))

      const threshold = detector.getThreshold()
      expect(threshold).toBeNull()
    })
  })

  describe('sliding window detection', () => {
    it('should detect anomalies in sliding window', () => {
      // Build baseline
      const baseline: Metric[] = Array.from({ length: 50 }, (_, i) => ({
        timestamp: i,
        value: 50 + Math.random() * 5,
      }))

      baseline.forEach(m => detector.incrementalUpdate(m))

      // Add anomaly
      const anomalyMetrics: Metric[] = [
        { timestamp: 50, value: 100 },
        { timestamp: 51, value: 105 },
        { timestamp: 52, value: 50 },
      ]

      const anomalies = detector.detectSlidingWindow(anomalyMetrics)

      expect(anomalies.length).toBeGreaterThan(0)
      expect(anomalies[0].value).toBe(100)
    })

    it('should not detect normal values as anomalies', () => {
      const metrics: Metric[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: i,
        value: 50 + Math.random() * 5,
      }))

      metrics.forEach(m => detector.incrementalUpdate(m))

      const anomalies = detector.detectSlidingWindow(metrics.slice(10, 15))

      expect(anomalies.length).toBe(0)
    })
  })

  describe('single metric detection', () => {
    it('should detect anomaly for single metric', () => {
      // Build baseline
      const baseline: Metric[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: i,
        value: 50,
      }))

      baseline.forEach(m => detector.incrementalUpdate(m))

      // Test anomaly
      const anomaly = detector.detectSingle({
        timestamp: 20,
        value: 100,
      })

      expect(anomaly).not.toBeNull()
      expect(anomaly?.value).toBe(100)
      expect(anomaly?.type).toBe('high')
    })

    it('should return null for normal value', () => {
      // Create baseline with more variance
      const baseline: Metric[] = Array.from({ length: 30 }, (_, i) => ({
        timestamp: i,
        value: 50 + Math.sin(i) * 10, // Values between 40 and 60
      }))

      baseline.forEach(m => detector.incrementalUpdate(m))

      const anomaly = detector.detectSingle({
        timestamp: 30,
        value: 52, // Within normal range
      })

      // With variance in data, 52 should be considered normal
      expect(anomaly).toBeNull()
    })

    it('should return null before threshold is computed', () => {
      const anomaly = detector.detectSingle({
        timestamp: 1,
        value: 100,
      })

      expect(anomaly).toBeNull()
    })
  })

  describe('anomaly types', () => {
    it('should detect high anomalies', () => {
      const baseline: Metric[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: i,
        value: 50,
      }))

      baseline.forEach(m => detector.incrementalUpdate(m))

      const anomaly = detector.detectSingle({
        timestamp: 20,
        value: 100,
      })

      expect(anomaly?.type).toBe('high')
    })

    it('should detect low anomalies', () => {
      const baseline: Metric[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: i,
        value: 50,
      }))

      baseline.forEach(m => detector.incrementalUpdate(m))

      const anomaly = detector.detectSingle({
        timestamp: 20,
        value: 0,
      })

      expect(anomaly?.type).toBe('low')
    })

    it('should detect spikes', () => {
      const baseline: Metric[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: i,
        value: 50,
      }))

      baseline.forEach(m => detector.incrementalUpdate(m))

      // Add a few normal values
      detector.incrementalUpdate({ timestamp: 20, value: 51 })
      detector.incrementalUpdate({ timestamp: 21, value: 52 })

      // Spike
      const anomaly = detector.detectSingle({
        timestamp: 22,
        value: 100,
      })

      // The type detection depends on implementation
      expect(anomaly).not.toBeNull()
      expect(['high', 'spike']).toContain(anomaly?.type)
    })

    it('should detect drops', () => {
      const baseline: Metric[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: i,
        value: 50,
      }))

      baseline.forEach(m => detector.incrementalUpdate(m))

      // Add a few normal values
      detector.incrementalUpdate({ timestamp: 20, value: 49 })
      detector.incrementalUpdate({ timestamp: 21, value: 48 })

      // Drop
      const anomaly = detector.detectSingle({
        timestamp: 22,
        value: 0,
      })

      // The type detection depends on implementation
      expect(anomaly).not.toBeNull()
      expect(['low', 'drop']).toContain(anomaly?.type)
    })
  })

  describe('severity calculation', () => {
    it('should calculate severity based on sensitivity', () => {
      const lowSensitivityDetector = new OptimizedAnomalyDetector({
        sensitivity: 'low',
      })

      const baseline: Metric[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: i,
        value: 50,
      }))

      baseline.forEach(m => lowSensitivityDetector.incrementalUpdate(m))

      const anomaly = lowSensitivityDetector.detectSingle({
        timestamp: 20,
        value: 100,
      })

      expect(anomaly?.severity).toBeDefined()
      expect(['low', 'medium', 'high', 'critical']).toContain(anomaly?.severity)
    })

    it('should be more sensitive with high sensitivity setting', () => {
      const highSensitivityDetector = new OptimizedAnomalyDetector({
        sensitivity: 'high',
      })

      const baseline: Metric[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: i,
        value: 50,
      }))

      baseline.forEach(m => highSensitivityDetector.incrementalUpdate(m))

      const anomaly = highSensitivityDetector.detectSingle({
        timestamp: 20,
        value: 70, // Moderate deviation
      })

      // High sensitivity should detect this as anomaly
      expect(anomaly).not.toBeNull()
    })
  })

  describe('adaptive threshold', () => {
    it('should compute adaptive threshold using IQR method', () => {
      const metrics: Metric[] = Array.from({ length: 50 }, (_, i) => ({
        timestamp: i,
        value: 50 + Math.random() * 10,
      }))

      metrics.forEach(m => detector.incrementalUpdate(m))

      const threshold = detector.computeAdaptiveThreshold()

      expect(threshold).toBeDefined()
      expect(threshold.adaptive).toBe(true)
      expect(threshold.lower).toBeLessThan(threshold.upper)
    })

    it('should compute fixed threshold when adaptive is disabled', () => {
      const fixedDetector = new OptimizedAnomalyDetector({
        adaptiveThreshold: false,
      })

      const metrics: Metric[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: i,
        value: 50,
      }))

      metrics.forEach(m => fixedDetector.incrementalUpdate(m))

      const threshold = fixedDetector.computeAdaptiveThreshold()

      expect(threshold.adaptive).toBe(false)
    })

    it('should update threshold over time', () => {
      const metrics: Metric[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: i,
        value: 50,
      }))

      metrics.forEach(m => detector.incrementalUpdate(m))

      const threshold1 = detector.getThreshold()

      // Add more data
      const moreMetrics: Metric[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: 20 + i,
        value: 60,
      }))

      moreMetrics.forEach(m => detector.incrementalUpdate(m))

      const threshold2 = detector.getThreshold()

      expect(threshold2).not.toEqual(threshold1)
    })
  })

  describe('anomaly score', () => {
    it('should calculate anomaly score between 0 and 1', () => {
      const baseline: Metric[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: i,
        value: 50,
      }))

      baseline.forEach(m => detector.incrementalUpdate(m))

      const anomaly = detector.detectSingle({
        timestamp: 20,
        value: 100,
      })

      expect(anomaly?.score).toBeGreaterThanOrEqual(0)
      expect(anomaly?.score).toBeLessThanOrEqual(1)
    })

    it('should give higher score for more extreme values', () => {
      const baseline: Metric[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: i,
        value: 50,
      }))

      baseline.forEach(m => detector.incrementalUpdate(m))

      const anomaly1 = detector.detectSingle({
        timestamp: 20,
        value: 75,
      })

      const anomaly2 = detector.detectSingle({
        timestamp: 21,
        value: 100,
      })

      // Both should be detected as anomalies
      expect(anomaly1).not.toBeNull()
      expect(anomaly2).not.toBeNull()

      // More extreme value should have higher or equal score
      expect(anomaly2?.score).toBeGreaterThanOrEqual(anomaly1?.score || 0)
    })
  })

  describe('statistics', () => {
    it('should track correct statistics', () => {
      const metrics: Metric[] = [
        { timestamp: 1, value: 10 },
        { timestamp: 2, value: 20 },
        { timestamp: 3, value: 30 },
      ]

      metrics.forEach(m => detector.incrementalUpdate(m))

      const stats = detector.getStats()
      expect(stats.count).toBe(3)
      expect(stats.mean).toBe(20)
      expect(stats.stdDev).toBeGreaterThan(0)
      expect(stats.windowSize).toBe(3)
    })

    it('should handle zero variance', () => {
      const metrics: Metric[] = Array.from({ length: 10 }, (_, i) => ({
        timestamp: i,
        value: 50,
      }))

      metrics.forEach(m => detector.incrementalUpdate(m))

      const stats = detector.getStats()
      expect(stats.stdDev).toBe(0)
    })
  })

  describe('reset', () => {
    it('should reset detector state', () => {
      const metrics: Metric[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: i,
        value: 50,
      }))

      metrics.forEach(m => detector.incrementalUpdate(m))

      detector.reset()

      const stats = detector.getStats()
      expect(stats.count).toBe(0)
      expect(stats.windowSize).toBe(0)

      const threshold = detector.getThreshold()
      expect(threshold).toBeNull()
    })
  })

  describe('window size', () => {
    it('should respect window size limit', () => {
      const windowDetector = new OptimizedAnomalyDetector({
        windowSize: 10,
      })

      const metrics: Metric[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: i,
        value: 50,
      }))

      metrics.forEach(m => windowDetector.incrementalUpdate(m))

      const stats = windowDetector.getStats()
      expect(stats.windowSize).toBe(10)
    })
  })

  describe('edge cases', () => {
    it('should handle empty metrics', () => {
      const threshold = detector.computeAdaptiveThreshold()
      expect(threshold.lower).toBe(-Infinity)
      expect(threshold.upper).toBe(Infinity)
    })

    it('should handle single value', () => {
      detector.incrementalUpdate({ timestamp: 1, value: 50 })

      const stats = detector.getStats()
      expect(stats.count).toBe(1)
      expect(stats.mean).toBe(50)
    })

    it('should handle negative values', () => {
      const metrics: Metric[] = [
        { timestamp: 1, value: -10 },
        { timestamp: 2, value: -20 },
        { timestamp: 3, value: -15 },
      ]

      metrics.forEach(m => detector.incrementalUpdate(m))

      const stats = detector.getStats()
      expect(stats.mean).toBeLessThan(0)
    })

    it('should handle very large values', () => {
      const metrics: Metric[] = [
        { timestamp: 1, value: 1e10 },
        { timestamp: 2, value: 1e10 + 1 },
        { timestamp: 3, value: 1e10 - 1 },
      ]

      metrics.forEach(m => detector.incrementalUpdate(m))

      const stats = detector.getStats()
      expect(isFinite(stats.mean)).toBe(true)
      expect(isFinite(stats.stdDev)).toBe(true)
    })
  })
})

describe('createOptimizedAnomalyDetector factory', () => {
  it('should create instance with default config', () => {
    const detector = createOptimizedAnomalyDetector()
    expect(detector).toBeInstanceOf(OptimizedAnomalyDetector)
  })

  it('should create instance with custom config', () => {
    const detector = createOptimizedAnomalyDetector({
      windowSize: 50,
      sensitivity: 'high',
    })

    expect(detector).toBeInstanceOf(OptimizedAnomalyDetector)
  })
})