/**
 * @fileoverview 日期工具函数测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatTimeAgo,
  formatDate,
  formatDateTime,
  isToday,
  isYesterday,
} from '../../lib/date';

describe('formatTimeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "刚刚" for times less than 1 minute ago', () => {
    const now = new Date('2024-01-15T12:00:00');
    vi.setSystemTime(now);

    const date = new Date('2024-01-15T11:59:30');
    expect(formatTimeAgo(date)).toBe('刚刚');
  });

  it('returns minutes ago for times less than 1 hour ago', () => {
    const now = new Date('2024-01-15T12:00:00');
    vi.setSystemTime(now);

    const date = new Date('2024-01-15T11:30:00');
    expect(formatTimeAgo(date)).toBe('30分钟前');
  });

  it('returns hours ago for times less than 24 hours ago', () => {
    const now = new Date('2024-01-15T12:00:00');
    vi.setSystemTime(now);

    const date = new Date('2024-01-15T06:00:00');
    expect(formatTimeAgo(date)).toBe('6小时前');
  });

  it('returns days ago for times less than 7 days ago', () => {
    const now = new Date('2024-01-15T12:00:00');
    vi.setSystemTime(now);

    const date = new Date('2024-01-12T12:00:00');
    expect(formatTimeAgo(date)).toBe('3天前');
  });

  it('returns formatted date for times 7+ days ago', () => {
    const now = new Date('2024-01-15T12:00:00');
    vi.setSystemTime(now);

    const date = new Date('2024-01-01T12:00:00');
    const result = formatTimeAgo(date);
    // Should return a date string format
    expect(result).toMatch(/2024/);
  });

  it('accepts string date input', () => {
    const now = new Date('2024-01-15T12:00:00');
    vi.setSystemTime(now);

    const dateString = '2024-01-15T11:30:00';
    expect(formatTimeAgo(dateString)).toBe('30分钟前');
  });

  it('accepts Date object input', () => {
    const now = new Date('2024-01-15T12:00:00');
    vi.setSystemTime(now);

    const date = new Date('2024-01-15T11:30:00');
    expect(formatTimeAgo(date)).toBe('30分钟前');
  });

  it('handles 1 minute ago correctly', () => {
    const now = new Date('2024-01-15T12:00:00');
    vi.setSystemTime(now);

    const date = new Date('2024-01-15T11:59:00');
    expect(formatTimeAgo(date)).toBe('1分钟前');
  });

  it('handles 1 hour ago correctly', () => {
    const now = new Date('2024-01-15T12:00:00');
    vi.setSystemTime(now);

    const date = new Date('2024-01-15T11:00:00');
    expect(formatTimeAgo(date)).toBe('1小时前');
  });

  it('handles 1 day ago correctly', () => {
    const now = new Date('2024-01-15T12:00:00');
    vi.setSystemTime(now);

    const date = new Date('2024-01-14T12:00:00');
    expect(formatTimeAgo(date)).toBe('1天前');
  });
});

describe('formatDate', () => {
  it('formats date with default options', () => {
    const date = new Date('2024-01-15');
    const result = formatDate(date);
    expect(result).toMatch(/2024/);
  });

  it('formats date with custom options', () => {
    const date = new Date('2024-01-15');
    const result = formatDate(date, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    expect(result).toContain('2024');
  });

  it('accepts string date input', () => {
    const dateString = '2024-01-15';
    const result = formatDate(dateString);
    expect(result).toMatch(/2024/);
  });
});

describe('formatDateTime', () => {
  it('formats date and time', () => {
    const date = new Date('2024-01-15T14:30:00');
    const result = formatDateTime(date);
    expect(result).toMatch(/2024/);
    expect(result).toMatch(/14/);
    expect(result).toMatch(/30/);
  });

  it('accepts string date input', () => {
    const dateString = '2024-01-15T14:30:00';
    const result = formatDateTime(dateString);
    expect(result).toMatch(/2024/);
  });
});

describe('isToday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true for today', () => {
    const now = new Date('2024-01-15T12:00:00');
    vi.setSystemTime(now);

    const today = new Date('2024-01-15T08:00:00');
    expect(isToday(today)).toBe(true);
  });

  it('returns false for yesterday', () => {
    const now = new Date('2024-01-15T12:00:00');
    vi.setSystemTime(now);

    const yesterday = new Date('2024-01-14T12:00:00');
    expect(isToday(yesterday)).toBe(false);
  });

  it('returns false for tomorrow', () => {
    const now = new Date('2024-01-15T12:00:00');
    vi.setSystemTime(now);

    const tomorrow = new Date('2024-01-16T12:00:00');
    expect(isToday(tomorrow)).toBe(false);
  });

  it('accepts string date input', () => {
    const now = new Date('2024-01-15T12:00:00');
    vi.setSystemTime(now);

    expect(isToday('2024-01-15')).toBe(true);
    expect(isToday('2024-01-14')).toBe(false);
  });
});

describe('isYesterday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true for yesterday', () => {
    const now = new Date('2024-01-15T12:00:00');
    vi.setSystemTime(now);

    const yesterday = new Date('2024-01-14T12:00:00');
    expect(isYesterday(yesterday)).toBe(true);
  });

  it('returns false for today', () => {
    const now = new Date('2024-01-15T12:00:00');
    vi.setSystemTime(now);

    const today = new Date('2024-01-15T08:00:00');
    expect(isYesterday(today)).toBe(false);
  });

  it('returns false for two days ago', () => {
    const now = new Date('2024-01-15T12:00:00');
    vi.setSystemTime(now);

    const twoDaysAgo = new Date('2024-01-13T12:00:00');
    expect(isYesterday(twoDaysAgo)).toBe(false);
  });

  it('accepts string date input', () => {
    const now = new Date('2024-01-15T12:00:00');
    vi.setSystemTime(now);

    expect(isYesterday('2024-01-14')).toBe(true);
    expect(isYesterday('2024-01-15')).toBe(false);
  });
});
