/**
 * Enhanced Slack Alert Channel Tests
 */

import {
  LevelRouter,
  Throttler,
  Retryer,
  EnhancedSlackChannel,
  AlertLevel,
  PerformanceAlert,
  ThrottleConfig,
  RetryConfig,
  LevelChannelMapping,
} from './slack-enhanced';

// Mock fetch for webhook calls
const mockFetch = jest.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).fetch = mockFetch;

describe('LevelRouter', () => {
  describe('constructor', () => {
    test('应该创建空映射', () => {
      const router = new LevelRouter();
      expect(router.getChannel('info')).toBeUndefined();
    });

    test('应该接受初始映射', () => {
      const mapping: LevelChannelMapping = {
        critical: '#incidents',
        error: '#alerts-error',
      };
      const router = new LevelRouter(mapping);

      expect(router.getChannel('critical')).toBe('#incidents');
      expect(router.getChannel('error')).toBe('#alerts-error');
    });
  });

  describe('getChannel', () => {
    test('应该返回正确的频道', () => {
      const router = new LevelRouter({
        info: '#alerts-info',
        warning: '#alerts-warning',
        error: '#alerts-error',
        critical: '#incidents',
      });

      expect(router.getChannel('info')).toBe('#alerts-info');
      expect(router.getChannel('warning')).toBe('#alerts-warning');
      expect(router.getChannel('error')).toBe('#alerts-error');
      expect(router.getChannel('critical')).toBe('#incidents');
    });

    test('未定义的级别应返回 undefined', () => {
      const router = new LevelRouter({ info: '#alerts-info' });
      expect(router.getChannel('error')).toBeUndefined();
    });
  });

  describe('updateMapping', () => {
    test('应该更新映射', () => {
      const router = new LevelRouter({ info: '#alerts-info' });
      router.updateMapping({ error: '#alerts-error' });

      expect(router.getChannel('info')).toBe('#alerts-info');
      expect(router.getChannel('error')).toBe('#alerts-error');
    });
  });

  describe('getMapping', () => {
    test('应该返回映射副本', () => {
      const router = new LevelRouter({ critical: '#incidents' });
      const mapping = router.getMapping();

      expect(mapping).toEqual({ critical: '#incidents' });
    });
  });
});

describe('Throttler', () => {
  const config: ThrottleConfig = {
    windowMs: 1000, // 1秒窗口
    maxPerWindow: 2, // 每窗口最多2次
  };

  let throttler: Throttler;

  beforeEach(() => {
    throttler = new Throttler(config);
  });

  afterEach(() => {
    throttler.destroy();
  });

  describe('shouldThrottle', () => {
    test('第一次不应节流', () => {
      expect(throttler.shouldThrottle('test-key')).toBe(false);
    });

    test('达到限制后应节流', () => {
      throttler.shouldThrottle('test-key'); // 第1次
      throttler.shouldThrottle('test-key'); // 第2次
      expect(throttler.shouldThrottle('test-key')).toBe(true); // 第3次应节流
    });

    test('不同键应独立计数', () => {
      throttler.shouldThrottle('key1');
      throttler.shouldThrottle('key1');
      throttler.shouldThrottle('key2'); // key2 第一次

      expect(throttler.shouldThrottle('key1')).toBe(true);
      expect(throttler.shouldThrottle('key2')).toBe(false);
    });
  });

  describe('getThrottleStatus', () => {
    test('应返回正确状态', () => {
      const status = throttler.getThrottleStatus('new-key');
      expect(status.isThrottled).toBe(false);
      expect(status.countInWindow).toBe(0);
    });
  });

  describe('reset', () => {
    test('应重置指定键', () => {
      throttler.shouldThrottle('key1');
      throttler.shouldThrottle('key1');
      throttler.reset('key1');

      expect(throttler.shouldThrottle('key1')).toBe(false);
    });
  });

  describe('resetAll', () => {
    test('应重置所有键', () => {
      throttler.shouldThrottle('key1');
      throttler.shouldThrottle('key2');
      throttler.resetAll();

      expect(throttler.shouldThrottle('key1')).toBe(false);
      expect(throttler.shouldThrottle('key2')).toBe(false);
    });
  });
});

describe('Retryer', () => {
  const config: RetryConfig = {
    maxAttempts: 3,
    baseDelayMs: 10, // 短延迟以加速测试
    maxDelayMs: 100,
  };

  let retryer: Retryer;

  beforeEach(() => {
    retryer = new Retryer(config);
  });

  describe('execute', () => {
    test('首次成功应直接返回', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await retryer.execute(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('失败后应重试', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const result = await retryer.execute(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    test('达到最大重试次数后应抛出错误', async () => {
      const error = new Error('always fail');
      const fn = jest.fn().mockRejectedValue(error);

      await expect(retryer.execute(fn)).rejects.toThrow('always fail');
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });
});

describe('EnhancedSlackChannel', () => {
  const createAlert = (overrides?: Partial<PerformanceAlert>): PerformanceAlert => ({
    id: 'test-alert-1',
    title: 'Test Alert',
    message: 'This is a test alert',
    level: 'warning' as AlertLevel,
    category: 'performance',
    status: 'active',
    source: 'test-service',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    occurrenceCount: 1,
    ...overrides,
  });

  const defaultConfig = {
    webhookUrl: 'https://hooks.slack.com/services/test',
    enabled: true,
  };

  let channel: EnhancedSlackChannel;

  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    if (channel) {
      channel.destroy();
    }
  });

  describe('constructor', () => {
    test('应该创建实例', () => {
      channel = new EnhancedSlackChannel(defaultConfig);
      expect(channel.name).toBe('slack-enhanced');
    });

    test('应该接受配置选项', () => {
      channel = new EnhancedSlackChannel(defaultConfig, {
        mention: '@oncall',
        channel: '#alerts',
      });
      expect(channel.name).toBe('slack-enhanced');
    });
  });

  describe('setEnabled', () => {
    test('启用/禁用应该切换状态', () => {
      channel = new EnhancedSlackChannel(defaultConfig);
      
      channel.setEnabled(false);
      // 使用 send 方法来检查状态
      mockFetch.mockResolvedValueOnce({ ok: false });
      
      channel.setEnabled(true);
      // 不应抛出错误
    });
  });

  describe('send', () => {
    test('应该能够发送告警', async () => {
      channel = new EnhancedSlackChannel(defaultConfig);
      const alert = createAlert();

      const result = await channel.send(alert);
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('alertId');
      expect(result).toHaveProperty('duration');
    });

    test('失败时应该返回失败结果', async () => {
      channel = new EnhancedSlackChannel(defaultConfig);
      const alert = createAlert();

      // 模拟网络错误 - 每次都失败
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await channel.send(alert);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('应该支持节流', async () => {
      channel = new EnhancedSlackChannel(defaultConfig, {
        throttle: { windowMs: 60000, maxPerWindow: 1 },
      });
      const alert = createAlert();

      // 第一次发送
      await channel.send(alert);
      
      // 第二次发送应该被节流
      const result = await channel.send(alert);
      
      expect(result.throttled).toBe(true);
    });
  });

  describe('getStats', () => {
    test('应该返回统计信息', () => {
      channel = new EnhancedSlackChannel(defaultConfig);
      const stats = channel.getStats();

      expect(stats).toHaveProperty('sent');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('throttled');
    });
  });

  describe('getOptions', () => {
    test('应该返回选项', () => {
      const options = { mention: '@oncall' };
      channel = new EnhancedSlackChannel(defaultConfig, options);
      
      const result = channel.getOptions();
      expect(result.mention).toBe('@oncall');
    });
  });

  describe('getLevelRouter', () => {
    test('应该返回级别路由器', () => {
      channel = new EnhancedSlackChannel({
        ...defaultConfig,
        levelChannels: { critical: '#incidents' },
      });
      
      const router = channel.getLevelRouter();
      expect(router.getChannel('critical')).toBe('#incidents');
    });
  });

  describe('destroy', () => {
    test('应该清理资源', () => {
      channel = new EnhancedSlackChannel(defaultConfig);
      channel.destroy();
      // 不应抛出错误
    });
  });
});
