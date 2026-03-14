/**
 * Logger 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock console methods to capture output
const mockConsoleDebug = vi.fn();
const mockConsoleInfo = vi.fn();
const mockConsoleWarn = vi.fn();
const mockConsoleError = vi.fn();
const mockConsoleLog = vi.fn();

describe('Logger', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    vi.stubGlobal('console', {
      debug: mockConsoleDebug,
      info: mockConsoleInfo,
      warn: mockConsoleWarn,
      error: mockConsoleError,
      log: mockConsoleLog,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalEnv) {
      process.env.NODE_ENV = originalEnv;
    } else {
      delete process.env.NODE_ENV;
    }
    vi.resetModules();
  });

  describe('createLogger', () => {
    it('应该创建带有命名空间的 logger', async () => {
      process.env.NODE_ENV = 'development';
      
      const { createLogger } = await import('@/lib/logger');
      
      const logger = createLogger('TestNamespace');
      logger.info('test message');
      
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        '[TestNamespace] test message'
      );
    });

    it('应该为不同模块创建独立的 logger', async () => {
      process.env.NODE_ENV = 'development';
      
      const { createLogger, apiLogger, authLogger } = await import('@/lib/logger');
      
      const customLogger = createLogger('Custom');
      
      customLogger.info('custom message');
      apiLogger.info('api message');
      authLogger.info('auth message');
      
      expect(mockConsoleInfo).toHaveBeenCalledWith('[Custom] custom message');
      expect(mockConsoleInfo).toHaveBeenCalledWith('[API] api message');
      expect(mockConsoleInfo).toHaveBeenCalledWith('[Auth] auth message');
    });
  });

  describe('log levels', () => {
    it('应该在开发环境输出 debug 日志', async () => {
      process.env.NODE_ENV = 'development';
      
      const { createLogger } = await import('@/lib/logger');
      const logger = createLogger('DebugTest');
      
      logger.debug('debug message');
      
      expect(mockConsoleDebug).toHaveBeenCalledWith('[DebugTest] debug message');
    });

    it('应该始终输出 warn 日志', async () => {
      process.env.NODE_ENV = 'production';
      
      const { createLogger } = await import('@/lib/logger');
      const logger = createLogger('WarnTest');
      
      logger.warn('warning message');
      
      expect(mockConsoleWarn).toHaveBeenCalledWith('[WarnTest] warning message');
    });

    it('应该始终输出 error 日志', async () => {
      process.env.NODE_ENV = 'production';
      
      const { createLogger } = await import('@/lib/logger');
      const logger = createLogger('ErrorTest');
      
      logger.error('error message');
      
      expect(mockConsoleError).toHaveBeenCalledWith('[ErrorTest] error message');
    });

    it('应该支持 info 日志级别', async () => {
      process.env.NODE_ENV = 'development';
      
      const { createLogger } = await import('@/lib/logger');
      const logger = createLogger('InfoTest');
      
      logger.info('info message');
      
      expect(mockConsoleInfo).toHaveBeenCalledWith('[InfoTest] info message');
    });
  });

  describe('audit logging', () => {
    it('应该始终记录审计日志 (开发环境)', async () => {
      process.env.NODE_ENV = 'development';
      
      const { createLogger } = await import('@/lib/logger');
      const logger = createLogger('AuditTest');
      
      logger.audit('USER_LOGIN', { userId: 'user-123', ip: '192.168.1.1' });
      
      expect(mockConsoleLog).toHaveBeenCalled();
      const callArgs = mockConsoleLog.mock.calls[0];
      expect(callArgs[0]).toContain('[Audit]');
      expect(callArgs[0]).toContain('USER_LOGIN');
    });

    it('应该始终记录审计日志 (生产环境)', async () => {
      process.env.NODE_ENV = 'production';
      
      const { createLogger } = await import('@/lib/logger');
      const logger = createLogger('AuditTest');
      
      logger.audit('USER_LOGOUT', { userId: 'user-456' });
      
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('审计日志应该包含时间戳', async () => {
      process.env.NODE_ENV = 'development';
      
      const { createLogger } = await import('@/lib/logger');
      const logger = createLogger('AuditTimestamp');
      
      logger.audit('TEST_ACTION', { data: 'test' });
      
      // 审计日志第二个参数是一个对象
      const callArgs = mockConsoleLog.mock.calls[0];
      expect(callArgs[1]).toHaveProperty('timestamp');
    });
  });

  describe('error logging', () => {
    it('应该记录 Error 对象', async () => {
      process.env.NODE_ENV = 'development';
      
      const { createLogger } = await import('@/lib/logger');
      const logger = createLogger('ErrorLog');
      
      const error = new Error('Test error message');
      logger.error('operation failed', error);
      
      expect(mockConsoleError).toHaveBeenCalled();
    });
  });

  describe('pre-configured loggers', () => {
    it('应该导出预配置的 logger', async () => {
      const { apiLogger, authLogger, cacheLogger, securityLogger } = await import('@/lib/logger');
      
      expect(apiLogger).toBeDefined();
      expect(authLogger).toBeDefined();
      expect(cacheLogger).toBeDefined();
      expect(securityLogger).toBeDefined();
    });

    it('应该为所有预配置 logger 设置正确的命名空间', async () => {
      process.env.NODE_ENV = 'development';
      
      const { apiLogger, authLogger, cacheLogger, securityLogger, evomapLogger, pwaLogger, swLogger, dbLogger } = await import('@/lib/logger');
      
      apiLogger.info('api test');
      authLogger.info('auth test');
      cacheLogger.info('cache test');
      securityLogger.info('security test');
      evomapLogger.info('evomap test');
      pwaLogger.info('pwa test');
      swLogger.info('sw test');
      dbLogger.info('db test');
      
      expect(mockConsoleInfo).toHaveBeenCalledWith('[API] api test');
      expect(mockConsoleInfo).toHaveBeenCalledWith('[Auth] auth test');
      expect(mockConsoleInfo).toHaveBeenCalledWith('[Cache] cache test');
      expect(mockConsoleInfo).toHaveBeenCalledWith('[Security] security test');
      expect(mockConsoleInfo).toHaveBeenCalledWith('[Evomap] evomap test');
      expect(mockConsoleInfo).toHaveBeenCalledWith('[PWA] pwa test');
      expect(mockConsoleInfo).toHaveBeenCalledWith('[SW] sw test');
      expect(mockConsoleInfo).toHaveBeenCalledWith('[DB] db test');
    });
  });
});
