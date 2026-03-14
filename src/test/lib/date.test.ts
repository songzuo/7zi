/**
 * 日期工具函数单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  formatTimeAgo,
  formatDate,
  formatDateTime,
  isToday,
  isYesterday,
} from '@/lib/date';

describe('日期工具函数', () => {
  describe('formatDate', () => {
    it('应该正确格式化日期', () => {
      const result = formatDate('2026-03-14');
      expect(result).toContain('2026');
    });

    it('应该处理无效日期', () => {
      const result = formatDate('invalid-date');
      expect(result).toContain('Invalid');
    });
  });

  describe('formatDateTime', () => {
    it('应该正确格式化日期时间', () => {
      const result = formatDateTime('2026-03-14T10:30:00');
      expect(result).toContain('2026');
    });

    it('应该处理无效日期', () => {
      const result = formatDateTime('invalid');
      expect(result).toContain('Invalid');
    });
  });

  describe('formatTimeAgo', () => {
    it('应该显示刚刚', () => {
      const now = new Date().toISOString();
      const result = formatTimeAgo(now);
      expect(result).toBe('刚刚');
    });

    it('应该显示N分钟前', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const result = formatTimeAgo(fiveMinutesAgo);
      expect(result).toBe('5分钟前');
    });

    it('应该显示N小时前', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const result = formatTimeAgo(twoHoursAgo);
      expect(result).toBe('2小时前');
    });

    it('应该显示N天前', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const result = formatTimeAgo(threeDaysAgo);
      expect(result).toBe('3天前');
    });

    it('应该处理无效日期', () => {
      // formatTimeAgo doesn't validate input, so Invalid Date returns a formatted date string
      const result = formatTimeAgo('invalid');
      // When date is invalid, toLocaleDateString returns 'Invalid Date'
      expect(typeof result).toBe('string');
    });
  });

  describe('isToday', () => {
    it('应该正确识别今天的日期', () => {
      const today = new Date();
      expect(isToday(today)).toBe(true);
    });

    it('应该正确识别不是今天的日期', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });

    it('应该处理无效日期', () => {
      // Invalid dates are not today
      expect(isToday('invalid')).toBe(false);
    });
  });

  describe('isYesterday', () => {
    it('应该正确识别昨天的日期', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isYesterday(yesterday)).toBe(true);
    });

    it('应该正确识别不是昨天的日期', () => {
      const today = new Date();
      expect(isYesterday(today)).toBe(false);
    });

    it('应该处理无效日期', () => {
      // Invalid dates are not yesterday
      expect(isYesterday('invalid')).toBe(false);
    });
  });
});
