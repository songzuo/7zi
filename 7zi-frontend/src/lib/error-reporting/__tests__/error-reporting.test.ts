/**
 * Error Reporting Service Tests
 * 错误上报服务测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock monitoring module (only `monitor` is used by error-reporting)
const { trackErrorMock, idState } = vi.hoisted(() => ({
  trackErrorMock: vi.fn(async () => {}),
  idState: { counter: 0 },
}))

vi.mock('../../monitoring', () => ({
  monitor: {
    trackError: trackErrorMock,
  },
}))

// Mock id generation for deterministic assertions
vi.mock('@/lib/utils', () => ({
  generateSecureId: vi.fn((prefix?: string) => {
    idState.counter += 1
    return `${prefix ?? 'id'}_${idState.counter}`
  }),
}))

import {
  ErrorReportingService,
  errorReporting,
  initErrorReporting,
  reportError,
  reportAPIError,
} from '../error-reporting'

describe('ErrorReportingService', () => {
  let service: ErrorReportingService
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    idState.counter = 0
    trackErrorMock.mockClear()
    trackErrorMock.mockImplementation(async () => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    service = new ErrorReportingService()
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  describe('constructor & defaults', () => {
    it('should apply default configuration', () => {
      const s = new ErrorReportingService()
      // default buffer size is 100
      expect(s.getBufferSize()).toBe(0)
      // session id is generated with the 'session' prefix
      expect(s).toBeInstanceOf(ErrorReportingService)
    })

    it('should override defaults with provided config', async () => {
      const s = new ErrorReportingService({ bufferSize: 2 })
      await s.reportError('T', 'm')
      await s.reportError('T2', 'm2')
      // buffer flushed automatically when reaching bufferSize
      expect(s.getBufferSize()).toBe(0)
    })

    it('should generate unique session ids across instances', () => {
      const a = new ErrorReportingService()
      const b = new ErrorReportingService()
      expect(a).not.toBe(b)
    })
  })

  describe('reportError - core reporting path', () => {
    it('should buffer a report and call monitor.trackError', async () => {
      await service.reportError('TypeA', 'boom', 'STACK', 'javascript', 'high', { k: 1 })

      expect(service.getBufferSize()).toBe(1)
      expect(trackErrorMock).toHaveBeenCalledTimes(1)
      expect(trackErrorMock).toHaveBeenCalledWith('TypeA', 'boom', 'STACK', { k: 1 })
    })

    it('should build the report with correct fields', async () => {
      let captured: any = null
      const s = new ErrorReportingService({
        beforeSend: (r) => {
          captured = r
          return r
        },
      })
      await s.reportError('TypeB', 'msg', 'stk', 'api', 'critical', { a: 1 })

      expect(captured).toMatchObject({
        type: 'TypeB',
        message: 'msg',
        stack: 'stk',
        category: 'api',
        severity: 'critical',
        context: { a: 1 },
      })
      expect(captured.id).toMatch(/^error_/)
      expect(typeof captured.timestamp).toBe('number')
      expect(captured.timestamp).toBeGreaterThan(0)
      expect(captured.sessionId).toMatch(/^session_/)
      expect(captured.userAgent).toBe(window.navigator.userAgent)
      expect(captured.url).toBe(window.location.href)
    })

    it('should default category to other and severity to medium', async () => {
      let captured: any = null
      const s = new ErrorReportingService({ beforeSend: (r) => (captured = r) })
      await s.reportError('TypeC', 'msg')
      expect(captured.category).toBe('other')
      expect(captured.severity).toBe('medium')
      expect(captured.context).toEqual({})
    })
  })

  describe('sampling / frequency limiting', () => {
    it('should skip reporting when random exceeds sampleRate', async () => {
      const rand = vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const s = new ErrorReportingService({ sampleRate: 0.5 })

      await s.reportError('TypeD', 'msg')

      expect(s.getBufferSize()).toBe(0)
      expect(trackErrorMock).not.toHaveBeenCalled()
      rand.mockRestore()
    })

    it('should report when random is within sampleRate', async () => {
      const rand = vi.spyOn(Math, 'random').mockReturnValue(0.2)
      const s = new ErrorReportingService({ sampleRate: 0.5 })

      await s.reportError('TypeE', 'msg')

      expect(s.getBufferSize()).toBe(1)
      expect(trackErrorMock).toHaveBeenCalledTimes(1)
      rand.mockRestore()
    })

    it('should always report with default sampleRate of 1', async () => {
      const rand = vi.spyOn(Math, 'random').mockReturnValue(0.999999)
      const s = new ErrorReportingService()

      await s.reportError('TypeF', 'msg')

      expect(s.getBufferSize()).toBe(1)
      rand.mockRestore()
    })

    it('should not report at all when disabled', async () => {
      const s = new ErrorReportingService({ enabled: false })
      await s.reportError('TypeG', 'msg')
      expect(s.getBufferSize()).toBe(0)
      expect(trackErrorMock).not.toHaveBeenCalled()
    })
  })

  describe('beforeSend hook (dedup / filtering)', () => {
    it('should drop the report when beforeSend returns null', async () => {
      const s = new ErrorReportingService({ beforeSend: () => null })
      await s.reportError('TypeH', 'msg')
      expect(s.getBufferSize()).toBe(0)
      expect(trackErrorMock).not.toHaveBeenCalled()
    })

    it('should use the modified report returned by beforeSend', async () => {
      const fetchMock = vi.fn(async () => ({ ok: true }))
      vi.stubGlobal('fetch', fetchMock)

      let captured: any = null
      const s = new ErrorReportingService({
        endpoint: 'https://example.test/err',
        beforeSend: (r) => {
          captured = r
          return { ...r, message: 'sanitized', severity: 'low' }
        },
      })
      await s.reportError('TypeI', 'original')
      await s.manualFlush()

      // the hook receives the original report...
      expect(captured.message).toBe('original')
      // ...but the modified version is what gets buffered and delivered
      const body = JSON.parse((fetchMock.mock.calls[0] as any[])[1].body)
      expect(body.errors[0].message).toBe('sanitized')
      expect(body.errors[0].severity).toBe('low')
      // trackError still receives the original arguments
      expect(trackErrorMock).toHaveBeenCalledWith('TypeI', 'original', undefined, {})
    })
  })

  describe('typed report helpers', () => {
    it('reportJavaScriptError should use error name/message/stack', async () => {
      let captured: any = null
      const s = new ErrorReportingService({ beforeSend: (r) => (captured = r) })
      const err = new TypeError('bad thing')
      await s.reportJavaScriptError(err, { page: 'home' })

      expect(captured.type).toBe('TypeError')
      expect(captured.message).toBe('bad thing')
      expect(captured.stack).toBe(err.stack)
      expect(captured.category).toBe('javascript')
      expect(captured.severity).toBe('high')
      expect(captured.context).toEqual({ page: 'home' })
    })

    it('reportAPIError should classify severity by status code', async () => {
      const seen: any[] = []
      const s = new ErrorReportingService({ beforeSend: (r) => (seen.push(r), r) })

      await s.reportAPIError('/api/a', 500, 'server exploded')
      await s.reportAPIError('/api/b', 404, 'missing')
      await s.reportAPIError('/api/c', 200, 'ok-ish')

      expect(seen[0].severity).toBe('critical')
      expect(seen[1].severity).toBe('medium')
      expect(seen[2].severity).toBe('low')
      expect(seen[0].message).toBe('server exploded (500)')
      expect(seen[0].category).toBe('api')
      expect(seen[0].context).toEqual({ endpoint: '/api/a', statusCode: 500 })
    })

    it('reportAPIError should merge extra context', async () => {
      let captured: any = null
      const s = new ErrorReportingService({ beforeSend: (r) => (captured = r) })
      await s.reportAPIError('/api/x', 503, 'nope', { userId: 'u1' })
      expect(captured.context).toEqual({ endpoint: '/api/x', statusCode: 503, userId: 'u1' })
    })

    it('reportPerformanceError should describe threshold breach', async () => {
      let captured: any = null
      const s = new ErrorReportingService({ beforeSend: (r) => (captured = r) })
      await s.reportPerformanceError('LCP', 5000, 2500, { route: '/' })

      expect(captured.type).toBe('PerformanceError')
      expect(captured.message).toBe('LCP exceeded threshold: 5000 > 2500')
      expect(captured.category).toBe('performance')
      expect(captured.severity).toBe('medium')
      expect(captured.context).toEqual({ metricName: 'LCP', currentValue: 5000, threshold: 2500, route: '/' })
    })
  })

  describe('buffer management & flushing', () => {
    it('should auto-flush when buffer reaches bufferSize', async () => {
      const s = new ErrorReportingService({ bufferSize: 2 })
      await s.reportError('T1', 'm1')
      expect(s.getBufferSize()).toBe(1)

      await s.reportError('T2', 'm2')
      expect(s.getBufferSize()).toBe(0)
    })

    it('manualFlush should send buffered reports and empty the buffer', async () => {
      await service.reportError('T1', 'm1')
      await service.reportError('T2', 'm2')
      trackErrorMock.mockClear()

      await service.manualFlush()

      expect(service.getBufferSize()).toBe(0)
      expect(trackErrorMock).toHaveBeenCalledTimes(2)
      expect(trackErrorMock).toHaveBeenCalledWith('T1', 'm1', undefined, {})
    })

    it('manualFlush on empty buffer should be a no-op', async () => {
      trackErrorMock.mockClear()
      await service.manualFlush()
      expect(trackErrorMock).not.toHaveBeenCalled()
    })

    it('clearBuffer should drop pending reports', async () => {
      await service.reportError('T1', 'm1')
      expect(service.getBufferSize()).toBe(1)
      service.clearBuffer()
      expect(service.getBufferSize()).toBe(0)
    })
  })

  describe('custom endpoint delivery', () => {
    it('should POST reports to the configured endpoint', async () => {
      const fetchMock = vi.fn(async () => ({ ok: true }))
      vi.stubGlobal('fetch', fetchMock)

      const s = new ErrorReportingService({ endpoint: 'https://example.test/err' })
      await s.reportError('T1', 'm1')
      await s.manualFlush()

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0] as any[]
      expect(url).toBe('https://example.test/err')
      expect(init.method).toBe('POST')
      expect(init.headers['Content-Type']).toBe('application/json')
      const body = JSON.parse(init.body)
      expect(body.errors).toHaveLength(1)
      expect(body.errors[0].type).toBe('T1')
    })

    it('should not call fetch when no endpoint is configured', async () => {
      const fetchMock = vi.fn(async () => ({ ok: true }))
      vi.stubGlobal('fetch', fetchMock)

      await service.reportError('T1', 'm1')
      await service.manualFlush()

      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('should restore reports to the buffer and call onError when delivery fails', async () => {
      const fetchMock = vi.fn(async () => {
        throw new Error('network down')
      })
      vi.stubGlobal('fetch', fetchMock)
      const onError = vi.fn()

      const s = new ErrorReportingService({ endpoint: 'https://example.test/err', onError })
      await s.reportError('T1', 'm1')
      await s.manualFlush()

      expect(s.getBufferSize()).toBe(1)
      expect(onError).toHaveBeenCalledTimes(1)
      const [err, report] = onError.mock.calls[0] as any[]
      expect(err).toBeInstanceOf(Error)
      expect((err as Error).message).toBe('network down')
      expect(report.type).toBe('T1')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ErrorReporting] Failed to flush errors:',
        expect.any(Error)
      )
    })

    it('should wrap non-Error failures for onError', async () => {
      const fetchMock = vi.fn(async () => {
        throw 'plain string failure'
      })
      vi.stubGlobal('fetch', fetchMock)
      const onError = vi.fn()

      const s = new ErrorReportingService({ endpoint: 'https://example.test/err', onError })
      await s.reportError('T1', 'm1')
      await s.manualFlush()

      expect(onError).toHaveBeenCalledTimes(1)
      const [err] = onError.mock.calls[0] as any[]
      expect(err).toBeInstanceOf(Error)
      expect(err.message).toBe('plain string failure')
    })
  })

  describe('init / timers / stop', () => {
    it('init should not start a timer when disabled', () => {
      vi.useFakeTimers()
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')
      const s = new ErrorReportingService({ enabled: false })
      s.init()
      expect(setIntervalSpy).not.toHaveBeenCalled()
      setIntervalSpy.mockRestore()
    })

    it('init should start a periodic flush', async () => {
      vi.useFakeTimers()
      const s = new ErrorReportingService({ flushInterval: 1000 })
      s.init()

      await s.reportError('T1', 'm1')
      trackErrorMock.mockClear()

      await vi.advanceTimersByTimeAsync(1000)
      expect(trackErrorMock).toHaveBeenCalled()
      expect(s.getBufferSize()).toBe(0)

      s.stop()
    })

    it('updateConfig should restart the timer with the new interval', async () => {
      vi.useFakeTimers()
      const s = new ErrorReportingService({ flushInterval: 1000 })
      s.init()

      await s.reportError('T1', 'm1')
      trackErrorMock.mockClear()

      s.updateConfig({ flushInterval: 5000 })
      await vi.advanceTimersByTimeAsync(1000)
      expect(trackErrorMock).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(4000)
      expect(trackErrorMock).toHaveBeenCalled()

      s.stop()
    })

    it('updateConfig should merge partial config', async () => {
      const rand = vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const s = new ErrorReportingService({ bufferSize: 5 })
      s.updateConfig({ sampleRate: 0.9 })
      // both settings are retained: 0.5 <= 0.9 so the report passes sampling,
      // and bufferSize 5 keeps it buffered
      await s.reportError('T1', 'm1')
      expect(s.getBufferSize()).toBe(1)
      rand.mockRestore()
    })

    it('stop should flush remaining errors and clear the timer', async () => {
      vi.useFakeTimers()
      const s = new ErrorReportingService({ flushInterval: 1000 })
      s.init()
      await s.reportError('T1', 'm1')
      trackErrorMock.mockClear()

      s.stop()
      await vi.advanceTimersByTimeAsync(5000)

      expect(trackErrorMock).toHaveBeenCalledTimes(1)
      expect(s.getBufferSize()).toBe(0)
    })

    it('stop on a never-initialized service should not throw', () => {
      expect(() => service.stop()).not.toThrow()
    })
  })

  describe('global error handlers', () => {
    let addEventListenerSpy: ReturnType<typeof vi.spyOn>
    let handlers: Record<string, (e: any) => void>

    beforeEach(() => {
      handlers = {}
      addEventListenerSpy = vi
        .spyOn(window, 'addEventListener')
        .mockImplementation(((type: string, cb: any) => {
          if (type === 'error' || type === 'unhandledrejection') {
            handlers[type] = handlers[type] ?? cb
            if (type === 'error') {
              handlers[`${type}:capture`] = cb
            }
          }
        }) as any)
    })

    afterEach(() => {
      addEventListenerSpy.mockRestore()
    })

    it('init should register error and unhandledrejection listeners', () => {
      const s = new ErrorReportingService()
      s.init()
      expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function))
      s.stop()
    })

    it('should report uncaught javascript errors', async () => {
      const s = new ErrorReportingService()
      s.init()

      handlers['unhandledrejection']?.({
        reason: { message: 'promise blew up', stack: 'STACK' },
      })
      await Promise.resolve()

      expect(trackErrorMock).toHaveBeenCalledWith(
        'UnhandledPromiseRejection',
        'promise blew up',
        'STACK',
        { promise: 'unhandled' }
      )
      s.stop()
    })

    it('should stringify a non-object rejection reason', async () => {
      const s = new ErrorReportingService()
      s.init()

      handlers['unhandledrejection']?.({ reason: 'string reason' })
      await Promise.resolve()

      expect(trackErrorMock).toHaveBeenCalledWith(
        'UnhandledPromiseRejection',
        'string reason',
        undefined,
        { promise: 'unhandled' }
      )
      s.stop()
    })

    it('should report resource load failures for element targets', async () => {
      const s = new ErrorReportingService()
      s.init()

      const img = document.createElement('img')
      img.src = 'https://cdn.test/missing.png'

      handlers['error:capture']?.({ target: img })
      await Promise.resolve()

      expect(trackErrorMock).toHaveBeenCalledWith(
        'ResourceLoadError',
        'Failed to load: https://cdn.test/missing.png',
        undefined,
        expect.objectContaining({ tagName: 'IMG' })
      )
      s.stop()
    })

    it('should ignore window itself as a resource target', async () => {
      const s = new ErrorReportingService()
      s.init()

      handlers['error:capture']?.({ target: window })
      await Promise.resolve()

      expect(trackErrorMock).not.toHaveBeenCalled()
      s.stop()
    })

    it('should report uncaught javascript errors', async () => {
      const s = new ErrorReportingService()
      s.init()

      const err = new Error('uncaught boom')
      handlers['error']?.({
        message: 'uncaught boom',
        filename: 'app.js',
        lineno: 12,
        colno: 5,
        error: err,
      })
      await Promise.resolve()

      expect(trackErrorMock).toHaveBeenCalledWith(
        'JavaScriptError',
        'uncaught boom',
        err.stack,
        { filename: 'app.js', lineno: 12, colno: 5 }
      )
      s.stop()
    })
  })

  describe('module-level helpers', () => {
    it('initErrorReporting should return the shared singleton and update config', () => {
      const returned = initErrorReporting({ bufferSize: 42 })
      expect(returned).toBe(errorReporting)
      expect(returned).toBeInstanceOf(ErrorReportingService)
      returned.stop()
    })

    it('reportError should handle a string error', async () => {
      await reportError('something went wrong', { page: 'x' })
      expect(trackErrorMock).toHaveBeenCalledWith(
        'Error',
        'something went wrong',
        undefined,
        { page: 'x' }
      )
    })

    it('reportError should handle an Error instance', async () => {
      const err = new RangeError('out of range')
      await reportError(err)
      expect(trackErrorMock).toHaveBeenCalledWith('RangeError', 'out of range', err.stack, {})
    })

    it('reportAPIError convenience function should forward to the singleton', async () => {
      await reportAPIError('/api/conv', 404, 'not found', { a: 1 })
      expect(trackErrorMock).toHaveBeenCalledWith(
        'APIError',
        'not found (404)',
        undefined,
        { endpoint: '/api/conv', statusCode: 404, a: 1 }
      )
    })
  })
})
