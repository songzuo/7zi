// @ts-nocheck
/**
 * Plugin System Tests
 * Core functionality tests for the plugin system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PluginManager } from '../PluginManager';
import { PluginRegistry } from '../PluginRegistry';
import { PluginLoader } from '../PluginLoader';
import { PluginSandbox } from '../PluginSandbox';
import { PluginHooks } from '../PluginHooks';
import { Plugin, PluginMetadata, PluginConfig, PluginContext } from '../types';

// Mock plugin for testing
class MockPlugin implements Plugin {
  metadata: PluginMetadata = {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    description: 'A test plugin',
  };

  config: PluginConfig = {
    id: this.metadata.id,
    enabled: true,
  };

  private initialized = false;
  private started = false;

  async init(context: PluginContext): Promise<void> {
    this.initialized = true;
    context.logger.info('Plugin initialized');
  }

  async start(): Promise<void> {
    this.started = true;
  }

  async stop(): Promise<void> {
    this.started = false;
  }

  async destroy(): Promise<void> {
    this.initialized = false;
    this.started = false;
  }

  async execute<TInput = unknown, TOutput = unknown>(
    action: string,
    input?: TInput
  ): Promise<TOutput> {
    if (action === 'test') {
      return { success: true, input } as TOutput;
    }
    throw new Error(`Unknown action: ${action}`);
  }
}

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  it('should register a plugin', () => {
    const plugin = new MockPlugin();
    registry.register(plugin);

    expect(registry.has(plugin.metadata.id)).toBe(true);
    expect(registry.get(plugin.metadata.id)).toBe(plugin);
  });

  it('should unregister a plugin', () => {
    const plugin = new MockPlugin();
    registry.register(plugin);
    registry.unregister(plugin.metadata.id);

    expect(registry.has(plugin.metadata.id)).toBe(false);
  });

  it('should get all plugins', () => {
    const plugin1 = new MockPlugin();
    plugin1.metadata.id = 'plugin-1';
    
    const plugin2 = new MockPlugin();
    plugin2.metadata.id = 'plugin-2';

    registry.register(plugin1);
    registry.register(plugin2);

    const all = registry.getAll();
    expect(all).toHaveLength(2);
  });

  it('should search plugins', () => {
    const plugin = new MockPlugin();
    plugin.metadata.category = 'utility';
    plugin.metadata.tags = ['test', 'mock'];
    
    registry.register(plugin);

    const results = registry.search({ category: 'utility' });
    expect(results).toHaveLength(1);
    expect(results[0]).toBe(plugin);
  });
});

describe('PluginHooks', () => {
  let hooks: PluginHooks;

  beforeEach(() => {
    hooks = new PluginHooks();
  });

  it('should register a hook', () => {
    const handler = vi.fn();
    hooks.register('beforeExecute', handler);

    expect(hooks.has('beforeExecute')).toBe(true);
    expect(hooks.count('beforeExecute')).toBe(1);
  });

  it('should execute hooks', async () => {
    const handler = vi.fn().mockReturnValue('result');
    hooks.register('beforeExecute', handler);

    const results = await hooks.execute('beforeExecute', { data: 'test' });

    expect(handler).toHaveBeenCalled();
    expect(results).toEqual(['result']);
  });

  it('should execute hooks in priority order', async () => {
    const order: number[] = [];
    
    hooks.register('test', () => { order.push(1); }, { priority: 1 });
    hooks.register('test', () => { order.push(2); }, { priority: 2 });
    hooks.register('test', () => { order.push(3); }, { priority: 3 });

    await hooks.execute('test');

    // Higher priority should execute first
    expect(order).toEqual([3, 2, 1]);
  });

  it('should unregister a hook', () => {
    const handler = vi.fn();
    hooks.register('beforeExecute', handler);
    hooks.unregister('beforeExecute', handler);

    expect(hooks.has('beforeExecute')).toBe(false);
  });
});

describe('PluginSandbox', () => {
  let sandbox: PluginSandbox;

  beforeEach(() => {
    sandbox = new PluginSandbox();
  });

  afterEach(async () => {
    sandbox.clear();
  });

  it('should create a sandbox', async () => {
    const context = await sandbox.create('test-plugin', []);

    expect(context).toBeDefined();
    expect(context.global).toBeDefined();
    expect(context.console).toBeDefined();
  });

  it('should execute code in sandbox', async () => {
    await sandbox.create('test-plugin', []);

    const result = await sandbox.execute('test-plugin', 'return 1 + 1');

    expect(result).toBe(2);
  });

  it('should validate code', async () => {
    const validCode = 'const x = 1;';
    const result = await sandbox.validate(validCode);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect dangerous code', async () => {
    const dangerousCode = 'eval("alert(1)")';
    const result = await sandbox.validate(dangerousCode);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should destroy sandbox', async () => {
    await sandbox.create('test-plugin', []);
    await sandbox.destroy('test-plugin');

    const status = sandbox.getStatus('test-plugin');
    expect(status.active).toBe(false);
  });
});

describe('PluginManager', () => {
  let manager: PluginManager;
  let registry: PluginRegistry;
  let loader: PluginLoader;
  let sandbox: PluginSandbox;
  let hooks: PluginHooks;

  beforeEach(() => {
    registry = new PluginRegistry();
    loader = new PluginLoader();
    sandbox = new PluginSandbox();
    hooks = new PluginHooks();
    manager = new PluginManager(registry, loader, sandbox, hooks);
  });

  afterEach(async () => {
    // Cleanup
    sandbox.clear();
    hooks.clear();
  });

  it('should load a plugin', async () => {
    const plugin = new MockPlugin();
    registry.register(plugin);

    await manager.loadPlugin('test-plugin');

    expect(manager.getPlugin('test-plugin')).toBeDefined();
  });

  it('should unload a plugin', async () => {
    const plugin = new MockPlugin();
    registry.register(plugin);

    await manager.loadPlugin('test-plugin');
    await manager.unloadPlugin('test-plugin');

    expect(manager.getPlugin('test-plugin')).toBeUndefined();
  });

  it('should initialize a plugin', async () => {
    const plugin = new MockPlugin();
    registry.register(plugin);

    await manager.loadPlugin('test-plugin');
    await manager.initPlugin('test-plugin');

    // Plugin should be initialized
    expect(manager.getPlugin('test-plugin')).toBeDefined();
  });

  it('should execute plugin action', async () => {
    const plugin = new MockPlugin();
    registry.register(plugin);

    await manager.loadPlugin('test-plugin');
    await manager.initPlugin('test-plugin');
    await manager.startPlugin('test-plugin');

    const result = await manager.execute('test-plugin', 'test', { data: 'test' });

    expect(result).toEqual({ success: true, input: { data: 'test' } });
  });

  it('should get health status', async () => {
    const plugin = new MockPlugin();
    registry.register(plugin);

    await manager.loadPlugin('test-plugin');

    const health = await manager.getHealthStatus('test-plugin');

    expect(health.status).toBeDefined();
    expect(health.timestamp).toBeInstanceOf(Date);
  });

  it('should get metrics', async () => {
    const plugin = new MockPlugin();
    registry.register(plugin);

    await manager.loadPlugin('test-plugin');

    const metrics = await manager.getMetrics('test-plugin');

    expect(metrics.timestamp).toBeInstanceOf(Date);
  });
});

describe('Plugin System Integration', () => {
  it('should support full plugin lifecycle', async () => {
    const registry = new PluginRegistry();
    const loader = new PluginLoader();
    const sandbox = new PluginSandbox();
    const hooks = new PluginHooks();
    const manager = new PluginManager(registry, loader, sandbox, hooks);

    const plugin = new MockPlugin();
    registry.register(plugin);

    // Load
    await manager.loadPlugin('test-plugin');
    expect(manager.getPlugin('test-plugin')).toBeDefined();

    // Initialize
    await manager.initPlugin('test-plugin');

    // Start
    await manager.startPlugin('test-plugin');

    // Execute
    const result = await manager.execute('test-plugin', 'test', { test: true });
    expect(result).toEqual({ success: true, input: { test: true } });

    // Stop
    await manager.stopPlugin('test-plugin');

    // Unload
    await manager.unloadPlugin('test-plugin');
    expect(manager.getPlugin('test-plugin')).toBeUndefined();

    // Cleanup
    sandbox.clear();
    hooks.clear();
  });
});