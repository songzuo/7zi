/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logger, log } from '../index';
import type { LogLevel } from '../utils';

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn((callback) => {
    const mockScope = {
      setTag: vi.fn(),
      setUser: vi.fn(),
      setContext: vi.fn(),
      setLevel: vi.fn(),
    };
    callback(mockScope);
  }),
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

// Mock console methods
const consoleMock = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe('Logger singleton', () => {
  let originalLoggerConfig: typeof logger;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Mock console methods
    global.console.debug = consoleMock.debug;
    global.console.info = consoleMock.info;
    global.console.warn = consoleMock.warn;
    global.console.error = consoleMock.error;

    // Store original config to restore after tests
    originalLoggerConfig = logger;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export a singleton logger instance', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.fatal).toBe('function');
  });

  describe('debug', () => {
    it('should log debug messages', () => {
      logger.debug('debug message');

      expect(consoleMock.debug).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        'debug message',
        expect.any(Object)
      );
    });

    it('should log debug messages with data', () => {
      const data = { userId: '123', action: 'test' };
      logger.debug('debug message', data);

      expect(consoleMock.debug).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        'debug message',
        expect.objectContaining({ userId: '123', action: 'test' })
      );
    });
  });

  describe('info', () => {
    it('should log info messages', () => {
      logger.info('info message');

      expect(consoleMock.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        'info message',
        expect.any(Object)
      );
    });

    it('should log info messages with data', () => {
      const data = { count: 42 };
      logger.info('info message', data);

      expect(consoleMock.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        'info message',
        expect.objectContaining({ count: 42 })
      );
    });
  });

  describe('warn', () => {
    it('should log warning messages', () => {
      logger.warn('warning message');

      expect(consoleMock.warn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]'),
        'warning message',
        expect.any(Object)
      );
    });

    it('should log warning messages with data', () => {
      const data = { warning: 'high' };
      logger.warn('warning message', data);

      expect(consoleMock.warn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]'),
        'warning message',
        expect.objectContaining({ warning: 'high' })
      );
    });
  });

  describe('error', () => {
    it('should log error messages', () => {
      logger.error('error message');

      expect(consoleMock.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        'error message',
        '',
        expect.any(Object)
      );
    });

    it('should log error messages with error object', () => {
      const error = new Error('Test error');
      logger.error('error message', error);

      expect(consoleMock.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        'error message',
        error,
        expect.any(Object)
      );
    });

    it('should log error messages with error and data', () => {
      const error = new Error('Test error');
      const data = { userId: '123' };
      logger.error('error message', error, data);

      expect(consoleMock.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        'error message',
        error,
        expect.objectContaining({ userId: '123' })
      );
    });
  });

  describe('fatal', () => {
    it('should log fatal messages', () => {
      logger.fatal('fatal message');

      expect(consoleMock.error).toHaveBeenCalledWith(
        expect.stringContaining('[FATAL]'),
        'fatal message',
        '',
        expect.any(Object)
      );
    });

    it('should log fatal messages with error object', () => {
      const error = new Error('Fatal error');
      logger.fatal('fatal message', error);

      expect(consoleMock.error).toHaveBeenCalledWith(
        expect.stringContaining('[FATAL]'),
        'fatal message',
        error,
        expect.any(Object)
      );
    });
  });

  describe('categorized logging methods', () => {
    describe('api', () => {
      it('should log API messages with default level', () => {
        logger.api('API request', { url: '/api/test' });

        expect(consoleMock.info).toHaveBeenCalledWith(
          expect.stringContaining('[INFO]'),
          'API request',
          expect.objectContaining({ url: '/api/test' })
        );
      });

      it('should log API messages with custom level', () => {
        logger.api('API warning', { url: '/api/test' }, 'warn' as LogLevel);

        expect(consoleMock.warn).toHaveBeenCalledWith(
          expect.stringContaining('[WARN]'),
          'API warning',
          expect.objectContaining({ url: '/api/test' })
        );
      });
    });

    describe('auth', () => {
      it('should log auth messages with default level', () => {
        logger.auth('User login', { userId: '123' });

        expect(consoleMock.info).toHaveBeenCalledWith(
          expect.stringContaining('[INFO]'),
          'User login',
          expect.objectContaining({ userId: '123' })
        );
      });

      it('should log auth messages with custom level', () => {
        logger.auth('Auth failed', { reason: 'invalid' }, 'error' as LogLevel);

        expect(consoleMock.error).toHaveBeenCalled();
        const callArgs = consoleMock.error.mock.calls[0];
        expect(callArgs[1]).toBe('Auth failed');
        // For error level, callArgs[2] is the error parameter (''), callArgs[3] is the data
        expect(callArgs[3]).toEqual(expect.objectContaining({ reason: 'invalid' }));
      });
    });

    describe('perf', () => {
      it('should log performance messages', () => {
        logger.perf('Page load time', { duration: 1234 });

        expect(consoleMock.info).toHaveBeenCalledWith(
          expect.stringContaining('[INFO]'),
          'Page load time',
          expect.objectContaining({ duration: 1234 })
        );
      });
    });

    describe('user', () => {
      it('should log user action messages', () => {
        logger.user('Button click', { button: 'submit' });

        expect(consoleMock.info).toHaveBeenCalledWith(
          expect.stringContaining('[INFO]'),
          'Button click',
          expect.objectContaining({ button: 'submit' })
        );
      });
    });

    describe('security', () => {
      it('should log security messages with default level', () => {
        logger.security('Suspicious activity', { ip: '1.2.3.4' });

        expect(consoleMock.warn).toHaveBeenCalledWith(
          expect.stringContaining('[WARN]'),
          'Suspicious activity',
          expect.objectContaining({ ip: '1.2.3.4' })
        );
      });

      it('should log security messages with custom level', () => {
        logger.security('Security breach', { severity: 'critical' }, 'error' as LogLevel);

        expect(consoleMock.error).toHaveBeenCalled();
        const callArgs = consoleMock.error.mock.calls[0];
        expect(callArgs[1]).toBe('Security breach');
        // For error level, callArgs[2] is the error parameter (''), callArgs[3] is the data
        expect(callArgs[3]).toEqual(expect.objectContaining({ severity: 'critical' }));
      });
    });

    describe('business', () => {
      it('should log business logic messages', () => {
        logger.business('Order created', { orderId: '12345' });

        expect(consoleMock.info).toHaveBeenCalledWith(
          expect.stringContaining('[INFO]'),
          'Order created',
          expect.objectContaining({ orderId: '12345' })
        );
      });
    });
  });

  describe('data sanitization', () => {
    it('should sanitize sensitive data in logs', () => {
      const data = {
        username: 'john',
        password: 'secret123',
        token: 'abc-xyz'
      };

      logger.info('User login attempt', data);

      expect(consoleMock.info).toHaveBeenCalled();
      const callArgs = consoleMock.info.mock.calls[0];
      const loggedData = callArgs[2];

      // Password should be redacted
      expect(loggedData.password).toBe('[REDACTED]');
      // Token should be redacted
      expect(loggedData.token).toBe('[REDACTED]');
      // Username should be visible
      expect(loggedData.username).toBe('john');
    });

    it('should sanitize nested sensitive data', () => {
      const data = {
        user: {
          username: 'john',
          credentials: {
            password: 'secret',
            apiKey: 'key123'
          }
        }
      };

      logger.info('User data', data);

      expect(consoleMock.info).toHaveBeenCalled();
      const callArgs = consoleMock.info.mock.calls[0];
      const loggedData = callArgs[2];

      expect(loggedData.user.credentials.password).toBe('[REDACTED]');
      expect(loggedData.user.credentials.apiKey).toBe('[REDACTED]');
      expect(loggedData.user.username).toBe('john');
    });

    it('should sanitize array items', () => {
      const data = {
        users: [
          { name: 'John', password: 'pass1' },
          { name: 'Jane', password: 'pass2' }
        ]
      };

      logger.info('Users list', data);

      expect(consoleMock.info).toHaveBeenCalled();
      const callArgs = consoleMock.info.mock.calls[0];
      const loggedData = callArgs[2];

      expect(loggedData.users[0].password).toBe('[REDACTED]');
      expect(loggedData.users[1].password).toBe('[REDACTED]');
      expect(loggedData.users[0].name).toBe('John');
    });
  });
});

describe('log convenience object', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console.debug = consoleMock.debug;
    global.console.info = consoleMock.info;
    global.console.warn = consoleMock.warn;
    global.console.error = consoleMock.error;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should provide log.debug method', () => {
    log.debug('debug message');
    expect(consoleMock.debug).toHaveBeenCalled();
  });

  it('should provide log.info method', () => {
    log.info('info message');
    expect(consoleMock.info).toHaveBeenCalled();
  });

  it('should provide log.warn method', () => {
    log.warn('warn message');
    expect(consoleMock.warn).toHaveBeenCalled();
  });

  it('should provide log.error method', () => {
    log.error('error message');
    expect(consoleMock.error).toHaveBeenCalled();
  });

  it('should provide log.fatal method', () => {
    log.fatal('fatal message');
    expect(consoleMock.error).toHaveBeenCalled();
  });

  it('should provide log.api method', () => {
    log.api('api message');
    expect(consoleMock.info).toHaveBeenCalled();
  });

  it('should provide log.auth method', () => {
    log.auth('auth message');
    expect(consoleMock.info).toHaveBeenCalled();
  });

  it('should provide log.perf method', () => {
    log.perf('perf message');
    expect(consoleMock.info).toHaveBeenCalled();
  });

  it('should provide log.user method', () => {
    log.user('user message');
    expect(consoleMock.info).toHaveBeenCalled();
  });

  it('should provide log.security method', () => {
    log.security('security message');
    expect(consoleMock.warn).toHaveBeenCalled();
  });

  it('should provide log.business method', () => {
    log.business('business message');
    expect(consoleMock.info).toHaveBeenCalled();
  });

  it('should pass data to convenience methods', () => {
    const data = { test: 'value' };
    log.info('message', data);

    expect(consoleMock.info).toHaveBeenCalledTimes(1);
    const callArgs = consoleMock.info.mock.calls[0];
    expect(callArgs[1]).toBe('message');
    expect(callArgs[2]).toEqual(expect.objectContaining({ test: 'value' }));
  });

  it('should pass custom level to categorized methods', () => {
    log.api('api message', { data: 'test' }, 'error' as LogLevel);

    expect(consoleMock.error).toHaveBeenCalled();
  });
});

describe('Integration tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.console.debug = consoleMock.debug;
    global.console.info = consoleMock.info;
    global.console.warn = consoleMock.warn;
    global.console.error = consoleMock.error;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle complex logging scenario', () => {
    logger.debug('Debug info', { debug: 'data' });
    logger.info('User action', { action: 'click' });
    logger.warn('Warning', { warning: 'high' });
    logger.error('Error occurred', new Error('Test error'), { userId: 'user123' });
    logger.fatal('Fatal error', new Error('Fatal'));

    expect(consoleMock.debug).toHaveBeenCalledTimes(1);
    expect(consoleMock.info).toHaveBeenCalledTimes(1);
    expect(consoleMock.warn).toHaveBeenCalledTimes(1);
    expect(consoleMock.error).toHaveBeenCalledTimes(2);
  });
});
