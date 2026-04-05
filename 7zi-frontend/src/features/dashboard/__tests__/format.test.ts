/**
 * Dashboard Utility Functions Tests
 * 数据可视化仪表板工具函数测试
 */

import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatBytes,
  formatPercentage,
  formatDuration,
  formatTimestamp,
  formatRelativeTime,
  calculateChangeRate,
  calculateMovingAverage,
  calculatePercentile,
  generateColor,
  debounce,
  throttle,
} from '../utils/format';

describe('formatNumber', () => {
  it('should format basic numbers', () => {
    expect(formatNumber(1234.5678)).toBe('1,235');
    expect(formatNumber(1000000)).toBe('1,000,000');
  });

  it('should format with custom decimals', () => {
    expect(formatNumber(1234.5678, { decimals: 0 })).toBe('1,235');
    expect(formatNumber(1234.5678, { decimals: 3 })).toBe('1,234.568');
  });

  it('should format in compact notation', () => {
    expect(formatNumber(1234567, { compact: true })).toBe('123万');
    expect(formatNumber(1234, { compact: true })).toBe('1234');
  });

  it('should handle zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('should handle negative numbers', () => {
    expect(formatNumber(-1234.56)).toBe('-1,235');
  });
});

describe('formatBytes', () => {
  it('should format bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1 TB');
  });

  it('should format with custom decimals', () => {
    expect(formatBytes(1536, 0)).toBe('2 KB');
    expect(formatBytes(1536, 4)).toBe('1.5 KB');
  });

  it('should handle large values', () => {
    expect(formatBytes(1234567890123)).toBe('1.12 TB');
  });
});

describe('formatPercentage', () => {
  it('should format percentage', () => {
    expect(formatPercentage(50.123)).toBe('50.1%');
    expect(formatPercentage(95.5678)).toBe('95.6%');
  });

  it('should handle edge cases', () => {
    expect(formatPercentage(0)).toBe('0.0%');
    expect(formatPercentage(100)).toBe('100.0%');
  });
});

describe('formatDuration', () => {
  it('should format seconds', () => {
    expect(formatDuration(30)).toBe('30.0s');
    expect(formatDuration(59.9)).toBe('59.9s');
  });

  it('should format minutes', () => {
    expect(formatDuration(60)).toBe('1m 0s');
    expect(formatDuration(90)).toBe('1m 30s');
    expect(formatDuration(120)).toBe('2m 0s');
  });

  it('should format hours', () => {
    expect(formatDuration(3600)).toBe('1h 0m');
    expect(formatDuration(3660)).toBe('1h 1m');
    expect(formatDuration(7200)).toBe('2h 0m');
  });
});

describe('formatTimestamp', () => {
  it('should format timestamp in full format', () => {
    const timestamp = 1609459200; // 2021-01-01 00:00:00
    const result = formatTimestamp(timestamp, 'full');
    expect(result).toContain('2021');
    expect(result).toContain('01');
  });

  it('should format timestamp in short format', () => {
    const timestamp = 1609459200;
    const result = formatTimestamp(timestamp, 'short');
    expect(result).toBeTruthy();
  });

  it('should format timestamp in time format', () => {
    const timestamp = 1609459200;
    const result = formatTimestamp(timestamp, 'time');
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

describe('formatRelativeTime', () => {
  it('should format relative time for recent events', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(formatRelativeTime(now - 30)).toBe('刚刚');
    expect(formatRelativeTime(now - 120)).toBe('2分钟前');
  });

  it('should format relative time for hours ago', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(formatRelativeTime(now - 3600)).toBe('1小时前');
    expect(formatRelativeTime(now - 7200)).toBe('2小时前');
  });

  it('should format relative time for days ago', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(formatRelativeTime(now - 86400)).toBe('1天前');
    expect(formatRelativeTime(now - 172800)).toBe('2天前');
  });

  it('should format relative time for older events', () => {
    const timestamp = 1609459200;
    const result = formatRelativeTime(timestamp);
    expect(result).toBeTruthy();
  });
});

describe('calculateChangeRate', () => {
  it('should calculate increase', () => {
    const result = calculateChangeRate(150, 100);
    expect(result.value).toBe(50);
    expect(result.type).toBe('increase');
  });

  it('should calculate decrease', () => {
    const result = calculateChangeRate(80, 100);
    expect(result.value).toBe(20);
    expect(result.type).toBe('decrease');
  });

  it('should calculate no change', () => {
    const result = calculateChangeRate(100, 100);
    expect(result.value).toBe(0);
    expect(result.type).toBe('neutral');
  });

  it('should handle zero previous value', () => {
    const result = calculateChangeRate(100, 0);
    expect(result.value).toBe(0);
    expect(result.type).toBe('neutral');
  });

  it('should handle negative values', () => {
    const result = calculateChangeRate(-50, -100);
    expect(result.value).toBe(50);
    expect(result.type).toBe('decrease');
  });
});

describe('calculateMovingAverage', () => {
  it('should calculate moving average', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = calculateMovingAverage(data, 3);
    expect(result).toHaveLength(10);
    expect(result[0]).toBe(1);
    expect(result[2]).toBe(2); // (1+2+3)/3
    expect(result[9]).toBe(9); // (8+9+10)/3
  });

  it('should handle window size larger than data', () => {
    const data = [1, 2, 3];
    const result = calculateMovingAverage(data, 10);
    expect(result).toEqual(data);
  });

  it('should handle empty array', () => {
    const result = calculateMovingAverage([], 3);
    expect(result).toEqual([]);
  });

  it('should handle window size of 1', () => {
    const data = [1, 2, 3, 4, 5];
    const result = calculateMovingAverage(data, 1);
    expect(result).toEqual(data);
  });
});

describe('calculatePercentile', () => {
  it('should calculate median (p50)', () => {
    const data = [1, 2, 3, 4, 5];
    const result = calculatePercentile(data, 50);
    expect(result).toBe(3);
  });

  it('should calculate p90', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = calculatePercentile(data, 90);
    expect(result).toBe(9.1);
  });

  it('should calculate p99', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = calculatePercentile(data, 99);
    expect(result).toBe(9.91);
  });

  it('should handle empty array', () => {
    const result = calculatePercentile([], 50);
    expect(result).toBe(0);
  });

  it('should handle single element', () => {
    const result = calculatePercentile([5], 50);
    expect(result).toBe(5);
  });

  it('should handle percentile 0 and 100', () => {
    const data = [1, 2, 3, 4, 5];
    expect(calculatePercentile(data, 0)).toBe(1);
    expect(calculatePercentile(data, 100)).toBe(5);
  });
});

describe('generateColor', () => {
  it('should generate colors from predefined palette', () => {
    expect(generateColor(0)).toBe('#3b82f6');
    expect(generateColor(1)).toBe('#10b981');
    expect(generateColor(2)).toBe('#f59e0b');
  });

  it('should cycle through palette', () => {
    expect(generateColor(8)).toBe('#3b82f6'); // Should cycle back
  });

  it('should generate colors with alpha', () => {
    expect(generateColor(0, 0.5)).toBe('rgba(59, 130, 246, 0.5)');
  });

  it('should handle full alpha', () => {
    expect(generateColor(0, 1)).toBe('#3b82f6');
  });
});