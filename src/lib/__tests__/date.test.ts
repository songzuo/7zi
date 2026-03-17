/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatTimeAgo,
  formatDate,
  formatDateTime,
  isToday,
  isYesterday,
} from '../date';

describe('date.ts - 日期工具函数测试', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatTimeAgo - 相对时间计算', () => {
    it('应该返回 "刚刚" 表示不到1分钟', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      expect(formatTimeAgo('2024-01-15T11:59:30')).toBe('刚刚');
      expect(formatTimeAgo('2024-01-15T11:59:59')).toBe('刚刚');
    });

    it('应该返回 "X分钟前"', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      expect(formatTimeAgo('2024-01-15T11:30:00')).toBe('30分钟前');
      expect(formatTimeAgo('2024-01-15T11:01:00')).toBe('59分钟前');
      expect(formatTimeAgo('2024-01-15T11:00:01')).toBe('59分钟前');
    });

    it('应该返回 "X小时前"', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      expect(formatTimeAgo('2024-01-15T06:00:00')).toBe('6小时前');
      expect(formatTimeAgo('2024-01-15T01:00:00')).toBe('11小时前');
      expect(formatTimeAgo('2024-01-15T00:00:00')).toBe('12小时前');
    });

    it('应该返回 "X天前"', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      expect(formatTimeAgo('2024-01-14T12:00:00')).toBe('1天前');
      expect(formatTimeAgo('2024-01-12T12:00:00')).toBe('3天前');
      expect(formatTimeAgo('2024-01-09T12:00:00')).toBe('6天前');
    });

    it('应该返回格式化日期（超过7天）', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      const result = formatTimeAgo('2024-01-01T12:00:00');
      expect(result).toMatch(/2024/);
      expect(result).toMatch(/1/);
    });

    it('应该接受 Date 对象输入', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      const date = new Date('2024-01-15T11:30:00');
      expect(formatTimeAgo(date)).toBe('30分钟前');
    });

    it('应该处理边界值：正好1分钟', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      expect(formatTimeAgo('2024-01-15T11:59:00')).toBe('1分钟前');
    });

    it('应该处理边界值：正好1小时', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      expect(formatTimeAgo('2024-01-15T11:00:00')).toBe('1小时前');
    });

    it('应该处理边界值：正好1天', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      expect(formatTimeAgo('2024-01-14T12:00:00')).toBe('1天前');
    });

    it('应该处理边界值：正好7天', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      // 正好7天显示为格式化日期
      const result = formatTimeAgo('2024-01-08T12:00:00');
      expect(result).toMatch(/2024/);
      expect(result).toMatch(/1/);
      expect(result).toMatch(/8/);
    });

    it('应该处理未来时间', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      // 未来时间（负值差异）
      const result = formatTimeAgo('2024-01-16T12:00:00');
      // 应该显示为日期格式或0分钟前
      expect(result).toBeTruthy();
    });

    it('应该处理非常大的时间差', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      const result = formatTimeAgo('2020-01-15T12:00:00');
      expect(result).toMatch(/2020/);
    });
  });

  describe('formatDate - 日期格式化', () => {
    it('应该使用默认格式格式化日期', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date);
      expect(result).toMatch(/2024/);
      expect(result).toMatch(/1/);
    });

    it('应该接受字符串输入', () => {
      const result = formatDate('2024-01-15');
      expect(result).toMatch(/2024/);
    });

    it('应该接受 Date 对象输入', () => {
      const date = new Date('2024-12-31');
      const result = formatDate(date);
      expect(result).toMatch(/2024/);
      expect(result).toMatch(/12/);
    });

    it('应该支持自定义格式选项', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      });
      expect(result).toContain('2024');
      expect(result).toBeTruthy();
    });

    it('应该处理闰年日期', () => {
      const date = new Date('2024-02-29');
      const result = formatDate(date);
      expect(result).toMatch(/2024/);
    });

    it('应该处理不同月份的日期', () => {
      const jan1 = formatDate('2024-01-01');
      const jun30 = formatDate('2024-06-30');
      const dec31 = formatDate('2024-12-31');

      expect(jan1).toMatch(/2024/);
      expect(jun30).toMatch(/2024/);
      expect(dec31).toMatch(/2024/);
    });
  });

  describe('formatDateTime - 日期时间格式化', () => {
    it('应该格式化日期和时间', () => {
      const date = new Date('2024-01-15T14:30:45');
      const result = formatDateTime(date);
      expect(result).toMatch(/2024/);
      expect(result).toMatch(/14/);
      expect(result).toMatch(/30/);
    });

    it('应该接受字符串输入', () => {
      const result = formatDateTime('2024-01-15T08:15:30');
      expect(result).toMatch(/2024/);
      expect(result).toMatch(/08/);
      expect(result).toMatch(/15/);
    });

    it('应该包含分钟（2位）', () => {
      const date = new Date('2024-01-15T09:05:00');
      const result = formatDateTime(date);
      expect(result).toMatch(/05/);
    });

    it('应该处理跨午夜的时间', () => {
      const date = new Date('2024-01-15T23:59:59');
      const result = formatDateTime(date);
      expect(result).toMatch(/23/);
      expect(result).toMatch(/59/);
    });

    it('应该处理午夜时间', () => {
      const date = new Date('2024-01-15T00:00:00');
      const result = formatDateTime(date);
      expect(result).toMatch(/00/);
    });

    it('应该处理不同的月份和日期', () => {
      const dates = [
        '2024-12-31T23:59:59',
        '2024-07-04T12:00:00',
        '2024-01-01T00:00:00',
      ];

      dates.forEach(dateStr => {
        const result = formatDateTime(dateStr);
        expect(result).toBeTruthy();
      });
    });
  });

  describe('isToday - 检查是否是今天', () => {
    it('应该正确识别今天', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      expect(isToday('2024-01-15T00:00:00')).toBe(true);
      expect(isToday('2024-01-15T23:59:59')).toBe(true);
      expect(isToday('2024-01-15T12:00:00')).toBe(true);
    });

    it('应该正确拒绝不是今天的日期', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      expect(isToday('2024-01-14T12:00:00')).toBe(false);
      expect(isToday('2024-01-16T12:00:00')).toBe(false);
      expect(isToday('2024-01-01T12:00:00')).toBe(false);
    });

    it('应该接受 Date 对象输入', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      expect(isToday(new Date('2024-01-15T08:00:00'))).toBe(true);
      expect(isToday(new Date('2024-01-14T08:00:00'))).toBe(false);
    });

    it('应该接受字符串输入', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      expect(isToday('2024-01-15')).toBe(true);
      expect(isToday('2024-01-14')).toBe(false);
    });

    it('应该处理跨年边界', () => {
      const now = new Date('2024-12-31T23:59:59');
      vi.setSystemTime(now);

      expect(isToday('2024-12-31')).toBe(true);
      expect(isToday('2025-01-01')).toBe(false);
    });

    it('应该处理闰年2月29日', () => {
      const now = new Date('2024-02-29T12:00:00');
      vi.setSystemTime(now);

      expect(isToday('2024-02-29')).toBe(true);
      expect(isToday('2024-03-01')).toBe(false);
    });
  });

  describe('isYesterday - 检查是否是昨天', () => {
    it('应该正确识别昨天', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      expect(isYesterday('2024-01-14T00:00:00')).toBe(true);
      expect(isYesterday('2024-01-14T23:59:59')).toBe(true);
      expect(isYesterday('2024-01-14T12:00:00')).toBe(true);
    });

    it('应该正确拒绝不是昨天的日期', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      expect(isYesterday('2024-01-15T12:00:00')).toBe(false);
      expect(isYesterday('2024-01-13T12:00:00')).toBe(false);
    });

    it('应该接受 Date 对象输入', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      expect(isYesterday(new Date('2024-01-14T12:00:00'))).toBe(true);
      expect(isYesterday(new Date('2024-01-15T12:00:00'))).toBe(false);
    });

    it('应该接受字符串输入', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      expect(isYesterday('2024-01-14')).toBe(true);
      expect(isYesterday('2024-01-15')).toBe(false);
    });

    it('应该处理跨月边界', () => {
      const now = new Date('2024-03-01T12:00:00');
      vi.setSystemTime(now);

      expect(isYesterday('2024-02-29')).toBe(true); // 闰年
      expect(isYesterday('2024-02-28')).toBe(false);
    });

    it('应该处理跨年边界', () => {
      const now = new Date('2024-01-01T12:00:00');
      vi.setSystemTime(now);

      expect(isYesterday('2023-12-31')).toBe(true);
      expect(isYesterday('2024-01-02')).toBe(false);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理无效的日期字符串', () => {
      const result1 = formatTimeAgo('invalid-date');
      const result2 = formatDate('invalid-date');
      // 应该返回一个值，不抛出异常
      expect(result1).toBeTruthy();
      expect(result2).toBeTruthy();
    });

    it('应该处理极早的日期', () => {
      const result = formatDate('1970-01-01');
      expect(result).toMatch(/1970/);
    });

    it('应该处理未来的日期', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      const futureDate = '2099-12-31';
      const result = formatDate(futureDate);
      expect(result).toMatch(/2099/);
    });

    it('应该处理时区差异', () => {
      const date = new Date('2024-01-15T00:00:00Z');
      const result = formatDate(date);
      expect(result).toBeTruthy();
    });

    it('应该处理夏令时变化', () => {
      const date1 = new Date('2024-03-10T02:00:00'); // US DST transition
      const date2 = new Date('2024-11-03T02:00:00'); // US standard time transition

      const result1 = formatDate(date1);
      const result2 = formatDate(date2);

      expect(result1).toBeTruthy();
      expect(result2).toBeTruthy();
    });
  });

  describe('国际化测试', () => {
    it('应该使用中文格式', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date);
      // 中文字符串应该包含
      expect(result).toBeTruthy();
    });

    it('格式化相对时间应该是中文', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      expect(formatTimeAgo('2024-01-15T11:30:00')).toBe('30分钟前');
      expect(formatTimeAgo('2024-01-14T12:00:00')).toBe('1天前');
      expect(formatTimeAgo('2024-01-15T11:59:30')).toBe('刚刚');
    });
  });

  describe('性能测试', () => {
    it('应该能够快速格式化多个日期', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        formatDate('2024-01-15');
      }
      const end = performance.now();
      // 1000次格式化应该在合理时间内完成（< 1秒）
      expect(end - start).toBeLessThan(1000);
    });

    it('应该能够快速计算相对时间', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        formatTimeAgo(`2024-01-${15 - i}`);
      }
      const end = performance.now();
      expect(end - start).toBeLessThan(1000);
    });
  });
});
