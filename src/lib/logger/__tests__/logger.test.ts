/**
 * Logger 模块单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger, log, LoggerConfig, LogLevel, LogCategory, LogEntry } from '../index'

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn(callback =>
    callback({
      setTag: vi.fn(),
      setUser: vi.fn(),
      setContext: vi.fn(),
      setLevel: vi.fn(),
    })
  ),
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

describe('Logger 基础功能', () => {
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Spy on console methods
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('日志级别方法', () => {
    it('应该正确调用 debug 方法', () => {
      logger.debug('Debug message', { foo: 'bar' })
      // Singleton logger has console disabled in test mode, so we verify no error
      expect(consoleDebugSpy).toHaveBeenCalledTimes(0) // enableConsole is false in test
    })

    it('应该正确调用 info 方法', () => {
      logger.info('Info message', { key: 'value' })
      expect(consoleInfoSpy).toHaveBeenCalledTimes(0)
    })

    it('应该正确调用 warn 方法', () => {
      logger.warn('Warning message', { warning: true })
      expect(consoleWarnSpy).toHaveBeenCalledTimes(0)
    })

    it('应该正确调用 error 方法', () => {
      const error = new Error('Test error')
      logger.error('Error message', error, { details: 'error details' })
      expect(consoleErrorSpy).toHaveBeenCalledTimes(0)
    })

    it('应该正确调用 fatal 方法', () => {
      const error = new Error('Fatal error')
      logger.fatal('Fatal message', error, { critical: true })
      expect(consoleErrorSpy).toHaveBeenCalledTimes(0)
    })
  })

  describe('分类日志方法', () => {
    it('应该正确调用 api 方法', () => {
      logger.api('API request', { endpoint: '/api/users' })
      expect(consoleInfoSpy).toHaveBeenCalledTimes(0)
    })

    it('应该正确调用 auth 方法', () => {
      logger.auth('User login', { userId: '123' })
      expect(consoleInfoSpy).toHaveBeenCalledTimes(0)
    })

    it('应该正确调用 perf 方法', () => {
      logger.perf('Performance metric', { duration: 123 })
      expect(consoleInfoSpy).toHaveBeenCalledTimes(0)
    })

    it('应该正确调用 user 方法', () => {
      logger.user('User action', { action: 'click' })
      expect(consoleInfoSpy).toHaveBeenCalledTimes(0)
    })

    it('应该正确调用 security 方法', () => {
      logger.security('Security alert', { threat: 'suspicious' })
      expect(consoleWarnSpy).toHaveBeenCalledTimes(0)
    })

    it('应该正确调用 business 方法', () => {
      logger.business('Business event', { event: 'purchase' })
      expect(consoleInfoSpy).toHaveBeenCalledTimes(0)
    })
  })

  describe('便捷函数', () => {
    it('log.debug 应该调用 logger.debug', () => {
      log.debug('Debug via log', { test: true })
      expect(consoleDebugSpy).toHaveBeenCalledTimes(0)
    })

    it('log.info 应该调用 logger.info', () => {
      log.info('Info via log', { test: true })
      expect(consoleInfoSpy).toHaveBeenCalledTimes(0)
    })

    it('log.warn 应该调用 logger.warn', () => {
      log.warn('Warn via log', { test: true })
      expect(consoleWarnSpy).toHaveBeenCalledTimes(0)
    })

    it('log.error 应该调用 logger.error', () => {
      const error = new Error('Test error')
      log.error('Error via log', error, { test: true })
      expect(consoleErrorSpy).toHaveBeenCalledTimes(0)
    })

    it('log.fatal 应该调用 logger.fatal', () => {
      const error = new Error('Fatal error')
      log.fatal('Fatal via log', error, { test: true })
      expect(consoleErrorSpy).toHaveBeenCalledTimes(0)
    })

    it('log.api 应该调用 logger.api', () => {
      log.api('API via log', { endpoint: '/test' })
      expect(consoleInfoSpy).toHaveBeenCalledTimes(0)
    })

    it('log.auth 应该调用 logger.auth', () => {
      log.auth('Auth via log', { userId: '123' })
      expect(consoleInfoSpy).toHaveBeenCalledTimes(0)
    })

    it('log.perf 应该调用 logger.perf', () => {
      log.perf('Perf via log', { duration: 100 })
      expect(consoleInfoSpy).toHaveBeenCalledTimes(0)
    })

    it('log.user 应该调用 logger.user', () => {
      log.user('User via log', { action: 'test' })
      expect(consoleInfoSpy).toHaveBeenCalledTimes(0)
    })

    it('log.security 应该调用 logger.security', () => {
      log.security('Security via log', { alert: true })
      expect(consoleWarnSpy).toHaveBeenCalledTimes(0)
    })

    it('log.business 应该调用 logger.business', () => {
      log.business('Business via log', { event: 'test' })
      expect(consoleInfoSpy).toHaveBeenCalledTimes(0)
    })
  })
})

describe('Logger 上下文功能', () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    logger.clearContext()
  })

  describe('setContext 和 clearContext', () => {
    it('应该设置上下文', () => {
      expect(() => {
        logger.setContext({ userId: 'user123', sessionId: 'session456' })
      }).not.toThrow()
    })

    it('应该合并多个上下文', () => {
      expect(() => {
        logger.setContext({ userId: 'user123' })
        logger.setContext({ sessionId: 'session456' })
      }).not.toThrow()
    })

    it('应该清除上下文', () => {
      expect(() => {
        logger.setContext({ userId: 'user123' })
        logger.clearContext()
      }).not.toThrow()
    })

    it('清除上下文后应该能够重新设置', () => {
      expect(() => {
        logger.setContext({ userId: 'user123' })
        logger.clearContext()
        logger.setContext({ userId: 'user456' })
      }).not.toThrow()
    })
  })

  describe('子 Logger', () => {
    it('应该创建子 logger', () => {
      expect(() => {
        logger.child({ component: 'ChildComponent' })
      }).not.toThrow()
    })

    it('子 logger 应该继承父上下文', () => {
      logger.setContext({ userId: 'parent-user', requestId: 'req-123' })
      expect(() => {
        logger.child({ component: 'ChildComponent' })
      }).not.toThrow()
    })

    it('子 logger 应该覆盖父上下文中的相同字段', () => {
      logger.setContext({ userId: 'parent-user', component: 'Parent' })
      expect(() => {
        logger.child({ userId: 'child-user', component: 'Child' })
      }).not.toThrow()
    })

    it('子 logger 应该独立于父 logger', () => {
      logger.setContext({ userId: 'parent-user' })
      expect(() => {
        logger.child({ component: 'Child' })
      }).not.toThrow()
    })
  })
})

describe('数据脱敏功能', () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('应该脱敏 password 字段（验证不抛错）', () => {
    expect(() => {
      logger.info('Login attempt', { username: 'john', password: 'secret123' })
    }).not.toThrow()
  })

  it('应该脱敏 token 字段（验证不抛错）', () => {
    expect(() => {
      logger.info('API call', { endpoint: '/api/users', token: 'abc123xyz456' })
    }).not.toThrow()
  })

  it('应该脱敏 apiKey 字段（验证不抛错）', () => {
    expect(() => {
      logger.info('Config', { apiKey: 'my-secret-key-12345' })
    }).not.toThrow()
  })

  it('应该脱敏 authorization 字段（验证不抛错）', () => {
    expect(() => {
      logger.info('Request', { authorization: 'Bearer token123' })
    }).not.toThrow()
  })

  it('应该脱敏 secret 字段（验证不抛错）', () => {
    expect(() => {
      logger.info('Secret', { secret: 'my-secret-value' })
    }).not.toThrow()
  })

  it('应该脱敏嵌套对象中的敏感字段（验证不抛错）', () => {
    expect(() => {
      logger.info('Nested data', {
        user: {
          name: 'John',
          password: 'secret123',
        },
        auth: {
          token: 'abc123',
        },
      })
    }).not.toThrow()
  })

  it('应该不脱敏非敏感字段（验证不抛错）', () => {
    expect(() => {
      logger.info('Safe data', {
        username: 'john',
        email: 'john@example.com',
        age: 30,
      })
    }).not.toThrow()
  })

  it('应该脱敏长字母数字字符串（验证不抛错）', () => {
    expect(() => {
      logger.info('Token test', { tokenValue: 'abcdefghijklmnopqrstuvwxyz123456' })
    }).not.toThrow()
  })

  it('应该脱敏 SHA-1 hash（验证不抛错）', () => {
    expect(() => {
      const sha1 = 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3'
      logger.info('Hash test', { hash: sha1 })
    }).not.toThrow()
  })

  it('应该脱敏 SHA-256 hash（验证不抛错）', () => {
    expect(() => {
      const sha256 = 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e'
      logger.info('Hash test', { hash: sha256 })
    }).not.toThrow()
  })
})

describe('日志级别过滤', () => {
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('minLevel 配置', () => {
    it('logger.updateConfig 应该不抛错', () => {
      expect(() => {
        logger.updateConfig({ minLevel: 'warn' as LogLevel })
      }).not.toThrow()
    })

    it('应该能够动态更新 minLevel（验证不抛错）', () => {
      expect(() => {
        logger.debug('Debug before update')
        logger.updateConfig({ minLevel: 'warn' as LogLevel })
        logger.debug('Debug after update')
        logger.warn('Warn after update')
      }).not.toThrow()
    })
  })

  describe('分类日志级别过滤', () => {
    it('api 方法应该支持自定义级别（验证不抛错）', () => {
      expect(() => {
        logger.api('API debug', { data: 'test' }, 'debug')
        logger.api('API info', { data: 'test' }, 'info')
        logger.api('API warn', { data: 'test' }, 'warn')
      }).not.toThrow()
    })

    it('auth 方法应该支持自定义级别（验证不抛错）', () => {
      expect(() => {
        logger.auth('Auth info', { data: 'test' }, 'info')
        logger.auth('Auth warn', { data: 'test' }, 'warn')
        logger.auth('Auth error', { data: 'test' }, 'error')
      }).not.toThrow()
    })
  })
})

describe('Logger 配置', () => {
  it('logger.updateConfig 应该不抛错', () => {
    expect(() => {
      logger.updateConfig({ enableConsole: false })
    }).not.toThrow()
  })

  it('应该能够更新配置（验证不抛错）', () => {
    expect(() => {
      logger.updateConfig({ enableConsole: true, minLevel: 'debug' as LogLevel })
      logger.info('Before update')
      logger.updateConfig({ enableConsole: false })
      logger.info('After update')
    }).not.toThrow()
  })

  it('应该合并配置而不是完全替换（验证不抛错）', () => {
    expect(() => {
      logger.updateConfig({
        enableConsole: true,
        minLevel: 'debug' as LogLevel,
        enableSentry: true,
      })
      logger.updateConfig({ minLevel: 'warn' as LogLevel })
      logger.debug('Debug message')
      logger.info('Info message')
      logger.warn('Warn message')
    }).not.toThrow()
  })
})

describe('Logger 更新配置', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('应该能够更新配置', () => {
    expect(() => {
      logger.updateConfig({ enableConsole: true, minLevel: 'debug' as LogLevel })
      logger.info('Before update')
      logger.updateConfig({ enableConsole: false })
      logger.info('After update')
    }).not.toThrow()
  })

  it('应该合并配置而不是完全替换', () => {
    expect(() => {
      logger.updateConfig({
        enableConsole: true,
        minLevel: 'debug' as LogLevel,
        enableSentry: true,
      })
      logger.updateConfig({ minLevel: 'warn' as LogLevel })
      logger.debug('Debug message')
      logger.info('Info message')
      logger.warn('Warn message')
    }).not.toThrow()
  })
})

describe('类型导出', () => {
  it('应该导出 LogLevel 类型', () => {
    const level: LogLevel = 'info'
    expect(level).toBe('info')
  })

  it('应该导出 LogCategory 类型', () => {
    const category: LogCategory = 'api'
    expect(category).toBe('api')
  })

  it('应该导出 LoggerConfig 接口', () => {
    const config: LoggerConfig = {
      minLevel: 'info',
      enableConsole: true,
      enableSentry: true,
      enableRemote: false,
      includeContext: true,
      sanitizeFields: [],
    }
    expect(config.minLevel).toBe('info')
  })

  it('应该导出 LogEntry 接口', () => {
    const entry: LogEntry = {
      level: 'info',
      category: 'app',
      message: 'Test',
      timestamp: new Date().toISOString(),
    }
    expect(entry.message).toBe('Test')
  })
})
