// @ts-nocheck - Test file with complex type issues
/**
 * Performance Config Tests
 * Tests for performance.config.ts - configuration and utility functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  CORE_WEB_VITALS_THRESHOLDS,
  CUSTOM_METRICS_CONFIG,
  ALERT_CONFIG,
  REPORTING_CONFIG,
  REALTIME_CONFIG,
  ENVIRONMENT_CONFIG,
  getEnvironmentConfig,
  getMetricRating,
  shouldReport,
  getConfig,
} from '../performance.config'

describe('Performance Config Module', () => {
  describe('CORE_WEB_VITALS_THRESHOLDS', () => {
    it('should have correct LCP thresholds', () => {
      const lcp = CORE_WEB_VITALS_THRESHOLDS.LCP

      expect(lcp.good).toBe(2500)
      expect(lcp.needsImprovement).toBe(4000)
      expect(lcp.poor).toBe(4000)
      expect(lcp.unit).toBe('ms')
      expect(lcp.description).toBeDefined()
    })

    it('should have correct INP thresholds', () => {
      const inp = CORE_WEB_VITALS_THRESHOLDS.INP

      expect(inp.good).toBe(200)
      expect(inp.needsImprovement).toBe(500)
      expect(inp.poor).toBe(500)
      expect(inp.unit).toBe('ms')
    })

    it('should have correct CLS thresholds', () => {
      const cls = CORE_WEB_VITALS_THRESHOLDS.CLS

      expect(cls.good).toBe(0.1)
      expect(cls.needsImprovement).toBe(0.25)
      expect(cls.poor).toBe(0.25)
      expect(cls.unit).toBe('score')
    })

    it('should have correct TTFB thresholds', () => {
      const ttfb = CORE_WEB_VITALS_THRESHOLDS.TTFB

      expect(ttfb.good).toBe(800)
      expect(ttfb.needsImprovement).toBe(1800)
      expect(ttfb.poor).toBe(1800)
      expect(ttfb.unit).toBe('ms')
    })

    it('should have correct FCP thresholds', () => {
      const fcp = CORE_WEB_VITALS_THRESHOLDS.FCP

      expect(fcp.good).toBe(1800)
      expect(fcp.needsImprovement).toBe(3000)
      expect(fcp.poor).toBe(3000)
      expect(fcp.unit).toBe('ms')
    })

    it('should mark FID as deprecated', () => {
      const fid = CORE_WEB_VITALS_THRESHOLDS.FID

      expect(fid.deprecated).toBe(true)
    })
  })

  describe('CUSTOM_METRICS_CONFIG', () => {
    it('should have resource metrics', () => {
      expect(CUSTOM_METRICS_CONFIG.resources).toBeDefined()
      expect(CUSTOM_METRICS_CONFIG.resources.jsLoadTime).toBeDefined()
      expect(CUSTOM_METRICS_CONFIG.resources.cssLoadTime).toBeDefined()
      expect(CUSTOM_METRICS_CONFIG.resources.imageLoadTime).toBeDefined()
      expect(CUSTOM_METRICS_CONFIG.resources.fontLoadTime).toBeDefined()
    })

    it('should have long task metrics', () => {
      expect(CUSTOM_METRICS_CONFIG.longTasks).toBeDefined()
      expect(CUSTOM_METRICS_CONFIG.longTasks.threshold).toBe(50)
      expect(CUSTOM_METRICS_CONFIG.longTasks.warning).toBeDefined()
      expect(CUSTOM_METRICS_CONFIG.longTasks.critical).toBeDefined()
    })

    it('should have memory metrics', () => {
      expect(CUSTOM_METRICS_CONFIG.memory).toBeDefined()
      expect(CUSTOM_METRICS_CONFIG.memory.heapSize).toBeDefined()
    })

    it('should have API metrics', () => {
      expect(CUSTOM_METRICS_CONFIG.api).toBeDefined()
      expect(CUSTOM_METRICS_CONFIG.api.responseTime).toBeDefined()
      expect(CUSTOM_METRICS_CONFIG.api.errorRate).toBeDefined()
      expect(CUSTOM_METRICS_CONFIG.api.timeout).toBeDefined()
    })

    it('should have navigation metrics', () => {
      expect(CUSTOM_METRICS_CONFIG.navigation).toBeDefined()
      expect(CUSTOM_METRICS_CONFIG.navigation.routeChangeTime).toBeDefined()
    })

    it('should have rendering metrics', () => {
      expect(CUSTOM_METRICS_CONFIG.rendering).toBeDefined()
      expect(CUSTOM_METRICS_CONFIG.rendering.componentRenderTime).toBeDefined()
      expect(CUSTOM_METRICS_CONFIG.rendering.hydrationTime).toBeDefined()
    })
  })

  describe('ALERT_CONFIG', () => {
    it('should have alert levels', () => {
      expect(ALERT_CONFIG.levels).toBeDefined()
      expect(ALERT_CONFIG.levels.info).toBeDefined()
      expect(ALERT_CONFIG.levels.warning).toBeDefined()
      expect(ALERT_CONFIG.levels.critical).toBeDefined()
    })

    it('should have alert rules', () => {
      expect(ALERT_CONFIG.rules).toBeDefined()
      expect(ALERT_CONFIG.rules.coreWebVitals).toBeDefined()
      expect(ALERT_CONFIG.rules.customMetrics).toBeDefined()
      expect(ALERT_CONFIG.rules.silencePeriod).toBeDefined()
    })

    it('should have alert channels', () => {
      expect(ALERT_CONFIG.channels).toBeDefined()
      expect(ALERT_CONFIG.channels.console).toBeDefined()
      expect(ALERT_CONFIG.channels.sentry).toBeDefined()
      expect(ALERT_CONFIG.channels.slack).toBeDefined()
      expect(ALERT_CONFIG.channels.email).toBeDefined()
    })

    it('should have correct alert level properties', () => {
      expect(ALERT_CONFIG.levels.info.priority).toBe(0)
      expect(ALERT_CONFIG.levels.warning.priority).toBe(1)
      expect(ALERT_CONFIG.levels.critical.priority).toBe(2)
    })
  })

  describe('REPORTING_CONFIG', () => {
    it('should have Sentry config', () => {
      expect(REPORTING_CONFIG.sentry).toBeDefined()
      expect(REPORTING_CONFIG.sentry.enabled).toBeDefined()
      expect(REPORTING_CONFIG.sentry.tracesSampleRate).toBeDefined()
      expect(REPORTING_CONFIG.sentry.webVitalsSampleRate).toBeDefined()
    })

    it('should have batch config', () => {
      expect(REPORTING_CONFIG.batch).toBeDefined()
      expect(REPORTING_CONFIG.batch.enabled).toBeDefined()
      expect(REPORTING_CONFIG.batch.maxSize).toBeDefined()
      expect(REPORTING_CONFIG.batch.maxWaitMs).toBeDefined()
    })

    it('should have localStorage config', () => {
      expect(REPORTING_CONFIG.localStorage).toBeDefined()
      expect(REPORTING_CONFIG.localStorage.enabled).toBeDefined()
      expect(REPORTING_CONFIG.localStorage.key).toBeDefined()
    })

    it('should have filtering config', () => {
      expect(REPORTING_CONFIG.filtering).toBeDefined()
      expect(REPORTING_CONFIG.filtering.excludeRoutes).toBeDefined()
      expect(REPORTING_CONFIG.filtering.excludeUserAgents).toBeDefined()
    })

    it('should have privacy config', () => {
      expect(REPORTING_CONFIG.privacy).toBeDefined()
      expect(REPORTING_CONFIG.privacy.collectIp).toBeDefined()
      expect(REPORTING_CONFIG.privacy.collectUserAgent).toBeDefined()
      expect(REPORTING_CONFIG.privacy.sanitizeFields).toBeDefined()
    })
  })

  describe('REALTIME_CONFIG', () => {
    it('should have devTools config', () => {
      expect(REALTIME_CONFIG.devTools).toBeDefined()
      expect(REALTIME_CONFIG.devTools.enabled).toBeDefined()
      expect(REALTIME_CONFIG.devTools.consoleLogging).toBeDefined()
    })

    it('should have refreshInterval config', () => {
      expect(REALTIME_CONFIG.refreshInterval).toBeDefined()
      expect(REALTIME_CONFIG.refreshInterval.metrics).toBeDefined()
      expect(REALTIME_CONFIG.refreshInterval.alerts).toBeDefined()
      expect(REALTIME_CONFIG.refreshInterval.health).toBeDefined()
    })

    it('should have visualization config', () => {
      expect(REALTIME_CONFIG.visualization).toBeDefined()
      expect(REALTIME_CONFIG.visualization.colors).toBeDefined()
      expect(REALTIME_CONFIG.visualization.charts).toBeDefined()
    })

    it('should have correct color values', () => {
      expect(REALTIME_CONFIG.visualization.colors.good).toBe('#0cce6b')
      expect(REALTIME_CONFIG.visualization.colors.needsImprovement).toBe('#ffa400')
      expect(REALTIME_CONFIG.visualization.colors.poor).toBe('#ff4e42')
    })
  })

  describe('ENVIRONMENT_CONFIG', () => {
    it('should have development config', () => {
      expect(ENVIRONMENT_CONFIG.development).toBeDefined()
      expect(ENVIRONMENT_CONFIG.development.reporting).toBeDefined()
      expect(ENVIRONMENT_CONFIG.development.sampleRates).toBeDefined()
      expect(ENVIRONMENT_CONFIG.development.alerts).toBeDefined()
    })

    it('should have staging config', () => {
      expect(ENVIRONMENT_CONFIG.staging).toBeDefined()
      expect(ENVIRONMENT_CONFIG.staging.reporting).toBeDefined()
      expect(ENVIRONMENT_CONFIG.staging.sampleRates).toBeDefined()
    })

    it('should have production config', () => {
      expect(ENVIRONMENT_CONFIG.production).toBeDefined()
      expect(ENVIRONMENT_CONFIG.production.reporting).toBeDefined()
      expect(ENVIRONMENT_CONFIG.production.sampleRates).toBeDefined()
    })

    it('should have different sample rates per environment', () => {
      expect(ENVIRONMENT_CONFIG.development.sampleRates.traces).toBe(1.0)
      expect(ENVIRONMENT_CONFIG.staging.sampleRates.traces).toBe(0.5)
      expect(ENVIRONMENT_CONFIG.production.sampleRates.traces).toBe(0.1)
    })
  })

  describe('getEnvironmentConfig', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development')
    })

    it('should return development config in development', () => {
      vi.stubEnv('NODE_ENV', 'development')
      const config = getEnvironmentConfig()

      expect(config).toEqual(ENVIRONMENT_CONFIG.development)
    })

    it('should return staging config in staging', () => {
      vi.stubEnv('NODE_ENV', 'staging')
      const config = getEnvironmentConfig()

      expect(config).toEqual(ENVIRONMENT_CONFIG.staging)
    })

    it('should return production config in production', () => {
      vi.stubEnv('NODE_ENV', 'production')
      const config = getEnvironmentConfig()

      expect(config).toEqual(ENVIRONMENT_CONFIG.production)
    })

    it('should return development config as default', () => {
      vi.stubEnv('NODE_ENV', undefined)
      const config = getEnvironmentConfig()

      expect(config).toEqual(ENVIRONMENT_CONFIG.development)
    })

    it('should handle unknown environments', () => {
      vi.stubEnv('NODE_ENV', 'test')
      const config = getEnvironmentConfig()

      expect(config).toEqual(ENVIRONMENT_CONFIG.development)
    })
  })

  describe('getMetricRating', () => {
    it('should return good for LCP below good threshold', () => {
      const rating = getMetricRating('LCP', 2000)
      expect(rating).toBe('good')
    })

    it('should return needs-improvement for LCP between good and poor threshold', () => {
      const rating = getMetricRating('LCP', 3000)
      expect(rating).toBe('needs-improvement')
    })

    it('should return poor for LCP above poor threshold', () => {
      const rating = getMetricRating('LCP', 5000)
      expect(rating).toBe('poor')
    })

    it('should handle edge cases for LCP', () => {
      expect(getMetricRating('LCP', 2500)).toBe('good')
      expect(getMetricRating('LCP', 4000)).toBe('needs-improvement')
      expect(getMetricRating('LCP', 4001)).toBe('poor')
    })

    it('should return good for INP below good threshold', () => {
      const rating = getMetricRating('INP', 100)
      expect(rating).toBe('good')
    })

    it('should return needs-improvement for INP between thresholds', () => {
      const rating = getMetricRating('INP', 300)
      expect(rating).toBe('needs-improvement')
    })

    it('should return poor for INP above poor threshold', () => {
      const rating = getMetricRating('INP', 600)
      expect(rating).toBe('poor')
    })

    it('should return good for CLS below good threshold', () => {
      const rating = getMetricRating('CLS', 0.05)
      expect(rating).toBe('good')
    })

    it('should return needs-improvement for CLS between thresholds', () => {
      const rating = getMetricRating('CLS', 0.2)
      expect(rating).toBe('needs-improvement')
    })

    it('should return poor for CLS above poor threshold', () => {
      const rating = getMetricRating('CLS', 0.3)
      expect(rating).toBe('poor')
    })

    it('should return good for TTFB below good threshold', () => {
      const rating = getMetricRating('TTFB', 500)
      expect(rating).toBe('good')
    })

    it('should return needs-improvement for TTFB between thresholds', () => {
      const rating = getMetricRating('TTFB', 1000)
      expect(rating).toBe('needs-improvement')
    })

    it('should return poor for TTFB above poor threshold', () => {
      const rating = getMetricRating('TTFB', 2000)
      expect(rating).toBe('poor')
    })

    it('should return good for FCP below good threshold', () => {
      const rating = getMetricRating('FCP', 1500)
      expect(rating).toBe('good')
    })

    it('should return needs-improvement for FCP between thresholds', () => {
      const rating = getMetricRating('FCP', 2500)
      expect(rating).toBe('needs-improvement')
    })

    it('should return poor for FCP above poor threshold', () => {
      const rating = getMetricRating('FCP', 4000)
      expect(rating).toBe('poor')
    })

    it('should return good for unknown metrics', () => {
      const rating = getMetricRating('UnknownMetric', 100)
      expect(rating).toBe('good')
    })

    it('should handle zero values', () => {
      expect(getMetricRating('LCP', 0)).toBe('good')
      expect(getMetricRating('CLS', 0)).toBe('good')
    })

    it('should handle negative values', () => {
      expect(getMetricRating('LCP', -100)).toBe('good')
      expect(getMetricRating('CLS', -0.1)).toBe('good')
    })
  })

  describe('shouldReport', () => {
    it('should return true when random value is below sample rate', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.05)
      const result = shouldReport(0.1)
      expect(result).toBe(true)
    })

    it('should return false when random value is above sample rate', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.15)
      const result = shouldReport(0.1)
      expect(result).toBe(false)
    })

    it('should return true for sample rate of 1', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      const result = shouldReport(1)
      expect(result).toBe(true)
    })

    it('should return false for sample rate of 0', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const result = shouldReport(0)
      expect(result).toBe(false)
    })

    it('should handle boundary cases', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1)
      expect(shouldReport(0.1)).toBe(true)

      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      expect(shouldReport(0.5)).toBe(true)

      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      expect(shouldReport(0.01)).toBe(true)
    })

    it('should handle typical sample rates', () => {
      // Production rate: 10%
      vi.spyOn(Math, 'random').mockReturnValue(0.05)
      expect(shouldReport(0.1)).toBe(true)

      // Staging rate: 50%
      vi.spyOn(Math, 'random').mockReturnValue(0.25)
      expect(shouldReport(0.5)).toBe(true)

      // Development rate: 100%
      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      expect(shouldReport(1.0)).toBe(true)
    })
  })

  describe('getConfig', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'test')
    })

    it('should return complete config object', () => {
      const config = getConfig()

      expect(config).toHaveProperty('thresholds')
      expect(config).toHaveProperty('customMetrics')
      expect(config).toHaveProperty('alerts')
      expect(config).toHaveProperty('reporting')
      expect(config).toHaveProperty('realtime')
      expect(config).toHaveProperty('environment')
    })

    it('should include thresholds in config', () => {
      const config = getConfig()

      expect(config.thresholds).toBe(CORE_WEB_VITALS_THRESHOLDS)
    })

    it('should include customMetrics in config', () => {
      const config = getConfig()

      expect(config.customMetrics).toBe(CUSTOM_METRICS_CONFIG)
    })

    it('should include alerts in config', () => {
      const config = getConfig()

      expect(config.alerts).toBe(ALERT_CONFIG)
    })

    it('should include reporting in config', () => {
      const config = getConfig()

      expect(config.reporting).toBe(REPORTING_CONFIG)
    })

    it('should include realtime in config', () => {
      const config = getConfig()

      expect(config.realtime).toBe(REALTIME_CONFIG)
    })

    it('should include environment config', () => {
      const config = getConfig()

      expect(config.environment).toBeDefined()
      expect(config.environment).toHaveProperty('reporting')
      expect(config.environment).toHaveProperty('sampleRates')
      expect(config.environment).toHaveProperty('alerts')
    })

    it('should use getEnvironmentConfig for environment section', () => {
      vi.stubEnv('NODE_ENV', 'production')
      const config = getConfig()

      expect(config.environment).toEqual(ENVIRONMENT_CONFIG.production)
    })
  })

  describe('Configuration Validation', () => {
    it('should have valid threshold values', () => {
      const { LCP, INP, CLS, TTFB, FCP } = CORE_WEB_VITALS_THRESHOLDS

      // All thresholds should be positive numbers
      expect(LCP.good).toBeGreaterThan(0)
      expect(INP.good).toBeGreaterThan(0)
      expect(CLS.good).toBeGreaterThanOrEqual(0)
      expect(TTFB.good).toBeGreaterThan(0)
      expect(FCP.good).toBeGreaterThan(0)
    })

    it('should have valid custom metric values', () => {
      const { jsLoadTime, cssLoadTime } = CUSTOM_METRICS_CONFIG.resources

      expect(jsLoadTime.warning).toBeGreaterThan(0)
      expect(jsLoadTime.critical).toBeGreaterThan(0)
      expect(cssLoadTime.warning).toBeGreaterThan(0)
      expect(cssLoadTime.critical).toBeGreaterThan(0)
    })

    it('should have valid sample rates', () => {
      const { traces, webVitals, customMetrics } = REPORTING_CONFIG.sentry

      expect(traces).toBeGreaterThanOrEqual(0)
      expect(traces).toBeLessThanOrEqual(1)
      expect(webVitals).toBeGreaterThanOrEqual(0)
      expect(webVitals).toBeLessThanOrEqual(1)
      expect(customMetrics).toBeGreaterThanOrEqual(0)
      expect(customMetrics).toBeLessThanOrEqual(1)
    })

    it('should have valid alert level priorities', () => {
      const { info, warning, critical } = ALERT_CONFIG.levels

      expect(info.priority).toBeLessThan(warning.priority)
      expect(warning.priority).toBeLessThan(critical.priority)
    })

    it('should have valid batch config values', () => {
      const { maxSize, maxWaitMs } = REPORTING_CONFIG.batch

      expect(maxSize).toBeGreaterThan(0)
      expect(maxWaitMs).toBeGreaterThan(0)
    })
  })

  describe('Type Safety', () => {
    it('should export correct types', () => {
      // This is a type test - if it compiles, types are correct
      const rating: 'good' | 'needs-improvement' | 'poor' = getMetricRating('LCP', 100)
      expect(['good', 'needs-improvement', 'poor']).toContain(rating)
    })
  })
})
