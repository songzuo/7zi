/**
 * Analytics Metrics Tests
 */

import { describe, it, expect } from 'vitest'
import {
  generateWorkflowTrendData,
  generateNodePerformanceData,
  generateResourceUsageData,
  calculateOverviewMetrics,
  calculatePercentile,
  calculateAverage,
  detectAnomalies,
  calculateGrowthRate,
  formatDuration,
  formatPercentage,
  formatNumber,
} from '../metrics'

describe('Analytics Metrics', () => {
  describe('generateWorkflowTrendData', () => {
    it('should generate correct number of days', () => {
      const data = generateWorkflowTrendData(7)
      expect(data).toHaveLength(7)
    })

    it('should generate valid data structure', () => {
      const data = generateWorkflowTrendData(1)
      expect(data[0]).toHaveProperty('date')
      expect(data[0]).toHaveProperty('total')
      expect(data[0]).toHaveProperty('success')
      expect(data[0]).toHaveProperty('failed')
      expect(data[0]).toHaveProperty('avgDuration')
    })

    it('should have success + failed = total', () => {
      const data = generateWorkflowTrendData(1)
      expect(data[0].success + data[0].failed).toBe(data[0].total)
    })
  })

  describe('generateNodePerformanceData', () => {
    it('should generate data for all node types', () => {
      const data = generateNodePerformanceData()
      expect(data.length).toBeGreaterThan(0)
      expect(data[0]).toHaveProperty('nodeType')
      expect(data[0]).toHaveProperty('avgExecutionTime')
      expect(data[0]).toHaveProperty('successRate')
      expect(data[0]).toHaveProperty('p50')
      expect(data[0]).toHaveProperty('p95')
      expect(data[0]).toHaveProperty('p99')
      expect(data[0]).toHaveProperty('errorTypes')
    })

    it('should have p50 <= p95 <= p99', () => {
      const data = generateNodePerformanceData()
      data.forEach(node => {
        expect(node.p50).toBeLessThanOrEqual(node.p95)
        expect(node.p95).toBeLessThanOrEqual(node.p99)
      })
    })
  })

  describe('generateResourceUsageData', () => {
    it('should generate correct number of hours', () => {
      const data = generateResourceUsageData(24)
      expect(data).toHaveLength(24)
    })

    it('should generate valid data structure', () => {
      const data = generateResourceUsageData(1)
      expect(data[0]).toHaveProperty('timestamp')
      expect(data[0]).toHaveProperty('cpuUsage')
      expect(data[0]).toHaveProperty('memoryUsage')
      expect(data[0]).toHaveProperty('diskUsage')
      expect(data[0]).toHaveProperty('networkUsage')
    })

    it('should have usage values between 0 and 100', () => {
      const data = generateResourceUsageData(1)
      expect(data[0].cpuUsage).toBeGreaterThanOrEqual(0)
      expect(data[0].cpuUsage).toBeLessThanOrEqual(100)
      expect(data[0].memoryUsage).toBeGreaterThanOrEqual(0)
      expect(data[0].memoryUsage).toBeLessThanOrEqual(100)
    })
  })

  describe('calculateOverviewMetrics', () => {
    it('should calculate correct overview metrics', () => {
      const trends = generateWorkflowTrendData(7)
      const metrics = calculateOverviewMetrics(trends, 12)

      expect(metrics).toHaveProperty('totalExecutions')
      expect(metrics).toHaveProperty('successRate')
      expect(metrics).toHaveProperty('avgExecutionTime')
      expect(metrics).toHaveProperty('activeWorkflows')
      expect(metrics).toHaveProperty('failedCount')
      expect(metrics).toHaveProperty('todayExecutions')
      expect(metrics).toHaveProperty('lastUpdated')
    })

    it('should calculate success rate correctly', () => {
      const trends = [
        { date: '2024-01-01', total: 100, success: 90, failed: 10, avgDuration: 5000 },
      ]
      const metrics = calculateOverviewMetrics(trends, 5)

      expect(metrics.successRate).toBe(90)
      expect(metrics.totalExecutions).toBe(100)
      expect(metrics.failedCount).toBe(10)
    })

    it('should handle empty trends', () => {
      const metrics = calculateOverviewMetrics([], 0)

      expect(metrics.totalExecutions).toBe(0)
      expect(metrics.successRate).toBe(0)
      expect(metrics.avgExecutionTime).toBe(0)
    })
  })

  describe('calculatePercentile', () => {
    it('should calculate correct percentile', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      expect(calculatePercentile(values, 50)).toBe(5)
      expect(calculatePercentile(values, 90)).toBe(9)
      expect(calculatePercentile(values, 95)).toBe(10)
    })

    it('should handle empty array', () => {
      expect(calculatePercentile([], 50)).toBe(0)
    })

    it('should handle single value', () => {
      expect(calculatePercentile([5], 50)).toBe(5)
    })
  })

  describe('calculateAverage', () => {
    it('should calculate correct average', () => {
      expect(calculateAverage([1, 2, 3, 4, 5])).toBe(3)
      expect(calculateAverage([10, 20, 30])).toBe(20)
    })

    it('should handle empty array', () => {
      expect(calculateAverage([])).toBe(0)
    })

    it('should handle negative values', () => {
      expect(calculateAverage([-1, 0, 1])).toBe(0)
    })
  })

  describe('detectAnomalies', () => {
    it('should detect anomalies above threshold', () => {
      const data = [1, 2, 3, 4, 5, 100] // 100 is an anomaly
      const anomalies = detectAnomalies(data, 2)

      expect(anomalies.length).toBeGreaterThan(0)
      expect(anomalies[0].value).toBe(100)
    })

    it('should not detect anomalies in normal data', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const anomalies = detectAnomalies(data, 2)

      expect(anomalies.length).toBe(0)
    })

    it('should handle empty array', () => {
      const anomalies = detectAnomalies([], 2)
      expect(anomalies.length).toBe(0)
    })

    it('should handle single value', () => {
      const anomalies = detectAnomalies([5], 2)
      expect(anomalies.length).toBe(0)
    })
  })

  describe('calculateGrowthRate', () => {
    it('should calculate positive growth', () => {
      expect(calculateGrowthRate(120, 100)).toBe(20)
    })

    it('should calculate negative growth', () => {
      expect(calculateGrowthRate(80, 100)).toBe(-20)
    })

    it('should handle zero previous value', () => {
      expect(calculateGrowthRate(100, 0)).toBe(0)
    })

    it('should handle equal values', () => {
      expect(calculateGrowthRate(100, 100)).toBe(0)
    })
  })

  describe('formatDuration', () => {
    it('should format seconds', () => {
      expect(formatDuration(1000)).toBe('1s')
      expect(formatDuration(5000)).toBe('5s')
    })

    it('should format minutes', () => {
      expect(formatDuration(60000)).toBe('1m 0s')
      expect(formatDuration(125000)).toBe('2m 5s')
    })

    it('should format hours', () => {
      expect(formatDuration(3600000)).toBe('1h 0m')
      expect(formatDuration(3665000)).toBe('1h 1m')
    })

    it('should handle zero', () => {
      expect(formatDuration(0)).toBe('0s')
    })
  })

  describe('formatPercentage', () => {
    it('should format percentage', () => {
      expect(formatPercentage(95.5)).toBe('95.5%')
      expect(formatPercentage(100)).toBe('100.0%')
    })

    it('should handle decimals', () => {
      expect(formatPercentage(95.567, 2)).toBe('95.57%')
      expect(formatPercentage(95.567, 0)).toBe('96%')
    })

    it('should handle zero', () => {
      expect(formatPercentage(0)).toBe('0.0%')
    })
  })

  describe('formatNumber', () => {
    it('should format number with commas', () => {
      expect(formatNumber(1000)).toBe('1,000')
      expect(formatNumber(1000000)).toBe('1,000,000')
      expect(formatNumber(1234567.89)).toBe('1,234,567.89')
    })

    it('should handle small numbers', () => {
      expect(formatNumber(100)).toBe('100')
      expect(formatNumber(0)).toBe('0')
    })
  })
})