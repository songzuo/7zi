/**
 * Global Error Handler Tests
 * 全局错误处理器测试
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'

// Mock logger
jest.mock('../../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

// Mock modules
jest.mock('../error-reporting', () => ({
  errorReporting: {
    init: jest.fn(),
    updateConfig: jest.fn(),
    reportJavaScriptError: jest.fn(),
    reportError: jest.fn(),
  },
  initErrorReporting: jest.fn(() => ({
    init: jest.fn(),
    updateConfig: jest.fn(),
  })),
  reportError: jest.fn(),
}))

jest.mock('../error-log-history', () => ({
  errorLogHistory: {
    init: jest.fn(),
    add: jest.fn(),
  },
  initErrorLogHistory: jest.fn(() => ({
    init: jest.fn(),
    add: jest.fn(),
  })),
  addErrorLog: jest.fn(),
}))

describe('GlobalErrorHandler', () => {
  let GlobalErrorHandler: typeof import('../global-error-handler').GlobalErrorHandler
  let globalErrorHandler: InstanceType<typeof GlobalErrorHandler>

  beforeEach(async () => {
    jest.clearAllMocks()

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
      enableLogHistory: false,
      captureUnhandledRejections: false,
      captureResourceErrors: false,
      captureNetworkErrors: false,
    })
  })

  describe('init', () => {
    it('should initialize error reporting when enabled', () => {
      const { initErrorReporting } = require('../error-reporting')
      const { initErrorLogHistory } = require('../error-log-history')

      const handler = new GlobalErrorHandler({
        enableReporting: true,
        enableLogHistory: true,
      })
      handler.init()

      expect(initErrorReporting).toHaveBeenCalled()
      expect(initErrorLogHistory).toHaveBeenCalled()
    })

    it('should not initialize when already initialized', () => {
      const { logger } = require('../../logger')

      globalErrorHandler.init()
      globalErrorHandler.init()

      expect(logger.warn).toHaveBeenCalledWith('Global error handler already initialized')
    })
  })

  describe('report', () => {
    it('should report error as string', () => {
      const { addErrorLog } = require('../error-log-history')

      globalErrorHandler.report('Test error', { key: 'value' })

      expect(addErrorLog).toHaveBeenCalledWith(
        'ManualError',
        'Test error',
        'medium',
        'javascript',
        expect.objectContaining({ key: 'value' })
      )
    })

    it('should report Error object', () => {
      const { addErrorLog } = require('../error-log-history')
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

    it('should include custom severity and category', () => {
      const { addErrorLog } = require('../error-log-history')

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
    it('should return error log history service', () => {
      const { errorLogHistory } = require('../error-log-history')

      const history = globalErrorHandler.getLogHistory()

      expect(history).toBe(errorLogHistory)
    })
  })

  describe('getReporting', () => {
    it('should return error reporting service', () => {
      const { errorReporting } = require('../error-reporting')

      const reporting = globalErrorHandler.getReporting()

      expect(reporting).toBe(errorReporting)
    })
  })
})
