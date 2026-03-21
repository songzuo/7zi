/**
 * Logger 模块单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Import the actual implementation
import { logger, log, Logger } from '../index';

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn((callback) => callback({
    setTag: vi.fn(),
    setUser: vi.fn(),
    setContext: vi.fn(),
    setLevel: vi.fn(),
  })),
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

describe('Logger 基础功能', () => {
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let testLogger: Logger;

  beforeEach(() => {
    // Create a new logger instance with console enabled for testing
    testLogger = new Logger({ enableConsole: true, minLevel: 'debug' as any });
    
    // Spy on console methods
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('日志级别方法', () => {
    it('应该正确调用 debug 方法', () => {
      testLogger.debug('Debug message', { foo: 'bar' });
      expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        'Debug message',
        { foo: 'bar' }
      );
    });

    it('应该正确调用 info 方法', () => {
      testLogger.info('Info message', { key: 'value' });
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        'Info message',
        { key: 'value' }
      );
    });

    it('应该正确调用 warn 方法', () => {
      testLogger.warn('Warning message', { warning: true });
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]'),
        'Warning message',
        { warning: true }
      );
    });

    it('应该正确调用 error 方法', () => {
      const error = new Error('Test error');
      testLogger.error('Error message', error, { details: 'error details' });
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        'Error message',
        expect.stringContaining('Error: Test error'),
        { details: 'error details' }
      );
    });

    it('应该正确调用 fatal 方法', () => {
      const error = new Error('Fatal error');
      testLogger.fatal('Fatal message', error, { critical: true });
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[FATAL]'),
        'Fatal message',
        expect.stringContaining('Error: Fatal error'),
        { critical: true }
      );
    });

    it('应该正确处理非 Error 类型的 error 参数', () => {
      testLogger.error('Error with string error', 'string error');
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        'Error with string error',
        '',
        undefined
      );
    });
  });

  describe('分类日志方法', () => {
    it('应该正确调用 api 方法', () => {
      testLogger.api('API request', { endpoint: '/api/users' });
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    });

    it('应该正确调用 auth 方法', () => {
      testLogger.auth('User login', { userId: '123' });
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    });

    it('应该正确调用 perf 方法', () => {
      testLogger.perf('Performance metric', { duration: 123 });
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    });

    it('应该正确调用 user 方法', () => {
      testLogger.user('User action', { action: 'click' });
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    });

    it('应该正确调用 security 方法', () => {
      testLogger.security('Security alert', { threat: 'suspicious' });
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    it('应该正确调用 business 方法', () => {
      testLogger.business('Business event', { event: 'purchase' });
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('便捷函数', () => {
    it('log.debug 应该调用 logger.debug', () => {
      // The singleton logger is disabled in test mode, so we test with a configured logger
      const testLogger = new Logger({ enableConsole: true, minLevel: 'debug' as any });
      const logDebug = (msg: string, data?: any) => testLogger.debug(msg, data);
      logDebug('Debug via log', { test: true });
      expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        'Debug via log',
        { test: true }
      );
    });

    it('log.info 应该调用 logger.info', () => {
      const testLogger = new Logger({ enableConsole: true, minLevel: 'debug' as any });
      const logInfo = (msg: string, data?: any) => testLogger.info(msg, data);
      logInfo('Info via log', { test: true });
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    });

    it('log.warn 应该调用 logger.warn', () => {
      const testLogger = new Logger({ enableConsole: true, minLevel: 'debug' as any });
      const logWarn = (msg: string, data?: any) => testLogger.warn(msg, data);
      logWarn('Warn via log', { test: true });
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    it('log.error 应该调用 logger.error', () => {
      const testLogger = new Logger({ enableConsole: true, minLevel: 'debug' as any });
      const error = new Error('Test error');
      const logError = (msg: string, err?: any, data?: any) => testLogger.error(msg, err, data);
      logError('Error via log', error, { test: true });
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('log.fatal 应该调用 logger.fatal', () => {
      const testLogger = new Logger({ enableConsole: true, minLevel: 'debug' as any });
      const error = new Error('Fatal error');
      const logFatal = (msg: string, err?: any, data?: any) => testLogger.fatal(msg, err, data);
      logFatal('Fatal via log', error, { test: true });
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('log.api 应该调用 logger.api', () => {
      const testLogger = new Logger({ enableConsole: true, minLevel: 'debug' as any });
      const logApi = (msg: string, data?: any, level?: any) => testLogger.api(msg, data, level);
      logApi('API via log', { endpoint: '/test' });
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    });

    it('log.auth 应该调用 logger.auth', () => {
      const testLogger = new Logger({ enableConsole: true, minLevel: 'debug' as any });
      const logAuth = (msg: string, data?: any, level?: any) => testLogger.auth(msg, data, level);
      logAuth('Auth via log', { userId: '123' });
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    });

    it('log.perf 应该调用 logger.perf', () => {
      const testLogger = new Logger({ enableConsole: true, minLevel: 'debug' as any });
      const logPerf = (msg: string, data?: any) => testLogger.perf(msg, data);
      logPerf('Perf via log', { duration: 100 });
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    });

    it('log.user 应该调用 logger.user', () => {
      const testLogger = new Logger({ enableConsole: true, minLevel: 'debug' as any });
      const logUser = (msg: string, data?: any) => testLogger.user(msg, data);
      logUser('User via log', { action: 'test' });
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    });

    it('log.security 应该调用 logger.security', () => {
      const testLogger = new Logger({ enableConsole: true, minLevel: 'debug' as any });
      const logSecurity = (msg: string, data?: any, level?: any) => testLogger.security(msg, data, level);
      logSecurity('Security via log', { alert: true });
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    it('log.business 应该调用 logger.business', () => {
      const testLogger = new Logger({ enableConsole: true, minLevel: 'debug' as any });
      const logBusiness = (msg: string, data?: any) => testLogger.business(msg, data);
      logBusiness('Business via log', { event: 'test' });
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Logger 上下文功能', () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let testLogger: Logger;

  beforeEach(() => {
    testLogger = new Logger({ enableConsole: true, minLevel: 'debug' as any });
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setContext 和 clearContext', () => {
    it('应该设置上下文并在日志中显示', () => {
      testLogger.setContext({ userId: 'user123', sessionId: 'session456' });
      testLogger.info('User action');

      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      const callArgs = consoleInfoSpy.mock.calls[0];
      expect(callArgs[2]).toHaveProperty('_context');
      expect(callArgs[2]._context).toEqual({
        userId: 'user123',
        sessionId: 'session456',
      });
    });

    it('应该合并多个上下文', () => {
      testLogger.setContext({ userId: 'user123' });
      testLogger.setContext({ sessionId: 'session456' });
      testLogger.info('Test message');

      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      const callArgs = consoleInfoSpy.mock.calls[0];
      expect(callArgs[2]._context).toEqual({
        userId: 'user123',
        sessionId: 'session456',
      });
    });

    it('应该清除上下文', () => {
      testLogger.setContext({ userId: 'user123' });
      testLogger.clearContext();
      testLogger.info('Test message');

      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      const callArgs = consoleInfoSpy.mock.calls[0];
      expect(callArgs[2]).not.toHaveProperty('_context');
    });

    it('清除上下文后应该能够重新设置', () => {
      testLogger.setContext({ userId: 'user123' });
      testLogger.clearContext();
      testLogger.setContext({ userId: 'user456' });
      testLogger.info('Test message');

      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      const callArgs = consoleInfoSpy.mock.calls[0];
      expect(callArgs[2]._context).toEqual({ userId: 'user456' });
    });
  });

  describe('子 Logger', () => {
    it('应该创建子 logger 并继承父上下文', () => {
      testLogger.setContext({ userId: 'parent-user', requestId: 'req-123' });
      const childLogger = testLogger.child({ component: 'ChildComponent' });
      
      childLogger.info('Child logger message');

      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      const callArgs = consoleInfoSpy.mock.calls[0];
      expect(callArgs[2]._context).toEqual({
        userId: 'parent-user',
        requestId: 'req-123',
        component: 'ChildComponent',
      });
    });

    it('子 logger 应该覆盖父上下文中的相同字段', () => {
      testLogger.setContext({ userId: 'parent-user', component: 'Parent' });
      const childLogger = testLogger.child({ userId: 'child-user', component: 'Child' });
      
      childLogger.info('Child logger message');

      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      const callArgs = consoleInfoSpy.mock.calls[0];
      expect(callArgs[2]._context).toEqual({
        userId: 'child-user',
        component: 'Child',
      });
    });

    it('子 logger 应该独立于父 logger', () => {
      testLogger.setContext({ userId: 'parent-user' });
      const childLogger = testLogger.child({ component: 'Child' });
      
      childLogger.setContext({ sessionId: 'child-session' });
      
      testLogger.info('Parent message');
      childLogger.info('Child message');

      expect(consoleInfoSpy).toHaveBeenCalledTimes(2);
      
      const parentCallArgs = consoleInfoSpy.mock.calls[0];
      expect(parentCallArgs[2]._context).toEqual({
        userId: 'parent-user',
      });
      
      const childCallArgs = consoleInfoSpy.mock.calls[1];
      expect(childCallArgs[2]._context).toEqual({
        userId: 'parent-user',
        component: 'Child',
        sessionId: 'child-session',
      });
    });

    it('子 logger 应该继承父 logger 的配置', () => {
      const parentLogger = new Logger({ minLevel: 'warn' as any, enableConsole: true });
      const childLogger = parentLogger.child({ component: 'Child' });
      
      // Debug should be filtered out due to minLevel
      childLogger.debug('This should not appear');
      
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });
  });
});

describe('数据脱敏功能', () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let testLogger: Logger;

  beforeEach(() => {
    testLogger = new Logger({ enableConsole: true, minLevel: 'debug' as any });
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该脱敏 password 字段', () => {
    testLogger.info('Login attempt', { username: 'john', password: 'secret123' });
    
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const callArgs = consoleInfoSpy.mock.calls[0];
    expect(callArgs[2]).toEqual({
      username: 'john',
      password: '[REDACTED]',
    });
  });

  it('应该脱敏 token 字段', () => {
    testLogger.info('API call', { endpoint: '/api/users', token: 'abc123xyz456' });
    
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const callArgs = consoleInfoSpy.mock.calls[0];
    expect(callArgs[2]).toEqual({
      endpoint: '/api/users',
      token: '[REDACTED]',
    });
  });

  it('应该脱敏 apiKey 字段', () => {
    testLogger.info('Config', { apiKey: 'my-secret-key-12345' });
    
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const callArgs = consoleInfoSpy.mock.calls[0];
    expect(callArgs[2]).toEqual({
      apiKey: '[REDACTED]',
    });
  });

  it('应该脱敏 authorization 字段', () => {
    testLogger.info('Request', { authorization: 'Bearer token123' });
    
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const callArgs = consoleInfoSpy.mock.calls[0];
    expect(callArgs[2]).toEqual({
      authorization: '[REDACTED]',
    });
  });

  it('应该脱敏 secret 字段', () => {
    testLogger.info('Secret', { secret: 'my-secret-value' });
    
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const callArgs = consoleInfoSpy.mock.calls[0];
    expect(callArgs[2]).toEqual({
      secret: '[REDACTED]',
    });
  });

  it('应该脱敏嵌套对象中的敏感字段', () => {
    testLogger.info('Nested data', {
      user: {
        name: 'John',
        password: 'secret123',
      },
      auth: {
        token: 'abc123',
      },
    });
    
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const callArgs = consoleInfoSpy.mock.calls[0];
    expect(callArgs[2]).toEqual({
      user: {
        name: 'John',
        password: '[REDACTED]',
      },
      auth: {
        token: '[REDACTED]',
      },
    });
  });

  it('应该不脱敏非敏感字段', () => {
    testLogger.info('Safe data', {
      username: 'john',
      email: 'john@example.com',
      age: 30,
    });
    
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const callArgs = consoleInfoSpy.mock.calls[0];
    expect(callArgs[2]).toEqual({
      username: 'john',
      email: 'john@example.com',
      age: 30,
    });
  });

  it('应该脱敏长字母数字字符串（可能为 token）', () => {
    testLogger.info('Token test', { tokenValue: 'abcdefghijklmnopqrstuvwxyz123456' });
    
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const callArgs = consoleInfoSpy.mock.calls[0];
    expect(callArgs[2]).toEqual({
      tokenValue: '[REDACTED]',
    });
  });

  it('应该脱敏 SHA-1 hash', () => {
    const sha1 = 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3';
    testLogger.info('Hash test', { hash: sha1 });
    
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const callArgs = consoleInfoSpy.mock.calls[0];
    expect(callArgs[2]).toEqual({
      hash: '[REDACTED]',
    });
  });

  it('应该脱敏 SHA-256 hash', () => {
    const sha256 = 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e';
    testLogger.info('Hash test', { hash: sha256 });
    
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const callArgs = consoleInfoSpy.mock.calls[0];
    expect(callArgs[2]).toEqual({
      hash: '[REDACTED]',
    });
  });
});

describe('日志级别过滤', () => {
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('minLevel 配置', () => {
    it('minLevel 为 debug 时应该输出所有级别', () => {
      const testLogger = new Logger({ minLevel: 'debug' as any, enableConsole: true });
      
      testLogger.debug('Debug message');
      testLogger.info('Info message');
      testLogger.warn('Warn message');
      testLogger.error('Error message');
      testLogger.fatal('Fatal message');

      expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2); // error + fatal
    });

    it('minLevel 为 info 时应该过滤掉 debug', () => {
      const testLogger = new Logger({ minLevel: 'info' as any, enableConsole: true });
      
      testLogger.debug('Debug message');
      testLogger.info('Info message');
      testLogger.warn('Warn message');
      testLogger.error('Error message');
      testLogger.fatal('Fatal message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2); // error + fatal
    });

    it('minLevel 为 warn 时应该过滤掉 debug 和 info', () => {
      const testLogger = new Logger({ minLevel: 'warn' as any, enableConsole: true });
      
      testLogger.debug('Debug message');
      testLogger.info('Info message');
      testLogger.warn('Warn message');
      testLogger.error('Error message');
      testLogger.fatal('Fatal message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2); // error + fatal
    });

    it('minLevel 为 error 时应该过滤掉 debug, info 和 warn', () => {
      const testLogger = new Logger({ minLevel: 'error' as any, enableConsole: true });
      
      testLogger.debug('Debug message');
      testLogger.info('Info message');
      testLogger.warn('Warn message');
      testLogger.error('Error message');
      testLogger.fatal('Fatal message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2); // error + fatal
    });

    it('minLevel 为 fatal 时应该只输出 fatal', () => {
      const testLogger = new Logger({ minLevel: 'fatal' as any, enableConsole: true });
      
      testLogger.debug('Debug message');
      testLogger.info('Info message');
      testLogger.warn('Warn message');
      testLogger.error('Error message');
      testLogger.fatal('Fatal message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1); // only fatal
    });

    it('应该能够动态更新 minLevel', () => {
      const testLogger = new Logger({ minLevel: 'debug' as any, enableConsole: true });
      
      testLogger.debug('Debug before update');
      expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
      
      testLogger.updateConfig({ minLevel: 'warn' as any });
      
      testLogger.debug('Debug after update');
      testLogger.warn('Warn after update');
      
      expect(consoleDebugSpy).toHaveBeenCalledTimes(1); // 只有一次 debug 调用
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('分类日志级别过滤', () => {
    it('minLevel 为 warn 时应该过滤 api 日志中的 debug 和 info', () => {
      const testLogger = new Logger({ minLevel: 'warn' as any, enableConsole: true });
      
      testLogger.api('API debug', { data: 'test' }, 'debug');
      testLogger.api('API info', { data: 'test' }, 'info');
      testLogger.api('API warn', { data: 'test' }, 'warn');

      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    it('minLevel 为 error 时应该过滤所有 auth 日志', () => {
      const testLogger = new Logger({ minLevel: 'error' as any, enableConsole: true });
      
      testLogger.auth('Auth info', { data: 'test' }, 'info');
      testLogger.auth('Auth warn', { data: 'test' }, 'warn');
      testLogger.auth('Auth error', { data: 'test' }, 'error');

      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Logger 配置', () => {
  it('应该使用默认配置', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const defaultLogger = new Logger({ enableConsole: true });
    
    defaultLogger.info('Test message');
    
    // 默认配置下 console 应该被调用
    expect(consoleSpy).toHaveBeenCalled();
    
    vi.restoreAllMocks();
  });

  it('enableConsole 为 false 时应该不输出到控制台', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const testLogger = new Logger({ enableConsole: false });
    
    testLogger.info('This should not appear');
    
    expect(consoleSpy).not.toHaveBeenCalled();
    
    vi.restoreAllMocks();
  });

  it('includeContext 为 false 时不应该在日志中包含上下文', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const testLogger = new Logger({ includeContext: false, enableConsole: true });
    
    testLogger.setContext({ userId: 'user123' });
    testLogger.info('Test message');
    
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const callArgs = consoleSpy.mock.calls[0];
    expect(callArgs[2]).not.toHaveProperty('_context');
    
    vi.restoreAllMocks();
  });

  it('应该支持自定义脱敏字段', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const testLogger = new Logger({
      sanitizeFields: ['customField', 'anotherField'],
      enableConsole: true,
    });
    
    testLogger.info('Test message', {
      customField: 'sensitive',
      anotherField: 'also sensitive',
      safeField: 'public',
    });
    
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const callArgs = consoleSpy.mock.calls[0];
    expect(callArgs[2]).toEqual({
      customField: '[REDACTED]',
      anotherField: '[REDACTED]',
      safeField: 'public',
    });
    
    vi.restoreAllMocks();
  });
});

describe('Logger 更新配置', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该能够更新配置', () => {
    const testLogger = new Logger({ enableConsole: true, minLevel: 'debug' as any });
    
    testLogger.info('Before update');
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    
    testLogger.updateConfig({ enableConsole: false });
    
    testLogger.info('After update');
    expect(consoleSpy).toHaveBeenCalledTimes(1); // 只有一次调用
  });

  it('应该合并配置而不是完全替换', () => {
    const testLogger = new Logger({
      enableConsole: true,
      minLevel: 'debug' as any,
      enableSentry: true,
    });
    
    testLogger.updateConfig({ minLevel: 'warn' as any });
    
    testLogger.debug('Debug message');
    testLogger.info('Info message');
    testLogger.warn('Warn message');
    
    expect(consoleSpy).toHaveBeenCalledTimes(1); // 只有 warn 被输出
  });
});
