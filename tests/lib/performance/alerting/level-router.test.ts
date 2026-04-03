/**
 * LevelRouter Unit Tests
 * Tests for alert level to channel routing
 */

import { describe, it, expect, beforeEach } from 'vitest'

// ========================================
// Types (matching design document)
// ========================================

type AlertLevel = 'info' | 'warning' | 'error' | 'critical'

interface LevelChannelMapping {
  info?: string
  warning?: string
  error?: string
  critical?: string
}

// ========================================
// LevelRouter Implementation (for testing)
// ========================================

class LevelRouter {
  private mapping: LevelChannelMapping

  constructor(mapping: LevelChannelMapping) {
    this.mapping = mapping
  }

  getChannel(level: AlertLevel): string | undefined {
    return this.mapping[level]
  }

  setMapping(mapping: LevelChannelMapping): void {
    this.mapping = mapping
  }

  getMapping(): LevelChannelMapping {
    return { ...this.mapping }
  }
}

// ========================================
// Tests
// ========================================

describe('LevelRouter', () => {
  let router: LevelRouter

  describe('constructor', () => {
    it('should accept empty mapping', () => {
      router = new LevelRouter({})
      expect(router.getMapping()).toEqual({})
    })

    it('should accept partial mapping', () => {
      router = new LevelRouter({
        critical: '#incidents',
        error: '#alerts-error',
      })
      expect(router.getMapping()).toEqual({
        critical: '#incidents',
        error: '#alerts-error',
      })
    })

    it('should accept full mapping', () => {
      router = new LevelRouter({
        info: '#alerts-info',
        warning: '#alerts-warning',
        error: '#alerts-error',
        critical: '#incidents',
      })
      expect(router.getMapping()).toEqual({
        info: '#alerts-info',
        warning: '#alerts-warning',
        error: '#alerts-error',
        critical: '#incidents',
      })
    })
  })

  describe('getChannel', () => {
    beforeEach(() => {
      router = new LevelRouter({
        info: '#alerts-info',
        warning: '#alerts-warning',
        error: '#alerts-error',
        critical: '#incidents',
      })
    })

    it('should route info level to correct channel', () => {
      expect(router.getChannel('info')).toBe('#alerts-info')
    })

    it('should route warning level to correct channel', () => {
      expect(router.getChannel('warning')).toBe('#alerts-warning')
    })

    it('should route error level to correct channel', () => {
      expect(router.getChannel('error')).toBe('#alerts-error')
    })

    it('should route critical level to correct channel', () => {
      expect(router.getChannel('critical')).toBe('#incidents')
    })
  })

  describe('partial configuration', () => {
    beforeEach(() => {
      router = new LevelRouter({
        critical: '#incidents',
        error: '#alerts-error',
      })
    })

    it('should return channel for configured level (critical)', () => {
      expect(router.getChannel('critical')).toBe('#incidents')
    })

    it('should return channel for configured level (error)', () => {
      expect(router.getChannel('error')).toBe('#alerts-error')
    })

    it('should return undefined for unconfigured level (warning)', () => {
      expect(router.getChannel('warning')).toBeUndefined()
    })

    it('should return undefined for unconfigured level (info)', () => {
      expect(router.getChannel('info')).toBeUndefined()
    })
  })

  describe('empty configuration', () => {
    beforeEach(() => {
      router = new LevelRouter({})
    })

    it('should return undefined for info level', () => {
      expect(router.getChannel('info')).toBeUndefined()
    })

    it('should return undefined for warning level', () => {
      expect(router.getChannel('warning')).toBeUndefined()
    })

    it('should return undefined for error level', () => {
      expect(router.getChannel('error')).toBeUndefined()
    })

    it('should return undefined for critical level', () => {
      expect(router.getChannel('critical')).toBeUndefined()
    })
  })

  describe('setMapping', () => {
    beforeEach(() => {
      router = new LevelRouter({
        info: '#old-info',
      })
    })

    it('should update mapping', () => {
      router.setMapping({
        critical: '#new-incidents',
      })
      expect(router.getChannel('critical')).toBe('#new-incidents')
      expect(router.getChannel('info')).toBeUndefined()
    })

    it('should completely replace mapping', () => {
      router.setMapping({})
      expect(router.getMapping()).toEqual({})
    })
  })

  describe('getMapping', () => {
    it('should return a copy of the mapping', () => {
      router = new LevelRouter({ critical: '#incidents' })
      const mapping = router.getMapping()
      
      // Modify the returned mapping
      mapping.info = '#alerts-info'
      
      // Original should be unchanged
      expect(router.getChannel('info')).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('should handle channel names with special characters', () => {
      router = new LevelRouter({
        critical: '#incidents-urgent!',
      })
      expect(router.getChannel('critical')).toBe('#incidents-urgent!')
    })

    it('should handle channel names with hyphens and underscores', () => {
      router = new LevelRouter({
        info: '#alerts_info-test',
      })
      expect(router.getChannel('info')).toBe('#alerts_info-test')
    })

    it('should handle empty channel name', () => {
      router = new LevelRouter({
        info: '',
      })
      expect(router.getChannel('info')).toBe('')
    })
  })
})
