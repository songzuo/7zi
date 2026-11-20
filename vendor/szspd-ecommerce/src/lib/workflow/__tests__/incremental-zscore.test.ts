/**
 * IncrementalZScore 单元测试
 */

import { describe, it, expect } from 'vitest'
import { IncrementalZScore } from '../incremental-zscore'

describe('IncrementalZScore', () => {
  it('应该正确初始化', () => {
    const zscore = new IncrementalZScore()
    const stats = zscore.getStats()

    expect(stats.count).toBe(0)
    expect(stats.mean).toBe(0)
    expect(stats.stdDev).toBe(0)
  })

  it('应该正确更新单个值', () => {
    const zscore = new IncrementalZScore()
    const result = zscore.update(10)

    expect(result.zScore).toBe(0) // 单个值无法计算标准差
    expect(result.isAnomaly).toBe(false)

    const stats = zscore.getStats()
    expect(stats.count).toBe(1)
    expect(stats.mean).toBe(10)
  })

  it('应该正确计算多个值的统计量', () => {
    const zscore = new IncrementalZScore()

    zscore.update(10)
    zscore.update(12)
    zscore.update(14)

    const stats = zscore.getStats()
    expect(stats.count).toBe(3)
    expect(stats.mean).toBe(12)
    expect(stats.stdDev).toBeCloseTo(2, 1)
  })

  it('应该正确检测异常值', () => {
    const zscore = new IncrementalZScore()

    // 添加正常值
    for (let i = 0; i < 10; i++) {
      zscore.update(10 + i * 0.1)
    }

    // 添加极端异常值
    const result = zscore.update(100)

    expect(result.isAnomaly).toBe(true)
    expect(result.zScore).toBeGreaterThan(3)
  })

  it('应该正确识别非异常值', () => {
    const zscore = new IncrementalZScore()

    // 添加正常值
    for (let i = 0; i < 10; i++) {
      zscore.update(10 + i * 0.1)
    }

    // 添加正常范围内的值
    const result = zscore.update(10.5)

    expect(result.isAnomaly).toBe(false)
    expect(Math.abs(result.zScore)).toBeLessThan(3)
  })

  it('应该正确重置', () => {
    const zscore = new IncrementalZScore()

    zscore.update(10)
    zscore.update(20)
    zscore.update(30)

    zscore.reset()

    const stats = zscore.getStats()
    expect(stats.count).toBe(0)
    expect(stats.mean).toBe(0)
    expect(stats.stdDev).toBe(0)
  })

  it('应该处理负数', () => {
    const zscore = new IncrementalZScore()

    zscore.update(-10)
    zscore.update(-12)
    zscore.update(-14)

    const stats = zscore.getStats()
    expect(stats.mean).toBe(-12)
    expect(stats.stdDev).toBeCloseTo(2, 1)
  })

  it('应该处理零值', () => {
    const zscore = new IncrementalZScore()

    zscore.update(0)
    zscore.update(0)
    zscore.update(0)

    const stats = zscore.getStats()
    expect(stats.mean).toBe(0)
    expect(stats.stdDev).toBe(0)
  })

  it('应该正确计算 Z-Score 方向', () => {
    const zscore = new IncrementalZScore()

    // 添加一组值
    zscore.update(0)
    zscore.update(10)
    zscore.update(20)

    // 高于均值的值应有正 Z-Score
    const result1 = zscore.update(15)
    expect(result1.zScore).toBeGreaterThan(0)

    // 低于均值的值应有负 Z-Score
    const result2 = zscore.update(5)
    expect(result2.zScore).toBeLessThan(0)
  })

  it('应该处理大量数据', () => {
    const zscore = new IncrementalZScore()

    // 添加 1000 个正常值
    for (let i = 0; i < 1000; i++) {
      zscore.update(10 + Math.random() * 2)
    }

    const stats = zscore.getStats()
    expect(stats.count).toBe(1000)
    expect(stats.mean).toBeGreaterThan(9)
    expect(stats.mean).toBeLessThan(12)

    // 添加异常值
    const result = zscore.update(100)
    expect(result.isAnomaly).toBe(true)
  })

  it('Welford 算法应该数值稳定', () => {
    const zscore = new IncrementalZScore()

    // 测试大数值场景
    for (let i = 0; i < 100; i++) {
      const result = zscore.update(1e6 + i)
      expect(Number.isFinite(result.zScore)).toBe(true)
    }

    const stats = zscore.getStats()
    expect(Number.isFinite(stats.mean)).toBe(true)
    expect(Number.isFinite(stats.stdDev)).toBe(true)
  })
})
