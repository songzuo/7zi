/**
 * @fileoverview Tests for format utilities
 */

import { describe, it, expect } from 'vitest'
import { formatFileSize, formatNumber } from '../format'

describe('format', () => {
  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0.0 B')
      expect(formatFileSize(512)).toBe('512.0 B')
      expect(formatFileSize(1023)).toBe('1023.0 B')
    })

    it('should format kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB')
      expect(formatFileSize(1536)).toBe('1.5 KB')
      expect(formatFileSize(1024 * 1024 - 1)).toBe('1024.0 KB')
    })

    it('should format megabytes correctly', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB')
      expect(formatFileSize(1024 * 1024 * 1.5)).toBe('1.5 MB')
    })

    it('should format gigabytes correctly', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB')
      expect(formatFileSize(1024 * 1024 * 1024 * 2.5)).toBe('2.5 GB')
    })

    it('should format terabytes correctly', () => {
      expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe('1.0 TB')
    })

    it('should format petabytes correctly', () => {
      expect(formatFileSize(1024 * 1024 * 1024 * 1024 * 1024)).toBe('1.0 PB')
    })

    it('should handle custom decimal places', () => {
      expect(formatFileSize(1536, 0)).toBe('2 KB')
      expect(formatFileSize(1536, 1)).toBe('1.5 KB')
      expect(formatFileSize(1536, 2)).toBe('1.50 KB')
      expect(formatFileSize(1536, 3)).toBe('1.500 KB')
    })

    it('should handle NaN', () => {
      expect(formatFileSize(NaN)).toBe('NaN B')
    })

    it('should handle Infinity', () => {
      expect(formatFileSize(Infinity)).toBe('Infinity B')
      expect(formatFileSize(-Infinity)).toBe('Infinity B')
    })

    it('should handle negative numbers', () => {
      // formatFileSize returns NaN for negative numbers due to Math.log behavior
      expect(formatFileSize(-1024)).toBe('NaN undefined')
    })
  })

  describe('formatNumber', () => {
    it('should format numbers with default comma separator', () => {
      expect(formatNumber(0)).toBe('0')
      expect(formatNumber(1)).toBe('1')
      expect(formatNumber(999)).toBe('999')
    })

    it('should add thousands separators', () => {
      expect(formatNumber(1000)).toBe('1,000')
      expect(formatNumber(10000)).toBe('10,000')
      expect(formatNumber(100000)).toBe('100,000')
      expect(formatNumber(1000000)).toBe('1,000,000')
      expect(formatNumber(10000000)).toBe('10,000,000')
    })

    it('should format large numbers', () => {
      expect(formatNumber(1000000000)).toBe('1,000,000,000')
      expect(formatNumber(1000000000000)).toBe('1,000,000,000,000')
    })

    it('should handle custom separator', () => {
      expect(formatNumber(1000000, '.')).toBe('1.000.000')
      expect(formatNumber(1000000, ' ')).toBe('1 000 000')
      expect(formatNumber(1000000, '_')).toBe('1_000_000')
    })

    it('should handle negative numbers', () => {
      expect(formatNumber(-1000)).toBe('-1,000')
      expect(formatNumber(-1000000)).toBe('-1,000,000')
    })

    it('should handle decimal numbers', () => {
      expect(formatNumber(1000.5)).toBe('1,000.5')
      expect(formatNumber(1000000.99)).toBe('1,000,000.99')
    })
  })
})
