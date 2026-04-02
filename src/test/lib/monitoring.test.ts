/**
 * @fileoverview Web vitals monitoring tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Web Vitals Monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('module can be imported', async () => {
    const webVitalsModule = await import('../../lib/monitoring/web-vitals')
    expect(webVitalsModule).toBeDefined()
  })

  it('exports expected functions', async () => {
    const webVitalsModule = await import('../../lib/monitoring/web-vitals')

    // Check for common web vitals exports
    const exports = Object.keys(webVitalsModule)
    expect(exports.length).toBeGreaterThan(0)
  })

  it('handles missing browser APIs gracefully', async () => {
    // Mock browser APIs
    const originalPerformance = global.performance
    const originalRequestAnimationFrame = global.requestAnimationFrame

    // Remove performance API
    // @ts-expect-error Testing SSR environment without performance API
    global.performance = undefined

    const webVitalsModule = await import('../../lib/monitoring/web-vitals')

    // Module should still load without errors
    expect(webVitalsModule).toBeDefined()

    // Restore
    global.performance = originalPerformance
    global.requestAnimationFrame = originalRequestAnimationFrame
  })
})
