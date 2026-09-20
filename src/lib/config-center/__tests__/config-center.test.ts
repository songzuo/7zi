/**
 * 配置中心测试
 * @module config-center/__tests__/config-center.test
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createMemoryConfigCenter,
  ConfigManager,
  MemoryStorageAdapter,
  ConfigCenterUtils,
} from '../index';

describe('ConfigCenter', () => {
  let configCenter: ConfigManager;

  beforeAll(async () => {
    configCenter = createMemoryConfigCenter({
      defaultEnvironment: 'development',
      enableCache: true,
      enableVersioning: true,
      enableAuditLog: true,
      enableAccessControl: true,
    });

    await configCenter.initialize();
  });

  afterAll(async () => {
    await configCenter.close();
  });

  describe('Basic Operations', () => {
    it('should set and get config', async () => {
      await configCenter.set('test.key', 'value1', {
        userId: 'test-user',
        description: 'Test config',
      });

      const value = await configCenter.get<string>('test.key');
      expect(value).toBe('value1');
    });

    it('should return undefined for non-existent config', async () => {
      const value = await configCenter.get<string>('non.existent.key');
      expect(value).toBeUndefined();
    });

    it('should return default value for non-existent config', async () => {
      const value = await configCenter.get<string>('non.existent.key', undefined, {
        defaultValue: 'default',
      });
      expect(value).toBe('default');
    });

    it('should set and get multiple configs', async () => {
      await configCenter.set('multi.key1', 'value1', { userId: 'test-user' });
      await configCenter.set('multi.key2', 'value2', { userId: 'test-user' });

      const configs = await configCenter.getMultiple<string>(['multi.key1', 'multi.key2']);
      expect(configs['multi.key1']).toBe('value1');
      expect(configs['multi.key2']).toBe('value2');
    });

    it('should delete config', async () => {
      await configCenter.set('delete.key', 'value', { userId: 'test-user' });
      
      await configCenter.delete('delete.key', 'development', { userId: 'test-user' });
      
      const value = await configCenter.get<string>('delete.key');
      expect(value).toBeUndefined();
    });
  });

  describe('Environment Management', () => {
    it('should set config for different environments', async () => {
      await configCenter.set('env.key', 'dev-value', {
        userId: 'test-user',
        environment: 'development',
      });

      await configCenter.set('env.key', 'prod-value', {
        userId: 'test-user',
        environment: 'production',
      });

      const devValue = await configCenter.get<string>('env.key', 'development');
      const prodValue = await configCenter.get<string>('env.key', 'production');

      expect(devValue).toBe('dev-value');
      expect(prodValue).toBe('prod-value');
    });

    it('should get environment manager', () => {
      const envManager = configCenter.getEnvironmentManager();
      expect(envManager).toBeDefined();

      const environments = envManager.getEnvironments();
      expect(environments.length).toBeGreaterThan(0);
    });
  });

  describe('Config Groups', () => {
    it('should set config with group', async () => {
      await configCenter.set('group.test', 'value', {
        userId: 'test-user',
        group: 'test-group',
      });

      const configs = await configCenter.query({ group: 'test-group' });
      expect(configs.length).toBeGreaterThan(0);
      expect(configs[0].group).toBe('test-group');
    });
  });

  describe('Config Validation', () => {
    it('should validate required config', async () => {
      await expect(
        configCenter.set('required.key', '', {
          userId: 'test-user',
          validation: {
            required: true,
          },
        })
      ).rejects.toThrow();
    });

    it('should validate min/max values', async () => {
      await expect(
        configCenter.set('range.key', 150, {
          userId: 'test-user',
          validation: {
            min: 1,
            max: 100,
          },
        })
      ).rejects.toThrow();
    });

    it('should validate pattern', async () => {
      await expect(
        configCenter.set('email.key', 'invalid-email', {
          userId: 'test-user',
          validation: {
            pattern: '^[^@]+@[^@]+\\.[^@]+$',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Config Change Listeners', () => {
    it('should notify on config change', async () => {
      let notified = false;
      
      const unsubscribe = configCenter.onChange('listener.key', () => {
        notified = true;
      });

      await configCenter.set('listener.key', 'value', { userId: 'test-user' });
      
      expect(notified).toBe(true);
      
      unsubscribe();
    });

    it('should notify wildcard listeners', async () => {
      const changes: string[] = [];
      
      const unsubscribe = configCenter.onChange('*', (event) => {
        changes.push(event.config.key);
      });

      await configCenter.set('wildcard.key1', 'value1', { userId: 'test-user' });
      await configCenter.set('wildcard.key2', 'value2', { userId: 'test-user' });

      expect(changes.length).toBe(2);
      
      unsubscribe();
    });
  });

  describe('Cache', () => {
    it('should cache config values', async () => {
      await configCenter.set('cache.key', 'value', { userId: 'test-user' });

      // 第一次获取 (从存储)
      await configCenter.get<string>('cache.key');

      // 第二次获取 (从缓存)
      const value = await configCenter.get<string>('cache.key');
      expect(value).toBe('value');
    });

    it('should clear cache', async () => {
      await configCenter.set('cache.clear.key', 'value', { userId: 'test-user' });
      
      configCenter.clearCache('cache.clear.key');
      
      const value = await configCenter.get<string>('cache.clear.key');
      expect(value).toBe('value');
    });
  });

  describe('Query', () => {
    beforeAll(async () => {
      await configCenter.set('query.key1', 'value1', {
        userId: 'user1',
        group: 'group1',
      });
      await configCenter.set('query.key2', 'value2', {
        userId: 'user2',
        group: 'group1',
      });
      await configCenter.set('query.key3', 'value3', {
        userId: 'user1',
        group: 'group2',
      });
    });

    it('should query by group', async () => {
      const configs = await configCenter.query({ group: 'group1' });
      expect(configs.length).toBe(2);
    });

    it('should query by creator', async () => {
      const configs = await configCenter.query({ createdBy: 'user1' });
      expect(configs.every(c => c.createdBy === 'user1')).toBe(true);
    });

    it('should query with pagination', async () => {
      const configs = await configCenter.query({
        pagination: {
          offset: 0,
          limit: 1,
        },
      });
      expect(configs.length).toBe(1);
    });
  });

  describe('Hot Reload', () => {
    it('should hot reload dynamic configs', async () => {
      await configCenter.set('hot.reload.key', 'value', {
        userId: 'test-user',
        dynamic: true,
      });

      const result = await configCenter.hotReload();
      expect(result.success).toBe(true);
      expect(result.reloadedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Version Management', () => {
    it('should create version on config set', async () => {
      await configCenter.set('version.key', 'v1', { userId: 'test-user' });
      await configCenter.set('version.key', 'v2', { userId: 'test-user' });

      const versionManager = configCenter.getVersionManager();
      const stats = await versionManager.getVersionStats('version.key');

      expect(stats.totalVersions).toBeGreaterThan(0);
    });
  });

  describe('Audit Log', () => {
    it('should log config changes', async () => {
      await configCenter.set('audit.key', 'value', { userId: 'audit-user' });

      const auditLogger = configCenter.getAuditLogger();
      expect(auditLogger).toBeDefined();
      expect(auditLogger).not.toBeNull();

      const logs = await auditLogger!.query({
        resourceId: 'audit.key',
      });

      expect(logs.length).toBeGreaterThan(0);
    });
  });
});

describe('ConfigCenterUtils', () => {
  describe('validateConfigKey', () => {
    it('should validate correct keys', () => {
      expect(ConfigCenterUtils.validateConfigKey('app.name')).toBe(true);
      expect(ConfigCenterUtils.validateConfigKey('database_host')).toBe(true);
      expect(ConfigCenterUtils.validateConfigKey('api-endpoint')).toBe(true);
    });

    it('should reject invalid keys', () => {
      expect(ConfigCenterUtils.validateConfigKey('123key')).toBe(false);
      expect(ConfigCenterUtils.validateConfigKey('key with space')).toBe(false);
      expect(ConfigCenterUtils.validateConfigKey('')).toBe(false);
    });
  });

  describe('normalizeConfigKey', () => {
    it('should normalize keys', () => {
      expect(ConfigCenterUtils.normalizeConfigKey('App.Name')).toBe('app.name');
      expect(ConfigCenterUtils.normalizeConfigKey('Database Host')).toBe('database_host');
    });
  });

  describe('parseConfigPath', () => {
    it('should parse simple key', () => {
      const result = ConfigCenterUtils.parseConfigPath('app.name');
      expect(result.key).toBe('app.name');
      expect(result.environment).toBeUndefined();
      expect(result.group).toBeUndefined();
    });

    it('should parse environment/key', () => {
      const result = ConfigCenterUtils.parseConfigPath('production/app.name');
      expect(result.environment).toBe('production');
      expect(result.key).toBe('app.name');
    });

    it('should parse environment/group/key', () => {
      const result = ConfigCenterUtils.parseConfigPath('production/database/host');
      expect(result.environment).toBe('production');
      expect(result.group).toBe('database');
      expect(result.key).toBe('host');
    });
  });

  describe('deepMerge', () => {
    it('should merge objects deeply', () => {
      const target = {
        a: 1,
        b: {
          c: 2,
          d: 3,
        },
      };

      const source = {
        b: {
          d: 4,
        },
      };

      const result = ConfigCenterUtils.deepMerge(target, source as any);

      expect(result.a).toBe(1);
      expect(result.b.c).toBe(2);
      expect(result.b.d).toBe(4);
    });
  });
});

describe('MemoryStorageAdapter', () => {
  let adapter: MemoryStorageAdapter;

  beforeAll(async () => {
    adapter = new MemoryStorageAdapter();
    await adapter.initialize();
  });

  afterAll(async () => {
    await adapter.close();
  });

  it('should store and retrieve config', async () => {
    const config = {
      id: 'test-id',
      key: 'test.key',
      value: 'test-value',
      valueType: 'string' as const,
      environment: 'development' as const,
      group: 'default',
      status: 'active' as const,
      sensitive: false,
      dynamic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user',
      updatedBy: 'test-user',
      version: 1,
    };

    await adapter.setConfig(config);
    const retrieved = await adapter.getConfig('test.key', 'development');

    expect(retrieved).not.toBeNull();
    expect(retrieved?.value).toBe('test-value');
  });

  it('should delete config', async () => {
    await adapter.deleteConfig('test.key', 'development');
    const retrieved = await adapter.getConfig('test.key', 'development');

    expect(retrieved).toBeNull();
  });
});
