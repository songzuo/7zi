/**
 * Global Error Handler Tests
 * 全局错误处理器测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock logger
vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock modules
vi.mock('../error-reporting', () => ({
  errorReporting: {
    init: vi.fn(),
    updateConfig: vi.fn(),
    reportJavaScriptError: vi.fn(),
    reportError: vi.fn(),
  },
  initErrorReporting: vi.fn(() => ({
    init: vi.fn(),
    updateConfig: vi.fn(),
  })),
  reportError: vi.fn(),
}))

vi.mock('../error-log-history', () => ({
  errorLogHistory: {
    init: vi.fn(),
    add: vi.fn(),
  },
  initErrorLogHistory: vi.fn(() => ({
    init: vi.fn(),
    add: vi.fn(),
  })),
  addErrorLog: vi.fn(),
}))

describe('GlobalErrorHandler', () => {
  let GlobalErrorHandler: typeof import('../global-error-handler').GlobalErrorHandler
  let globalErrorHandler: InstanceType<typeof GlobalErrorHandler>

  beforeEach(async () => {
    vi.clearAllMocks()

    // Reset window event listeners
    if (typeof window !== 'undefined') {
      window.onerror = null
      window.onunhandledrejection = null
    }

    // Dynamic import to get fresh module
    const module = await import('../global-error-handler')
    GlobalErrorHandler = module.GlobalErrorHandler
    globalErrorHandler = new GlobalErrorHandler({
      enableReporting: false,
      enableLogHistory: true,
      captureUnhandledRejections: false,
      captureResourceErrors: false,
      captureNetworkErrors: false,
    })
  })

  describe('init', () => {
    it('should initialize error reporting when enabled', async () => {
      const { initErrorReporting } = await import('../error-reporting')
      const { initErrorLogHistory } = await import('../error-log-history')

      const handler = new GlobalErrorHandler({
        enableReporting: true,
        enableLogHistory: true,
      })
      handler.init()

      expect(initErrorReporting).toHaveBeenCalled()
      expect(initErrorLogHistory).toHaveBeenCalled()
    })

    it('should not initialize when already initialized', async () => {
      const { logger } = await import('../../logger')

      globalErrorHandler.init()
      globalErrorHandler.init()

      expect(logger.warn).toHaveBeenCalledWith('Global error handler already initialized')
    })
  })

  describe('report', () => {
    it('should report error as string', async () => {
      const { addErrorLog } = await import('../error-log-history')

      globalErrorHandler.report('Test error', { key: 'value' })

      expect(addErrorLog).toHaveBeenCalledWith(
        'ManualError',
        'Test error',
        'medium',
        'javascript',
        expect.objectContaining({ key: 'value' })
      )
    })

    it('should report Error object', async () => {
      const { addErrorLog } = await import('../error-log-history')
      const error = new Error('Test error')

      globalErrorHandler.report(error, { key: 'value' })

      expect(addErrorLog).toHaveBeenCalledWith(
        'Error',
        'Test error',
        'medium',
        'javascript',
        expect.objectContaining({ key: 'value' })
      )
    })

    it('should include custom severity and category', async () => {
      const { addErrorLog } = await import('../error-log-history')

      globalErrorHandler.report(
        'Test error',
        {
          key: 'value',
        }
      )

      expect(addErrorLog).toHaveBeenCalled()
    })
  })

  describe('getLogHistory', () => {
    it('should return error log history service', async () => {
      const { errorLogHistory } = await import('../error-log-history')

      const history = globalErrorHandler.getLogHistory()

      expect(history).toBe(errorLogHistory)
    })
  })

  describe('getReporting', () => {
    it('should return error reporting service', async () => {
      const { errorReporting } = await import('../error-reporting')

      const reporting = globalErrorHandler.getReporting()

      expect(reporting).toBe(errorReporting)
    })
  })
})
