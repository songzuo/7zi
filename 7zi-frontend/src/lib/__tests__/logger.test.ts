import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  LogLevel,
  ConsoleTransport,
  MemoryTransport,
  FilterTransport,
  Logger,
  logger,
  createLogger,
  type LogEntry,
} from '../logger';

describe('Logger 模块', () => {
  describe('LogLevel 枚举', () => {
    it('应该具有正确的级别值', () => {
      expect(LogLevel.DEBUG).toBe(0);
      expect(LogLevel.INFO).toBe(1);
      expect(LogLevel.WARN).toBe(2);
      expect(LogLevel.ERROR).toBe(3);
      expect(LogLevel.FATAL).toBe(4);
    });
  });

  describe('ConsoleTransport', () => {
    it('应该输出到控制台', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const transport = new ConsoleTransport({ colorize: false, includeTimestamp: false });

      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Test message',
        timestamp: new Date(),
      };

      transport.log(entry);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('[INFO]');
      expect(output).toContain('Test message');

      consoleSpy.mockRestore();
    });

    it('应该根据日志级别使用不同的控制台方法', () => {
      const logSpy = vi.spyOn(console, 'log');
      const warnSpy = vi.spyOn(console, 'warn');
      const errorSpy = vi.spyOn(console, 'error');

      const transport = new ConsoleTransport({
        colorize: false,
        includeTimestamp: false,
        includeContext: false,
      });

      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Test',
        timestamp: new Date(),
      };

      transport.log({ ...entry, level: LogLevel.DEBUG });
      transport.log({ ...entry, level: LogLevel.INFO });
      transport.log({ ...entry, level: LogLevel.WARN });
      transport.log({ ...entry, level: LogLevel.ERROR });
      transport.log({ ...entry, level: LogLevel.FATAL });

      expect(logSpy).toHaveBeenCalledTimes(2); // DEBUG + INFO
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledTimes(2); // ERROR + FATAL

      logSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('应该支持自定义选项', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const transport = new ConsoleTransport({
        colorize: false,
        includeTimestamp: true,
        includeContext: true,
      });

      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Test',
        timestamp: new Date('2024-01-01T00:00:00.000Z'),
        context: { key: 'value' },
      };

      transport.log(entry);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('2024-01-01');
      expect(output).toContain('[INFO]');
      expect(output).toContain('{"key":"value"}');

      consoleSpy.mockRestore();
    });

    it('应该正确格式化错误信息', () => {
      const errorSpy = vi.spyOn(console, 'error');
      const transport = new ConsoleTransport({
        colorize: false,
        includeTimestamp: false,
        includeContext: false,
      });

      const testError = new Error('Test error');
      const entry: LogEntry = {
        level: LogLevel.ERROR,
        message: 'Error occurred',
        timestamp: new Date(),
        error: testError,
        stack: testError.stack,
      };

      transport.log(entry);

      expect(errorSpy).toHaveBeenCalled();
      const output = errorSpy.mock.calls[0][0] as string;
      expect(output).toContain('Error occurred');
      expect(output).toContain('Test error');
      expect(output).toContain('Stack:');

      errorSpy.mockRestore();
    });
  });

  describe('MemoryTransport', () => {
    let transport: MemoryTransport;

    beforeEach(() => {
      transport = new MemoryTransport();
    });

    it('应该存储日志条目', () => {
      const entry: LogEntry = {
        level: LogLevel.INFO,
        message: 'Test message',
        timestamp: new Date(),
      };

      transport.log(entry);

      expect(transport.logs).toHaveLength(1);
      expect(transport.logs[0]).toEqual(entry);
    });

    it('应该存储多个日志条目', () => {
      transport.log({
        level: LogLevel.INFO,
        message: 'Message 1',
        timestamp: new Date(),
      });

      transport.log({
        level: LogLevel.WARN,
        message: 'Message 2',
        timestamp: new Date(),
      });

      expect(transport.logs).toHaveLength(2);
      expect(transport.logs[0].message).toBe('Message 1');
      expect(transport.logs[1].message).toBe('Message 2');
    });

    it('getLogs 应该返回所有日志', () => {
      transport.log({
        level: LogLevel.INFO,
        message: 'Test',
        timestamp: new Date(),
      });

      const logs = transport.getLogs();
      expect(logs).toHaveLength(1);
    });

    it('getLogs 应该按级别过滤', () => {
      transport.log({ level: LogLevel.DEBUG, message: 'Debug', timestamp: new Date() });
      transport.log({ level: LogLevel.INFO, message: 'Info', timestamp: new Date() });
      transport.log({ level: LogLevel.WARN, message: 'Warn', timestamp: new Date() });
      transport.log({ level: LogLevel.ERROR, message: 'Error', timestamp: new Date() });

      const errorLogs = transport.getLogs(LogLevel.ERROR);
      expect(errorLogs).toHaveLength(2); // ERROR + FATAL (none)
      expect(errorLogs[0].message).toBe('Error');

      const infoLogs = transport.getLogs(LogLevel.INFO);
      expect(infoLogs).toHaveLength(3); // INFO, WARN, ERROR
    });

    it('getLastLog 应该返回最后一条日志', () => {
      transport.log({ level: LogLevel.INFO, message: 'First', timestamp: new Date() });
      transport.log({ level: LogLevel.WARN, message: 'Second', timestamp: new Date() });

      const lastLog = transport.getLastLog();
      expect(lastLog?.message).toBe('Second');
    });

    it('clear 应该清除所有日志', () => {
      transport.log({ level: LogLevel.INFO, message: 'Test', timestamp: new Date() });
      expect(transport.logs).toHaveLength(1);

      transport.clear();
      expect(transport.logs).toHaveLength(0);
    });
  });

  describe('FilterTransport', () => {
    it('应该过滤低于指定级别的日志', () => {
      const memoryTransport = new MemoryTransport();
      const filterTransport = new FilterTransport(memoryTransport, LogLevel.WARN);

      filterTransport.log({
        level: LogLevel.DEBUG,
        message: 'Debug',
        timestamp: new Date(),
      });

      filterTransport.log({
        level: LogLevel.WARN,
        message: 'Warn',
        timestamp: new Date(),
      });

      filterTransport.log({
        level: LogLevel.ERROR,
        message: 'Error',
        timestamp: new Date(),
      });

      expect(memoryTransport.logs).toHaveLength(2);
      expect(memoryTransport.logs[0].message).toBe('Warn');
      expect(memoryTransport.logs[1].message).toBe('Error');
    });

    it('应该允许通过所有级别为 INFO 的日志', () => {
      const memoryTransport = new MemoryTransport();
      const filterTransport = new FilterTransport(memoryTransport, LogLevel.INFO);

      filterTransport.log({ level: LogLevel.DEBUG, message: 'Debug', timestamp: new Date() });
      filterTransport.log({ level: LogLevel.INFO, message: 'Info', timestamp: new Date() });
      filterTransport.log({ level: LogLevel.WARN, message: 'Warn', timestamp: new Date() });

      expect(memoryTransport.logs).toHaveLength(2);
      expect(memoryTransport.logs[0].level).toBe(LogLevel.INFO);
      expect(memoryTransport.logs[1].level).toBe(LogLevel.WARN);
    });
  });

  describe('Logger', () => {
    let logger: Logger;
    let memoryTransport: MemoryTransport;

    beforeEach(() => {
      memoryTransport = new MemoryTransport();
      logger = new Logger({
        level: LogLevel.DEBUG,
        transports: [memoryTransport],
      });
    });

    describe('基本功能', () => {
      it('应该记录 DEBUG 级别日志', () => {
        logger.debug('Debug message');

        expect(memoryTransport.logs).toHaveLength(1);
        expect(memoryTransport.logs[0].level).toBe(LogLevel.DEBUG);
        expect(memoryTransport.logs[0].message).toBe('Debug message');
      });

      it('应该记录 INFO 级别日志', () => {
        logger.info('Info message');

        expect(memoryTransport.logs).toHaveLength(1);
        expect(memoryTransport.logs[0].level).toBe(LogLevel.INFO);
      });

      it('应该记录 WARN 级别日志', () => {
        logger.warn('Warn message');

        expect(memoryTransport.logs).toHaveLength(1);
        expect(memoryTransport.logs[0].level).toBe(LogLevel.WARN);
      });

      it('应该记录 ERROR 级别日志', () => {
        logger.error('Error message');

        expect(memoryTransport.logs).toHaveLength(1);
        expect(memoryTransport.logs[0].level).toBe(LogLevel.ERROR);
      });

      it('应该记录 FATAL 级别日志', () => {
        logger.fatal('Fatal message');

        expect(memoryTransport.logs).toHaveLength(1);
        expect(memoryTransport.logs[0].level).toBe(LogLevel.FATAL);
      });
    });

    describe('日志级别过滤', () => {
      it('应该根据设置的级别过滤日志', () => {
        logger.setLevel(LogLevel.WARN);

        logger.debug('Debug');
        logger.info('Info');
        logger.warn('Warn');
        logger.error('Error');

        expect(memoryTransport.logs).toHaveLength(2);
        expect(memoryTransport.logs[0].level).toBe(LogLevel.WARN);
        expect(memoryTransport.logs[1].level).toBe(LogLevel.ERROR);
      });

      it('getLevel 应该返回当前级别', () => {
        logger.setLevel(LogLevel.ERROR);
        expect(logger.getLevel()).toBe(LogLevel.ERROR);
      });
    });

    describe('上下文管理', () => {
      it('应该包含上下文信息', () => {
        logger.addContext({ userId: '123' });
        logger.info('User action');

        expect(memoryTransport.logs[0].context).toEqual({ userId: '123' });
      });

      it('应该支持多个上下文字段', () => {
        logger.addContext({ userId: '123' });
        logger.addContext({ action: 'login' });
        logger.info('Test');

        expect(memoryTransport.logs[0].context).toEqual({
          userId: '123',
          action: 'login',
        });
      });

      it('应该支持日志级别的上下文', () => {
        logger.addContext({ userId: '123' });
        logger.info('Test', { extra: 'value' });

        expect(memoryTransport.logs[0].context).toEqual({
          userId: '123',
          extra: 'value',
        });
      });

      it('clearContext 应该清除上下文', () => {
        logger.addContext({ userId: '123' });
        logger.clearContext();
        logger.info('Test');

        expect(memoryTransport.logs[0].context).toBeUndefined();
      });
    });

    describe('错误处理', () => {
      it('应该正确处理错误信息', () => {
        const testError = new Error('Test error');
        logger.error('An error occurred', testError);

        expect(memoryTransport.logs[0].error).toBe(testError);
        expect(memoryTransport.logs[0].stack).toBe(testError.stack);
      });

      it('fatal 应该处理错误信息', () => {
        const testError = new Error('Fatal error');
        logger.fatal('Fatal', testError);

        expect(memoryTransport.logs[0].error).toBe(testError);
      });
    });

    describe('传输管理', () => {
      it('应该添加传输', () => {
        const newTransport = new MemoryTransport();
        logger.addTransport(newTransport);

        logger.info('Test');

        expect(memoryTransport.logs).toHaveLength(1);
        expect((newTransport as MemoryTransport).logs).toHaveLength(1);
      });

      it('应该移除传输', () => {
        logger.removeTransport('memory');

        logger.info('Test');

        expect(memoryTransport.logs).toHaveLength(0);
      });

      it('应该支持多个传输', () => {
        const transport1 = new MemoryTransport();
        const transport2 = new MemoryTransport();

        logger = new Logger({
          level: LogLevel.DEBUG,
          transports: [transport1, transport2],
        });

        logger.info('Test');

        expect((transport1 as MemoryTransport).logs).toHaveLength(1);
        expect((transport2 as MemoryTransport).logs).toHaveLength(1);
      });
    });

    describe('子 Logger', () => {
      it('应该创建继承上下文的子 Logger', () => {
        logger.addContext({ userId: '123' });
        const childLogger = logger.child({ action: 'test' });

        childLogger.info('Test');

        expect(memoryTransport.logs[0].context).toEqual({
          userId: '123',
          action: 'test',
        });
      });

      it('子 Logger 应该继承级别', () => {
        logger.setLevel(LogLevel.WARN);
        const childLogger = logger.child({});

        childLogger.info('Info');
        childLogger.warn('Warn');

        expect(memoryTransport.logs).toHaveLength(1);
        expect(memoryTransport.logs[0].level).toBe(LogLevel.WARN);
      });

      it('子 Logger 应该继承传输', () => {
        const childLogger = logger.child({ test: 'child' });

        childLogger.info('Test');

        expect(memoryTransport.logs).toHaveLength(1);
      });

      it('子 Logger 的上下文不应该影响父 Logger', () => {
        const childLogger = logger.child({ child: 'value' });

        logger.info('Parent');
        childLogger.info('Child');

        expect(memoryTransport.logs[0].context).toEqual({});
        expect(memoryTransport.logs[1].context).toEqual({ child: 'value' });
      });
    });

    describe('时间戳', () => {
      it('应该自动添加时间戳', () => {
        const before = Date.now();
        logger.info('Test');
        const after = Date.now();

        const logTime = memoryTransport.logs[0].timestamp.getTime();
        expect(logTime).toBeGreaterThanOrEqual(before);
        expect(logTime).toBeLessThanOrEqual(after);
      });
    });
  });

  describe('默认 Logger 实例', () => {
    it('应该导出默认 logger 实例', () => {
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(Logger);
    });

    it('默认 logger 应该有控制台传输', () => {
      expect((logger as any).transports.length).toBeGreaterThan(0);
      expect((logger as any).transports[0].name).toBe('console');
    });
  });

  describe('createLogger 便捷函数', () => {
    it('应该创建带有上下文的 logger', () => {
      const newLogger = createLogger({ module: 'test' });
      expect(newLogger).toBeInstanceOf(Logger);
    });
  });

  describe('集成测试', () => {
    it('应该支持完整的日志记录流程', () => {
      const memoryTransport = new MemoryTransport();
      const filterTransport = new FilterTransport(memoryTransport, LogLevel.INFO);

      const logger = new Logger({
        level: LogLevel.DEBUG,
        context: { app: 'test' },
        transports: [filterTransport],
      });

      logger.debug('This should be filtered');
      logger.info('This should be logged', { user: '123' });
      logger.warn('Warning message');
      logger.error('Error occurred', new Error('Test error'));

      expect(memoryTransport.logs).toHaveLength(3);
      expect(memoryTransport.logs[0].message).toBe('This should be logged');
      expect(memoryTransport.logs[1].message).toBe('Warning message');
      expect(memoryTransport.logs[2].message).toBe('Error occurred');

      // 检查上下文
      expect(memoryTransport.logs[0].context).toEqual({ app: 'test', user: '123' });
      expect(memoryTransport.logs[2].error).toBeDefined();
    });

    it('应该支持多个子 Logger', () => {
      const memoryTransport = new MemoryTransport();
      const logger = new Logger({
        level: LogLevel.DEBUG,
        transports: [memoryTransport],
      });

      const module1 = logger.child({ module: 'auth' });
      const module2 = logger.child({ module: 'database' });

      module1.info('Auth action');
      module2.info('Database query');

      expect(memoryTransport.logs).toHaveLength(2);
      expect(memoryTransport.logs[0].context).toEqual({ module: 'auth' });
      expect(memoryTransport.logs[1].context).toEqual({ module: 'database' });
    });

    it('应该正确处理传输错误', () => {
      const errorSpy = vi.spyOn(console, 'error');
      const badTransport = {
        name: 'bad',
        log: () => {
          throw new Error('Transport error');
        },
      };

      const goodTransport = new MemoryTransport();
      const logger = new Logger({
        level: LogLevel.DEBUG,
        transports: [badTransport, goodTransport],
      });

      logger.info('Test');

      // 坏的传输应该被捕获，好的传输应该正常工作
      expect(errorSpy).toHaveBeenCalled();
      expect(goodTransport.logs).toHaveLength(1);

      errorSpy.mockRestore();
    });
  });

  describe('边界情况', () => {
    it('应该处理空消息', () => {
      const memoryTransport = new MemoryTransport();
      const logger = new Logger({ transports: [memoryTransport] });

      logger.info('');

      expect(memoryTransport.logs[0].message).toBe('');
    });

    it('应该处理空上下文', () => {
      const memoryTransport = new MemoryTransport();
      const logger = new Logger({ transports: [memoryTransport] });

      logger.info('Test', {});

      expect(memoryTransport.logs[0].context).toBeUndefined();
    });

    it('应该处理 undefined 错误', () => {
      const memoryTransport = new MemoryTransport();
      const logger = new Logger({ transports: [memoryTransport] });

      logger.error('Test', undefined);

      expect(memoryTransport.logs[0].error).toBeUndefined();
    });

    it('应该处理深层嵌套的上下文', () => {
      const memoryTransport = new MemoryTransport();
      const logger = new Logger({ transports: [memoryTransport] });

      logger.info('Test', { nested: { deep: { value: 'test' } } });

      expect(memoryTransport.logs[0].context).toEqual({
        nested: { deep: { value: 'test' } },
      });
    });
  });
});
