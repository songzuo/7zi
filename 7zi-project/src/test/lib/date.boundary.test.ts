/**
 * @fileoverview date.ts 边界条件测试
 * @description 测试日期函数的极端输入、边界值、异常情况
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatTimeAgo,
  formatDate,
  formatDateTime,
  isToday,
  isYesterday,
} from '../../lib/date';

describe('date - 边界条件测试', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==================== formatTimeAgo 边界测试 ====================
  describe('formatTimeAgo 边界条件', () => {
    describe('时间边界值', () => {
      it('处理 0 秒前（同一毫秒）', () => {
        const now = new Date('2024-01-15T12:00:00.000');
        vi.setSystemTime(now);

        expect(formatTimeAgo(now)).toBe('刚刚');
      });

      it('处理 999 毫秒前（小于1秒）', () => {
        const now = new Date('2024-01-15T12:00:00.999');
        vi.setSystemTime(now);

        const date = new Date('2024-01-15T12:00:00.000');
        expect(formatTimeAgo(date)).toBe('刚刚');
      });

      it('处理 1 秒前（仍显示"刚刚"）', () => {
        const now = new Date('2024-01-15T12:00:01');
        vi.setSystemTime(now);

        const date = new Date('2024-01-15T12:00:00');
        expect(formatTimeAgo(date)).toBe('刚刚');
      });

      it('处理 59 秒前', () => {
        const now = new Date('2024-01-15T12:00:59');
        vi.setSystemTime(now);

        const date = new Date('2024-01-15T12:00:00');
        expect(formatTimeAgo(date)).toBe('刚刚');
      });

      it('处理 60 秒（1分钟）前', () => {
        const now = new Date('2024-01-15T12:01:00');
        vi.setSystemTime(now);

        const date = new Date('2024-01-15T12:00:00');
        expect(formatTimeAgo(date)).toBe('1分钟前');
      });

      it('处理 59 分钟 59 秒前', () => {
        const now = new Date('2024-01-15T12:59:59');
        vi.setSystemTime(now);

        const date = new Date('2024-01-15T12:00:00');
        expect(formatTimeAgo(date)).toBe('59分钟前');
      });

      it('处理 60 分钟（1小时）前', () => {
        const now = new Date('2024-01-15T13:00:00');
        vi.setSystemTime(now);

        const date = new Date('2024-01-15T12:00:00');
        expect(formatTimeAgo(date)).toBe('1小时前');
      });

      it('处理 23 小时 59 分钟前', () => {
        const now = new Date('2024-01-16T11:59:00');
        vi.setSystemTime(now);

        const date = new Date('2024-01-15T12:00:00');
        expect(formatTimeAgo(date)).toBe('23小时前');
      });

      it('处理 24 小时（1天）前', () => {
        const now = new Date('2024-01-16T12:00:00');
        vi.setSystemTime(now);

        const date = new Date('2024-01-15T12:00:00');
        expect(formatTimeAgo(date)).toBe('1天前');
      });

      it('处理 6 天 23 小时前', () => {
        const now = new Date('2024-01-22T11:00:00');
        vi.setSystemTime(now);

        const date = new Date('2024-01-15T12:00:00');
        expect(formatTimeAgo(date)).toBe('6天前');
      });

      it('处理刚好 7 天前', () => {
        const now = new Date('2024-01-22T12:00:00');
        vi.setSystemTime(now);

        const date = new Date('2024-01-15T12:00:00');
        const result = formatTimeAgo(date);
        expect(result).toMatch(/2024/);
      });

      it('处理 100 天前', () => {
        const now = new Date('2024-04-24T12:00:00');
        vi.setSystemTime(now);

        const date = new Date('2024-01-15T12:00:00');
        const result = formatTimeAgo(date);
        expect(result).toMatch(/2024/);
      });

      it('处理 1 年前', () => {
        const now = new Date('2025-01-15T12:00:00');
        vi.setSystemTime(now);

        const date = new Date('2024-01-15T12:00:00');
        const result = formatTimeAgo(date);
        expect(result).toMatch(/2024/);
      });

      it('处理 10 年前', () => {
        const now = new Date('2034-01-15T12:00:00');
        vi.setSystemTime(now);

        const date = new Date('2024-01-15T12:00:00');
        const result = formatTimeAgo(date);
        expect(result).toMatch(/2024/);
      });
    });

    describe('未来日期', () => {
      it('处理 1 秒后的日期', () => {
        const now = new Date('2024-01-15T12:00:00');
        vi.setSystemTime(now);

        const future = new Date('2024-01-15T12:00:01');
        const result = formatTimeAgo(future);
        // 未来日期会产生负数差值，floor 后是 -1
        expect(result).toBeDefined();
      });

      it('处理 1 天后的日期', () => {
        const now = new Date('2024-01-15T12:00:00');
        vi.setSystemTime(now);

        const future = new Date('2024-01-16T12:00:00');
        const result = formatTimeAgo(future);
        expect(result).toBeDefined();
      });

      it('处理 1 年后的日期', () => {
        const now = new Date('2024-01-15T12:00:00');
        vi.setSystemTime(now);

        const future = new Date('2025-01-15T12:00:00');
        const result = formatTimeAgo(future);
        expect(result).toBeDefined();
      });
    });

    describe('异常输入', () => {
      it('处理无效日期字符串', () => {
        const result = formatTimeAgo('invalid-date');
        expect(result).toBeDefined();
      });

      it('处理空字符串', () => {
        const result = formatTimeAgo('');
        expect(result).toBeDefined();
      });

      it('处理只有空格的字符串', () => {
        const result = formatTimeAgo('   ');
        expect(result).toBeDefined();
      });

      it('处理 Unix 时间戳字符串', () => {
        const result = formatTimeAgo('1705315800');
        expect(result).toBeDefined();
      });

      it('处理 ISO 8601 格式', () => {
        const now = new Date('2024-01-15T12:00:00');
        vi.setSystemTime(now);

        const isoDate = '2024-01-15T11:30:00.000Z';
        const result = formatTimeAgo(isoDate);
        expect(result).toBeDefined();
      });

      it('处理带时区的日期字符串', () => {
        const now = new Date('2024-01-15T12:00:00');
        vi.setSystemTime(now);

        const dateWithTz = '2024-01-15T11:30:00+08:00';
        const result = formatTimeAgo(dateWithTz);
        expect(result).toBeDefined();
      });

      it('处理简短日期格式 YYYY-MM-DD', () => {
        const now = new Date('2024-01-15T12:00:00');
        vi.setSystemTime(now);

        const shortDate = '2024-01-14';
        const result = formatTimeAgo(shortDate);
        expect(result).toBeDefined();
      });
    });
  });

  // ==================== formatDate 边界测试 ====================
  describe('formatDate 边界条件', () => {
    it('处理 Date 对象', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date);
      expect(result).toMatch(/2024/);
    });

    it('处理日期字符串', () => {
      const result = formatDate('2024-01-15');
      expect(result).toMatch(/2024/);
    });

    it('处理 ISO 8601 字符串', () => {
      const result = formatDate('2024-01-15T14:30:00.000Z');
      expect(result).toMatch(/2024/);
    });

    it('处理无效日期', () => {
      const result = formatDate('invalid');
      expect(result).toBe('Invalid Date');
    });

    it('处理空字符串', () => {
      const result = formatDate('');
      expect(result).toBe('Invalid Date');
    });

    it('处理最小日期（1970-01-01）', () => {
      const result = formatDate(new Date(0));
      expect(result).toContain('1970');
    });

    it('处理远未来日期（2100年）', () => {
      const result = formatDate('2100-01-01');
      expect(result).toContain('2100');
    });

    it('处理远过去日期（1900年）', () => {
      const result = formatDate('1900-01-01');
      expect(result).toContain('1900');
    });

    it('处理闰年日期', () => {
      const result = formatDate('2024-02-29');
      expect(result).toBeDefined();
    });

    it('处理非闰年的 2 月 29 日（无效）', () => {
      const result = formatDate('2023-02-29');
      // 2023 年 2 月 29 日会被解析为 3 月 1 日
      expect(result).toBeDefined();
    });

    it('处理自定义 options - year only', () => {
      const result = formatDate('2024-01-15', { year: 'numeric' });
      expect(result).toBe('2024年');
    });

    it('处理自定义 options - month only', () => {
      const result = formatDate('2024-01-15', { month: 'long' });
      // 中文环境下返回 '一月'，英文环境返回 'January'
      expect(result).toMatch(/一月|January/i);
    });

    it('处理空 options 对象', () => {
      const result = formatDate('2024-01-15', {});
      expect(result).toMatch(/2024/);
    });
  });

  // ==================== formatDateTime 边界测试 ====================
  describe('formatDateTime 边界条件', () => {
    it('处理午夜 00:00', () => {
      const date = new Date('2024-01-15T00:00:00');
      const result = formatDateTime(date);
      expect(result).toBeDefined();
    });

    it('处理 23:59', () => {
      const date = new Date('2024-01-15T23:59:00');
      const result = formatDateTime(date);
      expect(result).toBeDefined();
    });

    it('处理 12:00（中午）', () => {
      const date = new Date('2024-01-15T12:00:00');
      const result = formatDateTime(date);
      expect(result).toBeDefined();
    });

    it('处理带秒的时间', () => {
      const date = new Date('2024-01-15T14:30:45');
      const result = formatDateTime(date);
      expect(result).toBeDefined();
    });

    it('处理带毫秒的时间', () => {
      const date = new Date('2024-01-15T14:30:45.123');
      const result = formatDateTime(date);
      expect(result).toBeDefined();
    });

    it('处理无效日期', () => {
      const result = formatDateTime('invalid');
      expect(result).toBe('Invalid Date');
    });

    it('处理空字符串', () => {
      const result = formatDateTime('');
      expect(result).toBe('Invalid Date');
    });

    it('处理不同时区的时间', () => {
      const result1 = formatDateTime('2024-01-15T14:30:00+08:00');
      const result2 = formatDateTime('2024-01-15T06:30:00Z');
      // 两个时间点相同，但显示可能因本地时区而异
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });

  // ==================== isToday 边界测试 ====================
  describe('isToday 边界条件', () => {
    it('处理午夜 00:00', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      const midnight = new Date('2024-01-15T00:00:00');
      expect(isToday(midnight)).toBe(true);
    });

    it('处理 23:59:59', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      const endOfDay = new Date('2024-01-15T23:59:59');
      expect(isToday(endOfDay)).toBe(true);
    });

    it('处理昨天 23:59:59', () => {
      const now = new Date('2024-01-15T00:00:00');
      vi.setSystemTime(now);

      const yesterdayEnd = new Date('2024-01-14T23:59:59');
      expect(isToday(yesterdayEnd)).toBe(false);
    });

    it('处理明天 00:00:00', () => {
      const now = new Date('2024-01-15T23:59:59');
      vi.setSystemTime(now);

      const tomorrowStart = new Date('2024-01-16T00:00:00');
      expect(isToday(tomorrowStart)).toBe(false);
    });

    it('处理无效日期', () => {
      const result = isToday('invalid');
      expect(result).toBe(false);
    });

    it('处理空字符串', () => {
      const result = isToday('');
      expect(result).toBe(false);
    });

    it('处理跨年日期', () => {
      const now = new Date('2024-01-01T12:00:00');
      vi.setSystemTime(now);

      expect(isToday('2024-01-01')).toBe(true);
      expect(isToday('2023-12-31')).toBe(false);
    });

    it('处理跨月日期', () => {
      const now = new Date('2024-02-01T12:00:00');
      vi.setSystemTime(now);

      expect(isToday('2024-02-01')).toBe(true);
      expect(isToday('2024-01-31')).toBe(false);
    });
  });

  // ==================== isYesterday 边界测试 ====================
  describe('isYesterday 边界条件', () => {
    it('处理昨天午夜 00:00', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      const yesterdayMidnight = new Date('2024-01-14T00:00:00');
      expect(isYesterday(yesterdayMidnight)).toBe(true);
    });

    it('处理昨天 23:59:59', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      const yesterdayEnd = new Date('2024-01-14T23:59:59');
      expect(isYesterday(yesterdayEnd)).toBe(true);
    });

    it('处理前天 23:59:59', () => {
      const now = new Date('2024-01-15T00:00:00');
      vi.setSystemTime(now);

      const twoDaysAgo = new Date('2024-01-13T23:59:59');
      expect(isYesterday(twoDaysAgo)).toBe(false);
    });

    it('处理今天 00:00:00', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      const todayStart = new Date('2024-01-15T00:00:00');
      expect(isYesterday(todayStart)).toBe(false);
    });

    it('处理跨年', () => {
      const now = new Date('2024-01-01T12:00:00');
      vi.setSystemTime(now);

      expect(isYesterday('2023-12-31')).toBe(true);
    });

    it('处理跨月', () => {
      const now = new Date('2024-02-01T12:00:00');
      vi.setSystemTime(now);

      expect(isYesterday('2024-01-31')).toBe(true);
    });

    it('处理闰年 2 月 29 日', () => {
      const now = new Date('2024-03-01T12:00:00');
      vi.setSystemTime(now);

      expect(isYesterday('2024-02-29')).toBe(true);
    });

    it('处理非闰年（2 月只有 28 天）', () => {
      const now = new Date('2023-03-01T12:00:00');
      vi.setSystemTime(now);

      expect(isYesterday('2023-02-28')).toBe(true);
    });

    it('处理无效日期', () => {
      const result = isYesterday('invalid');
      expect(result).toBe(false);
    });

    it('处理空字符串', () => {
      const result = isYesterday('');
      expect(result).toBe(false);
    });
  });

  // ==================== 综合边界测试 ====================
  describe('综合边界场景', () => {
    it('夏令时切换', () => {
      // 夏令时切换可能导致 1 小时的偏移
      const now = new Date('2024-03-10T12:00:00'); // 美国夏令时开始
      vi.setSystemTime(now);

      const oneHourAgo = new Date('2024-03-10T11:00:00');
      expect(formatTimeAgo(oneHourAgo)).toBe('1小时前');
    });

    it('跨时区日期', () => {
      const now = new Date('2024-01-15T23:30:00+08:00');
      vi.setSystemTime(now);

      // UTC 时间比北京时间早 8 小时
      const utcDate = new Date('2024-01-15T15:30:00Z');
      expect(formatTimeAgo(utcDate)).toBe('刚刚');
    });

    it('处理非常大的日期（9999年）', () => {
      const result = formatDate('9999-12-31');
      expect(result).toContain('9999');
    });

    it('处理 Date epoch（1970年）', () => {
      const result = formatDate(new Date(0));
      expect(result).toContain('1970');
    });

    it('处理负数时间戳', () => {
      // 负数时间戳表示 1970 年之前的日期
      const result = formatDate(new Date(-86400000)); // 1969-12-31
      expect(result).toContain('1969');
    });
  });
});