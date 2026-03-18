/**
 * Unit tests for date.ts
 * @module lib/__tests__/date
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  formatTimeAgo,
  formatDate,
  formatDateTime,
  isToday,
  isYesterday,
} from '../date';

describe('formatTimeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return "刚刚" for time less than 1 minute ago', () => {
    const date = new Date('2024-01-01T11:59:30Z');
    expect(formatTimeAgo(date)).toBe('刚刚');
  });

  it('should return "X分钟前" for minutes ago', () => {
    expect(formatTimeAgo(new Date('2024-01-01T11:30:00Z'))).toBe('30分钟前');
    expect(formatTimeAgo(new Date('2024-01-01T11:00:00Z'))).toBe('60分钟前');
    expect(formatTimeAgo(new Date('2024-01-01T10:59:00Z'))).toBe('61分钟前');
  });

  it('should return "X小时前" for hours ago', () => {
    expect(formatTimeAgo(new Date('2024-01-01T06:00:00Z'))).toBe('6小时前');
    expect(formatTimeAgo(new Date('2024-01-01T00:00:00Z'))).toBe('12小时前');
    expect(formatTimeAgo(new Date('2023-12-31T12:00:00Z'))).toBe('24小时前');
  });

  it('should return "X天前" for days ago', () => {
    expect(formatTimeAgo(new Date('2023-12-31T12:00:00Z'))).toBe('1天前');
    expect(formatTimeAgo(new Date('2023-12-29T12:00:00Z'))).toBe('3天前');
    expect(formatTimeAgo(new Date('2023-12-25T12:00:00Z'))).toBe('7天前');
  });

  it('should return formatted date for older dates', () => {
    expect(formatTimeAgo(new Date('2023-12-25T12:00:00Z'))).toBe('7天前');
    expect(formatTimeAgo(new Date('2023-12-24T12:00:00Z'))).toBe('2023/12/24');
  });

  it('should handle string dates', () => {
    expect(formatTimeAgo('2024-01-01T11:00:00Z')).toBe('60分钟前');
    expect(formatTimeAgo('2024-01-01T06:00:00Z')).toBe('6小时前');
  });

  it('should handle Date objects', () => {
    const date = new Date('2024-01-01T11:00:00Z');
    expect(formatTimeAgo(date)).toBe('60分钟前');
  });

  it('should handle edge cases', () => {
    expect(formatTimeAgo(new Date())).toBe('刚刚');
    expect(formatTimeAgo('2024-01-01T11:59:59Z')).toBe('刚刚');
  });
});

describe('formatDate', () => {
  it('should format date with default options', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    expect(formatDate(date)).toMatch(/2024/);
    expect(formatDate(date)).toMatch(/01/);
    expect(formatDate(date)).toMatch(/15/);
  });

  it('should format string dates', () => {
    expect(formatDate('2024-01-15')).toMatch(/2024/);
  });

  it('should respect custom options', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    const result = formatDate(date, { year: 'numeric', month: 'long', day: 'numeric' });
    expect(result).toMatch(/2024/);
  });

  it('should handle different locales implicitly', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    expect(formatDate(date)).toBeTruthy();
  });
});

describe('formatDateTime', () => {
  it('should format date and time correctly', () => {
    const date = new Date('2024-01-15T14:30:00Z');
    const result = formatDateTime(date);
    expect(result).toContain('2024');
    expect(result).toContain('01');
    expect(result).toContain('15');
    expect(result).toMatch(/14:/);
  });

  it('should format string dates', () => {
    expect(formatDateTime('2024-01-15T14:30:00Z')).toContain('2024');
  });

  it('should handle different date formats', () => {
    const date1 = new Date('2024-12-31T23:59:59Z');
    const result1 = formatDateTime(date1);
    expect(result1).toContain('2024');
    expect(result1).toContain('12');
    expect(result1).toContain('31');
  });

  it('should handle early morning times', () => {
    const date = new Date('2024-01-15T00:00:00Z');
    const result = formatDateTime(date);
    expect(result).toMatch(/00:/);
  });

  it('should handle late night times', () => {
    const date = new Date('2024-01-15T23:59:00Z');
    const result = formatDateTime(date);
    expect(result).toMatch(/23:/);
  });
});

describe('isToday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 15, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return true for today', () => {
    expect(isToday(new Date(2024, 0, 15, 0, 0, 0))).toBe(true);
    expect(isToday(new Date(2024, 0, 15, 23, 59, 59))).toBe(true);
    expect(isToday(new Date(2024, 0, 15, 12, 0, 0))).toBe(true);
  });

  it('should return false for yesterday', () => {
    expect(isToday(new Date(2024, 0, 14, 12, 0, 0))).toBe(false);
  });

  it('should return false for tomorrow', () => {
    expect(isToday(new Date(2024, 0, 16, 12, 0, 0))).toBe(false);
  });

  it('should return false for distant dates', () => {
    expect(isToday(new Date(2023, 11, 31, 0, 0, 0))).toBe(false);
    expect(isToday(new Date(2025, 0, 1, 0, 0, 0))).toBe(false);
  });

  it('should handle string dates', () => {
    expect(isToday('2024-01-15T12:00:00Z')).toBe(true);
    expect(isToday('2024-01-14T12:00:00Z')).toBe(false);
  });

  it('should handle edge cases at midnight', () => {
    expect(isToday(new Date(2024, 0, 15, 0, 0, 0))).toBe(true);
    expect(isToday(new Date(2024, 0, 15, 23, 59, 59))).toBe(true);
  });
});

describe('isYesterday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Use local time for consistency - Jan 15, 2024 at noon local
    vi.setSystemTime(new Date(2024, 0, 15, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return true for yesterday', () => {
    // Use local Date constructor to match local timezone logic
    expect(isYesterday(new Date(2024, 0, 14, 0, 0, 0))).toBe(true);
    expect(isYesterday(new Date(2024, 0, 14, 23, 59, 59))).toBe(true);
    expect(isYesterday(new Date(2024, 0, 14, 12, 0, 0))).toBe(true);
  });

  it('should return false for today', () => {
    expect(isYesterday(new Date(2024, 0, 15, 12, 0, 0))).toBe(false);
  });

  it('should return false for the day before yesterday', () => {
    expect(isYesterday(new Date(2024, 0, 13, 12, 0, 0))).toBe(false);
  });

  it('should return false for tomorrow', () => {
    expect(isYesterday(new Date(2024, 0, 16, 12, 0, 0))).toBe(false);
  });

  it('should return false for distant dates', () => {
    expect(isYesterday(new Date(2024, 0, 1, 0, 0, 0))).toBe(false);
    expect(isYesterday(new Date(2024, 0, 31, 0, 0, 0))).toBe(false);
  });

  it('should handle string dates', () => {
    expect(isYesterday('2024-01-14T12:00:00Z')).toBe(true);
    expect(isYesterday('2024-01-15T12:00:00Z')).toBe(false);
  });

  it('should handle edge cases at month boundaries', () => {
    vi.setSystemTime(new Date('2024-02-01T12:00:00Z'));
    expect(isYesterday(new Date('2024-01-31T12:00:00Z'))).toBe(true);
    expect(isYesterday(new Date('2024-01-30T12:00:00Z'))).toBe(false);
  });

  it('should handle edge cases at year boundaries', () => {
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    expect(isYesterday(new Date('2023-12-31T12:00:00Z'))).toBe(true);
    expect(isYesterday(new Date('2023-12-30T12:00:00Z'))).toBe(false);
  });
});

describe('edge cases and error handling', () => {
  it('should handle invalid dates gracefully', () => {
    const invalidDate = new Date('invalid');
    expect(() => formatTimeAgo(invalidDate)).not.toThrow();
    expect(() => formatDate(invalidDate)).not.toThrow();
    expect(() => formatDateTime(invalidDate)).not.toThrow();
    expect(() => isToday(invalidDate)).not.toThrow();
    expect(() => isYesterday(invalidDate)).not.toThrow();
  });

  it('should handle extreme dates', () => {
    const pastDate = new Date('1970-01-01T00:00:00Z');
    const futureDate = new Date('2050-01-01T00:00:00Z');
    
    expect(() => formatTimeAgo(pastDate)).not.toThrow();
    expect(() => formatTimeAgo(futureDate)).not.toThrow();
    expect(() => formatDate(pastDate)).not.toThrow();
    expect(() => formatDate(futureDate)).not.toThrow();
  });

  it('should handle dates with different timezones', () => {
    const utcDate = new Date('2024-01-15T12:00:00Z');
    const result1 = formatDate(utcDate);
    const result2 = formatDateTime(utcDate);
    expect(result1).toBeTruthy();
    expect(result2).toBeTruthy();
  });
});
