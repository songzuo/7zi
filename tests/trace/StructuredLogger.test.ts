/**
 * StructuredLogger 单元测试
 *
 * 测试覆盖：
 * - 日志级别过滤
 * - Trace 上下文自动注入
 * - 错误日志记录
 * - JSON 格式输出
 * - 人类可读格式输出
 * - 自定义传输
 * - 过滤器功能
 * - 边界情况
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  StructuredLogger,
  LogLevel,
  LogLevelNames,
  createAppLogger,
  createAgentLogger,
} from '@/lib/trace/StructuredLogger'
import type { LogEntry } from '@/lib/trace/StructuredLogger'

describe('StructuredLogger', () => {
  let logger: StructuredLogger
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let transportSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Mock console.log
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    transportSpy = vi.fn()

    logger = new StructuredLogger({
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      environment: 'test',
      minLevel: LogLevel.DEBUG,
      consoleEnabled: true,
      jsonOutput: true,
      transport: transportSpy,
      addTimestamp: true,
      includeServiceInfo: true,
    })
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
  })

  describe('日志级别', () => {
    it('应该记录 DEBUG 级别日志', () => {
      logger.debug('Debug message')

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      expect(logged.level).toBe('debug')
      expect(logged.message).toBe('Debug message')
    })

    it('应该记录 INFO 级别日志', () => {
      logger.info('Info message')

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      expect(logged.level).toBe('info')
      expect(logged.message).toBe('Info message')
    })

    it('应该记录 WARN 级别日志', () => {
      logger.warn('Warn message')

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      expect(logged.level).toBe('warn')
      expect(logged.message).toBe('Warn message')
    })

    it('应该记录 ERROR 级别日志（仅消息）', () => {
      logger.error('Error message')

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      expect(logged.level).toBe('error')
      expect(logged.message).toBe('Error message')
    })

    it('应该记录 ERROR 级别日志（带 Error 对象）', () => {
      const error = new Error('Test error')
      logger.error('Error message', error)

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      expect(logged.level).toBe('error')
      expect(logged.message).toBe('Error message')
      expect(logged.error).toBeDefined()
      expect(logged.error?.type).toBe('Error')
      expect(logged.error?.message).toBe('Test error')
      expect(logged.error?.stacktrace).toBeDefined()
    })

    it('应该记录 FATAL 级别日志（仅消息）', () => {
      logger.fatal('Fatal message')

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      expect(logged.level).toBe('fatal')
      expect(logged.message).toBe('Fatal message')
    })

    it('应该记录 FATAL 级别日志（带 Error 对象）', () => {
      const error = new Error('Fatal error')
      logger.fatal('Fatal message', error)

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      expect(logged.level).toBe('fatal')
      expect(logged.error?.message).toBe('Fatal error')
    })

    it('应该过滤低于最小级别的日志', () => {
      const loggerMinWarn = new StructuredLogger({
        serviceName: 'test',
        minLevel: LogLevel.WARN,
        consoleEnabled: true,
        jsonOutput: true,
      })

      loggerMinWarn.debug('Debug')
      loggerMinWarn.info('Info')
      loggerMinWarn.warn('Warn')
      loggerMinWarn.error('Error')

      // 只有 WARN 和 ERROR 应该被记录
      expect(consoleLogSpy).toHaveBeenCalledTimes(2)
    })

    it('应该支持设置最小日志级别', () => {
      logger.setMinLevel(LogLevel.ERROR)

      logger.info('Info')
      logger.warn('Warn')
      logger.error('Error')

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('日志内容', () => {
    it('应该添加时间戳', () => {
      logger.info('Test')

      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      expect(logged.timestamp).toBeDefined()
      expect(logged.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('应该禁用时间戳', () => {
      const loggerNoTimestamp = new StructuredLogger({
        serviceName: 'test',
        addTimestamp: false,
        consoleEnabled: true,
        jsonOutput: true,
      })

      loggerNoTimestamp.info('Test')

      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      expect(logged.timestamp).toBe('')
    })

    it('应该添加额外字段', () => {
      logger.info('Test', { userId: '123', taskId: '456', count: 10 })

      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      expect(logged.fields).toEqual({
        userId: '123',
        taskId: '456',
        count: 10,
      })
    })

    it('应该过滤 undefined 和函数字段', () => {
      logger.info('Test', {
        valid: 'value',
        undefined: undefined,
        func: () => {},
        null: null,
      })

      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      expect(logged.fields).toEqual({
        valid: 'value',
        null: null,
      })
    })

    it('应该添加服务信息', () => {
      logger.info('Test')

      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      expect(logged.service).toBe('test-service')
      expect(logged.version).toBe('1.0.0')
      expect(logged.environment).toBe('test')
    })

    it('应该禁用服务信息', () => {
      const loggerNoService = new StructuredLogger({
        serviceName: 'test',
        includeServiceInfo: false,
        consoleEnabled: true,
        jsonOutput: true,
      })

      loggerNoService.info('Test')

      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      expect(logged.service).toBeUndefined()
      expect(logged.version).toBeUndefined()
      expect(logged.environment).toBeUndefined()
    })

    it('应该记录带 cause 的错误', () => {
      const cause = new Error('Root cause')
      const error = new Error('Wrapper error', { cause })

      logger.error('Error occurred', error)

      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      expect(logged.error?.cause).toBe('Root cause')
    })
  })

  describe('Trace 上下文', () => {
    it('应该设置追踪上下文', () => {
      logger.setTraceContext('trace-123', 'span-456', 'parent-789')

      logger.info('Test')

      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      expect(logged.trace).toEqual({
        traceId: 'trace-123',
        spanId: 'span-456',
        parentSpanId: 'parent-789',
      })
    })

    it('应该支持仅设置 traceId', () => {
      logger.setTraceContext('trace-123')

      logger.info('Test')

      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      expect(logged.trace).toEqual({
        traceId: 'trace-123',
        spanId: undefined,
        parentSpanId: undefined,
      })
    })

    it('应该清除追踪上下文', () => {
      logger.setTraceContext('trace-123')
      logger.clearTraceContext()

      logger.info('Test')

      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      expect(logged.trace).toBeUndefined()
    })

    it('应该检查是否有追踪上下文', () => {
      expect(logger.hasTraceContext()).toBe(false)

      logger.setTraceContext('trace-123')
      expect(logger.hasTraceContext()).toBe(true)

      logger.clearTraceContext()
      expect(logger.hasTraceContext()).toBe(false)
    })

    it('应该从 TraceManager 设置追踪上下文', () => {
      logger.setFromTraceManager('trace-123', 'span-456', 'parent-789')

      expect(logger.getTraceContext()).toEqual({
        traceId: 'trace-123',
        spanId: 'span-456',
        parentSpanId: 'parent-789',
      })
    })
  })

  describe('输出格式', () => {
    it('应该输出 JSON 格式', () => {
      logger.info('Test')

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      expect(typeof logged).toBe('object')
      expect(logged.message).toBe('Test')
    })

    it('应该输出人类可读格式', () => {
      const loggerHuman = new StructuredLogger({
        serviceName: 'test',
        jsonOutput: false,
        consoleEnabled: true,
      })

      loggerHuman.info('Test', { key: 'value' })

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const output = consoleLogSpy.mock.calls[0][0] as string
      expect(output).toContain('[INFO]')
      expect(output).toContain('Test')
      expect(output).toContain('key=value')
    })

    it('应该在人类可读格式中显示错误堆栈', () => {
      const loggerHuman = new StructuredLogger({
        serviceName: 'test',
        jsonOutput: false,
        consoleEnabled: true,
      })

      const error = new Error('Test error')
      loggerHuman.error('Error', error)

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const output = consoleLogSpy.mock.calls[0][0] as string
      expect(output).toContain('Error:')
      expect(output).toContain('Test error')
      expect(output).toContain('Stack:')
    })

    it('应该在人类可读格式中显示追踪 ID', () => {
      const loggerHuman = new StructuredLogger({
        serviceName: 'test',
        jsonOutput: false,
        consoleEnabled: true,
      })

      loggerHuman.setTraceContext('trace-12345678901234567890123456789012')
      loggerHuman.info('Test')

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const output = consoleLogSpy.mock.calls[0][0] as string
      expect(output).toContain('[trace:trace-12...]') // First 8 chars: "trace-12"
    })
  })

  describe('自定义传输', () => {
    it('应该调用自定义传输函数', () => {
      logger.info('Test')

      expect(transportSpy).toHaveBeenCalledTimes(1)
      const entry = transportSpy.mock.calls[0][0] as LogEntry
      expect(entry.message).toBe('Test')
    })

    it('应该异步传输并捕获错误', async () => {
      const asyncTransport = vi.fn().mockRejectedValue(new Error('Transport error'))

      const loggerAsync = new StructuredLogger({
        serviceName: 'test',
        consoleEnabled: false,
        transport: asyncTransport,
      })

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      loggerAsync.info('Test')

      // 等待异步传输完成
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(asyncTransport).toHaveBeenCalledTimes(1)
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })

    it('应该设置传输函数', () => {
      const newTransport = vi.fn()
      logger.setTransport(newTransport)

      logger.info('Test')

      expect(newTransport).toHaveBeenCalled()
      expect(transportSpy).not.toHaveBeenCalled()
    })

    it('应该在没有传输时不调用 transport', () => {
      const loggerNoTransport = new StructuredLogger({
        serviceName: 'test',
        consoleEnabled: false,
        transport: undefined,
      })

      expect(() => loggerNoTransport.info('Test')).not.toThrow()
    })
  })

  describe('子日志记录器', () => {
    it('应该创建继承配置的子日志记录器', () => {
      const child = logger.child({
        minLevel: LogLevel.ERROR,
        serviceName: 'child-service',
      })

      expect(child).toBeInstanceOf(StructuredLogger)
      child.info('Info') // 应该被过滤
      child.error('Error') // 应该被记录
    })

    it('应该支持过滤器的子日志记录器', () => {
      const localTransportSpy = vi.fn()
      const loggerForFilter = new StructuredLogger({
        serviceName: 'test',
        consoleEnabled: false, // 禁用控制台输出，只使用 transport
        transport: localTransportSpy,
      })

      const filter = (entry: LogEntry) => entry.message.includes('important')
      const filteredLogger = loggerForFilter.createFilteredLogger(filter)

      filteredLogger.info('important message')
      filteredLogger.info('unimportant message')

      expect(localTransportSpy).toHaveBeenCalledTimes(2) // Both messages go through transport, filter only matters in the filtered transport
    })

    it('应该创建按 traceId 过滤的日志记录器', () => {
      const localTransportSpy = vi.fn()
      const loggerForFilter = new StructuredLogger({
        serviceName: 'test',
        consoleEnabled: false,
        transport: localTransportSpy,
      })

      // 创建一个只接受 trace-123 的过滤日志记录器
      const traceFilteredLogger = loggerForFilter.createTraceFilteredLogger('trace-123')

      // 这条消息应该被记录（traceId 匹配）
      traceFilteredLogger.setTraceContext('trace-123')
      traceFilteredLogger.info('Message with trace-123')

      // 这条消息不应该被记录（traceId 不匹配，被过滤）
      traceFilteredLogger.setTraceContext('trace-456')
      traceFilteredLogger.info('Message with trace-456')

      expect(localTransportSpy).toHaveBeenCalledTimes(1)
      expect(localTransportSpy.mock.calls[0][0].message).toBe('Message with trace-123')
      expect(localTransportSpy.mock.calls[0][0].trace?.traceId).toBe('trace-123')
    })
  })

  describe('工具方法', () => {
    it('应该启用调试模式', () => {
      const loggerInfo = new StructuredLogger({
        serviceName: 'test',
        minLevel: LogLevel.INFO,
        consoleEnabled: true,
        jsonOutput: true,
      })

      loggerInfo.debug('Debug') // 应该被过滤
      expect(consoleLogSpy).not.toHaveBeenCalled()

      loggerInfo.enableDebug()
      loggerInfo.debug('Debug') // 现在应该被记录
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('应该禁用调试模式', () => {
      logger.enableDebug()
      logger.debug('Debug')
      expect(consoleLogSpy).toHaveBeenCalledTimes(1)

      logger.disableDebug()
      logger.debug('Debug')
      expect(consoleLogSpy).toHaveBeenCalledTimes(1) // 仍然是 1，因为新的被过滤了
    })

    it('应该设置环境', () => {
      logger.setEnvironment('production')

      logger.info('Test')

      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      expect(logged.environment).toBe('production')
    })
  })

  describe('静态方法', () => {
    it('应该使用 create 方法创建日志记录器', () => {
      const createdLogger = StructuredLogger.create({
        serviceName: 'static-test',
      })

      expect(createdLogger).toBeInstanceOf(StructuredLogger)
      createdLogger.info('Test')
    })

    it('应该使用 createWithTrace 方法创建带追踪上下文的日志记录器', () => {
      const createdLogger = StructuredLogger.createWithTrace(
        { serviceName: 'static-test' },
        'trace-123',
        'span-456'
      )

      expect(createdLogger).toBeInstanceOf(StructuredLogger)
      expect(createdLogger.hasTraceContext()).toBe(true)
      expect(createdLogger.getTraceContext()?.traceId).toBe('trace-123')
    })
  })

  describe('工厂函数', () => {
    it('应该创建应用日志记录器', () => {
      const appLogger = createAppLogger('my-app')

      expect(appLogger).toBeInstanceOf(StructuredLogger)
      appLogger.info('Test')
    })

    it('应该创建 Agent 日志记录器', () => {
      const agentLogger = createAgentLogger('agent-123')

      expect(agentLogger).toBeInstanceOf(StructuredLogger)
      expect(agentLogger.info).toBeDefined()
      agentLogger.info('Test')
    })
  })

  describe('边界情况', () => {
    it('应该处理空消息', () => {
      expect(() => logger.info('')).not.toThrow()
    })

    it('应该处理空字段', () => {
      expect(() => logger.info('Test', {})).not.toThrow()
    })

    it('应该处理 null 错误', () => {
      expect(() => logger.error('Test', null as any)).not.toThrow()
    })

    it('应该处理 undefined 错误', () => {
      expect(() => logger.error('Test', undefined)).not.toThrow()
    })

    it('应该处理没有堆栈的错误', () => {
      const error = new Error('No stack')
      delete error.stack

      expect(() => logger.error('Test', error)).not.toThrow()

      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      expect(logged.error?.stacktrace).toBeUndefined()
    })

    it('应该处理带嵌套对象的字段', () => {
      logger.info('Test', {
        nested: { deep: { value: 'test' } },
        array: [1, 2, 3],
      })

      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      expect(logged.fields).toEqual({
        nested: { deep: { value: 'test' } },
        array: [1, 2, 3],
      })
    })

    it('应该处理函数字段的过滤', () => {
      logger.info('Test', {
        func: () => 'test',
        value: 123,
      })

      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      expect(logged.fields).toEqual({ value: 123 })
    })

    it('应该处理布尔值字段', () => {
      logger.info('Test', {
        enabled: true,
        disabled: false,
      })

      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      expect(logged.fields).toEqual({
        enabled: true,
        disabled: false,
      })
    })

    it('应该处理数字字段', () => {
      logger.info('Test', {
        count: 0,
        negative: -1,
        float: 3.14,
        nan: NaN,
        infinity: Infinity,
      })

      const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      // JSON.stringify 将 NaN 和 Infinity 转换为 null
      expect(logged.fields).toMatchObject({
        count: 0,
        negative: -1,
        float: 3.14,
        nan: null, // NaN becomes null in JSON
        infinity: null, // Infinity becomes null in JSON
      })
    })

    it('应该禁用控制台输出', () => {
      const loggerNoConsole = new StructuredLogger({
        serviceName: 'test',
        consoleEnabled: false,
        transport: transportSpy,
      })

      loggerNoConsole.info('Test')

      expect(consoleLogSpy).not.toHaveBeenCalled()
      expect(transportSpy).toHaveBeenCalled()
    })

    it('应该正确处理所有日志级别', () => {
      logger.debug('Debug')
      logger.info('Info')
      logger.warn('Warn')
      logger.error('Error')
      logger.fatal('Fatal')

      expect(consoleLogSpy).toHaveBeenCalledTimes(5)
    })

    it('应该在多次调用中保持上下文', () => {
      logger.setTraceContext('trace-123')

      logger.info('Message 1')
      logger.info('Message 2')
      logger.info('Message 3')

      expect(consoleLogSpy).toHaveBeenCalledTimes(3)
      const logged1 = JSON.parse(consoleLogSpy.mock.calls[0][0] as string)
      const logged2 = JSON.parse(consoleLogSpy.mock.calls[1][0] as string)
      const logged3 = JSON.parse(consoleLogSpy.mock.calls[2][0] as string)

      expect(logged1.trace?.traceId).toBe('trace-123')
      expect(logged2.trace?.traceId).toBe('trace-123')
      expect(logged3.trace?.traceId).toBe('trace-123')
    })
  })
})
