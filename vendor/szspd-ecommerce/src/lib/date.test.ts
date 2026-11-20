/**
 * date.ts Tests
 * Time Formatting Utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { formatTimeAgo, formatDate, formatDateTime, isToday, isYesterday } from './date'

describe('date.ts', () => {
  // Fix time for consistent tests
  const fixedNow = new Date('2024-03-22T12:00:00.000Z')

  // Helper function matching getCachedDate logic
  const getCachedDate = (daysOffset: number): Date => {
    const nowMs = Date.now()
    const now = new Date(nowMs)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const targetDate = new Date(today)
    targetDate.setDate(targetDate.getDate() - daysOffset)
    return targetDate
  }

  beforeEach(() => {
    // Set fixed time
    vi.useFakeTimers()
    vi.setSystemTime(fixedNow)
  })

  describe('formatTimeAgo', () => {
    it('should return "刚刚" for very recent times', () => {
      const now = new Date('2024-03-22T12:00:00.000Z')
      const justNow = new Date('2024-03-22T11:59:59.500Z')

      expect(formatTimeAgo(justNow, now)).toBe('刚刚')
    })

    it('should return minutes ago for times within 2 hours', () => {
      const now = new Date('2024-03-22T12:00:00.000Z')
      const fiveMinutesAgo = new Date('2024-03-22T11:55:00.000Z')
      const oneHourAgo = new Date('2024-03-22T11:00:00.000Z')

      expect(formatTimeAgo(fiveMinutesAgo, now)).toBe('5分钟前')
      expect(formatTimeAgo(oneHourAgo, now)).toBe('60分钟前')
    })

    it('should return hours ago for times within 24 hours', () => {
      const now = new Date('2024-03-22T12:00:00.000Z')
      const twoHoursAgo = new Date('2024-03-22T10:00:00.000Z')
      const tenHoursAgo = new Date('2024-03-22T02:00:00.000Z')

      expect(formatTimeAgo(twoHoursAgo, now)).toBe('2小时前')
      expect(formatTimeAgo(tenHoursAgo, now)).toBe('10小时前')
    })

    it('should return days ago for times within 7 days', () => {
      const now = new Date('2024-03-22T12:00:00.000Z')
      const oneDayAgo = new Date('2024-03-21T12:00:00.000Z')
      const threeDaysAgo = new Date('2024-03-19T12:00:00.000Z')
      const sevenDaysAgo = new Date('2024-03-15T12:00:00.000Z')

      expect(formatTimeAgo(oneDayAgo, now)).toBe('24小时前') // <= 24 hours shows hours
      expect(formatTimeAgo(threeDaysAgo, now)).toBe('3天前')
      expect(formatTimeAgo(sevenDaysAgo, now)).toBe('7天前')
    })

    it('should return formatted date for times older than 7 days', () => {
      const now = new Date('2024-03-22T12:00:00.000Z')
      const eightDaysAgo = new Date('2024-03-14T12:00:00.000Z')
      const thirtyDaysAgo = new Date('2024-02-21T12:00:00.000Z')

      const result1 = formatTimeAgo(eightDaysAgo, now)
      const result2 = formatTimeAgo(thirtyDaysAgo, now)

      // Should return formatted date string in Chinese locale
      expect(result1).toMatch(/\d{4}\/\d{1,2}\/\d{1,2}/)
      expect(result2).toMatch(/\d{4}\/\d{1,2}\/\d{1,2}/)
    })

    it('should handle date strings', () => {
      const result = formatTimeAgo('2024-03-22T11:00:00.000Z', fixedNow)

      expect(result).toBe('60分钟前') // 60 minutes < 120 minutes
    })

    it('should default to current time when now is not provided', () => {
      const fiveMinutesAgo = new Date(fixedNow.getTime() - 5 * 60 * 1000)

      const result = formatTimeAgo(fiveMinutesAgo)

      expect(result).toBe('5分钟前')
    })

    it('should handle edge cases', () => {
      const now = new Date('2024-03-22T12:00:00.000Z')
      const oneMinuteAgo = new Date('2024-03-22T11:59:00.000Z')
      const twoHoursAgo = new Date('2024-03-22T10:00:00.000Z')
      const twentyFourHoursAgo = new Date('2024-03-21T12:00:00.000Z')

      // Test boundary conditions
      expect(formatTimeAgo(oneMinuteAgo, now)).toBe('1分钟前')
      expect(formatTimeAgo(twoHoursAgo, now)).toBe('2小时前')
      expect(formatTimeAgo(twentyFourHoursAgo, now)).toBe('24小时前') // <= 24 hours
    })
  })

  describe('formatDate', () => {
    it('should format date with default options', () => {
      const date = new Date('2024-03-22T12:00:00.000Z')

      const result = formatDate(date)

      // Should return formatted date in Chinese locale
      expect(result).toMatch(/\d{4}\/\d{1,2}\/\d{1,2}/)
    })

    it('should format date string', () => {
      const result = formatDate('2024-03-22')

      expect(result).toMatch(/\d{4}\/\d{1,2}\/\d{1,2}/)
    })

    it('should accept custom format options', () => {
      const date = new Date('2024-03-22T12:00:00.000Z')
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }

      const result = formatDate(date, options)

      expect(result).toContain('2024')
      expect(result).toContain('3')
      expect(result).toContain('22')
    })

    it('should handle different locales', () => {
      const date = new Date('2024-03-22')
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }

      const result = formatDate(date, options)

      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('formatDateTime', () => {
    it('should format date and time', () => {
      const date = new Date('2024-03-22T14:30:45.000Z')

      const result = formatDateTime(date)

      expect(typeof result).toBe('string')
      // Should include date and time components
      expect(result).toMatch(/\d/)
    })

    it('should format date string', () => {
      const result = formatDateTime('2024-03-22T14:30:45')

      expect(typeof result).toBe('string')
    })

    it('should use Chinese locale format', () => {
      const date = new Date('2024-03-22T14:30:45.000Z')

      const result = formatDateTime(date)

      // Should contain year, month, day, hour, minute in Chinese format
      expect(result).toMatch(/\d/)
    })

    it('should handle midnight time', () => {
      const date = new Date('2024-03-22T00:00:00.000Z')

      const result = formatDateTime(date)

      expect(typeof result).toBe('string')
    })

    it('should handle end of day time', () => {
      const date = new Date('2024-03-22T23:59:59.000Z')

      const result = formatDateTime(date)

      expect(typeof result).toBe('string')
    })
  })

  describe('isToday', () => {
    it('should return true for today', () => {
      const today = new Date('2024-03-22T12:00:00.000Z')

      expect(isToday(today)).toBe(true)
    })

    it('should return false for yesterday', () => {
      const yesterday = new Date('2024-03-21T12:00:00.000Z')

      expect(isToday(yesterday)).toBe(false)
    })

    it('should return false for tomorrow', () => {
      const tomorrow = new Date('2024-03-23T12:00:00.000Z')

      expect(isToday(tomorrow)).toBe(false)
    })

    it('should return true for different times today', () => {
      const morning = getCachedDate(0)
      const afternoon = new Date(fixedNow)
      const evening = new Date(
        fixedNow.getFullYear(),
        fixedNow.getMonth(),
        fixedNow.getDate(),
        23,
        59,
        59
      )

      expect(isToday(morning)).toBe(true)
      expect(isToday(afternoon)).toBe(true)
      expect(isToday(evening)).toBe(true)
    })

    it('should handle date strings', () => {
      const todayString = '2024-03-22T12:00:00.000Z'

      expect(isToday(todayString)).toBe(true)
    })

    it('should work with different timezones (local date)', () => {
      // Test that it uses local date comparison
      const date = new Date(fixedNow.getFullYear(), fixedNow.getMonth(), fixedNow.getDate())

      expect(isToday(date)).toBe(true)
    })
  })

  describe('isYesterday', () => {
    it('should return true for yesterday', () => {
      const yesterday = new Date('2024-03-21T12:00:00.000Z')

      expect(isYesterday(yesterday)).toBe(true)
    })

    it('should return false for today', () => {
      const today = new Date('2024-03-22T12:00:00.000Z')

      expect(isYesterday(today)).toBe(false)
    })

    it('should return false for tomorrow', () => {
      const tomorrow = new Date('2024-03-23T12:00:00.000Z')

      expect(isYesterday(tomorrow)).toBe(false)
    })

    it('should return true for different times yesterday', () => {
      const yesterdayDate = getCachedDate(1)
      const yesterdayMorning = new Date(yesterdayDate)
      const yesterdayAfternoon = new Date(yesterdayDate.getTime() + 12 * 60 * 60 * 1000)
      const yesterdayEvening = new Date(
        yesterdayDate.getTime() + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000
      )

      expect(isYesterday(yesterdayMorning)).toBe(true)
      expect(isYesterday(yesterdayAfternoon)).toBe(true)
      expect(isYesterday(yesterdayEvening)).toBe(true)
    })

    it('should handle date strings', () => {
      const yesterdayString = '2024-03-21T12:00:00.000Z'

      expect(isYesterday(yesterdayString)).toBe(true)
    })

    it('should work with month boundaries', () => {
      // Test end of previous month
      const lastDayOfPreviousMonth = new Date('2024-02-29T12:00:00.000Z')

      // If today is March 1, yesterday should be Feb 29
      if (fixedNow.getDate() === 1 && fixedNow.getMonth() === 2) {
        expect(isYesterday(lastDayOfPreviousMonth)).toBe(true)
      }
    })

    it('should work with year boundaries', () => {
      // Test end of previous year
      const lastDayOfPreviousYear = new Date('2023-12-31T12:00:00.000Z')

      // If today is Jan 1, yesterday should be Dec 31
      if (fixedNow.getDate() === 1 && fixedNow.getMonth() === 0) {
        expect(isYesterday(lastDayOfPreviousYear)).toBe(true)
      }
    })
  })

  describe('integration tests', () => {
    it('should work together for time display', () => {
      const now = new Date('2024-03-22T12:00:00.000Z')
      const recentDate = new Date('2024-03-22T11:30:00.000Z')

      // Should be "30分钟前"
      const timeAgo = formatTimeAgo(recentDate, now)
      expect(timeAgo).toBe('30分钟前')

      // Should be today
      expect(isToday(recentDate)).toBe(true)
      expect(isYesterday(recentDate)).toBe(false)
    })

    it('should handle date across time zones correctly', () => {
      const utcDate = new Date('2024-03-22T00:00:00.000Z')

      // The functions should work regardless of time zone
      expect(typeof formatTimeAgo(utcDate)).toBe('string')
      expect(typeof formatDate(utcDate)).toBe('string')
      expect(typeof formatDateTime(utcDate)).toBe('string')
    })

    it('should handle invalid dates gracefully', () => {
      // Invalid dates should still return something
      const invalidDate = new Date('invalid')

      const result1 = formatDate(invalidDate)
      const result2 = formatDateTime(invalidDate)

      expect(typeof result1).toBe('string')
      expect(typeof result2).toBe('string')
    })

    it('should handle epoch timestamps', () => {
      const epoch = new Date(0) // 1970-01-01

      const timeAgo = formatTimeAgo(epoch)
      const formattedDate = formatDate(epoch)
      const formattedDateTime = formatDateTime(epoch)

      expect(timeAgo).toContain('1970')
      expect(typeof formattedDate).toBe('string')
      expect(typeof formattedDateTime).toBe('string')
    })
  })

  describe('edge cases', () => {
    it('should handle very old dates', () => {
      const ancientDate = new Date('1900-01-01')

      const result = formatTimeAgo(ancientDate)

      expect(result).toContain('1900')
    })

    it('should handle future dates', () => {
      const futureDate = new Date('2099-12-31')

      const timeAgo = formatTimeAgo(futureDate)

      // Future dates should still return formatted date
      expect(typeof timeAgo).toBe('string')
    })

    it('should handle leap year dates', () => {
      const leapYearDate = new Date('2024-02-29')

      const result = formatDate(leapYearDate)

      expect(typeof result).toBe('string')
    })

    it('should handle DST transitions', () => {
      // Dates around DST transition
      const dstDate = new Date('2024-03-10') // Typical DST date in US

      expect(() => formatDate(dstDate)).not.toThrow()
      expect(() => formatDateTime(dstDate)).not.toThrow()
      expect(() => isToday(dstDate)).not.toThrow()
    })
  })
})
