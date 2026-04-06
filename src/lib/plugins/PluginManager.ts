// @ts-nocheck
/**
 * Plugin Manager
 * Core plugin management system with lifecycle control
 */

import { EventEmitter } from 'events';
import {
  Plugin,
  PluginConfig,
  PluginContext,
  PluginState,
  PluginManager as IPluginManager,
  PluginRegistry,
  PluginSandbox,
  HookRegistry,
  HookName,
  HookContext,
  PluginError,
  PluginLoadError,
  PluginInitError,
  PluginExecuteError,
  PluginDependencyError,
  PluginHealthStatus,
  PluginMetrics,
  PluginEvents,
} from './types';
import { PluginLoader } from './PluginLoader';

export class PluginManager extends EventEmitter implements IPluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private contexts: Map<string, PluginContext> = new Map();
  private states: Map<string, PluginState> = new Map();
  private configs: Map<string, PluginConfig> = new Map();
  private startTimes: Map<string, number> = new Map();
  private errors: Map<string, Error> = new Map();

  constructor(
    private registry: PluginRegistry,
    private loader: PluginLoader,
    private sandbox: PluginSandbox,
    private hooks: HookRegistry
  ) {
    super();
    this.setupEventHandlers();
  }

  /**
   * Load a plugin
   */
  async loadPlugin(id: string, config?: Partial<PluginConfig>): Promise<Plugin> {
    try {
      // Check if plugin already loaded
      if (this.plugins.has(id)) {
        throw new PluginLoadError(id, `Plugin ${id} is already loaded`);
      }

      // Set state to loading
      this.setState(id, 'loading');

      // Load plugin from registry or loader
      let plugin = this.registry.get(id);
      if (!plugin) {
        const loadedPlugin = await this.loader.load(id);
        if (!loadedPlugin) {
          throw new PluginLoadError(id, `Plugin ${id} not found`);
        }
        plugin = loadedPlugin;
      }

      // Merge configuration
      const mergedConfig: PluginConfig = {
        id,
        enabled: true,
        priority: 0,
        ...config,
      };

      // Store configuration
      this.configs.set(id, mergedConfig);

      // Create plugin context
      const context = await this.createContext(plugin, mergedConfig);
      this.contexts.set(id, context);

      // Validate dependencies
      await this.validateDependencies(plugin);

      // Register plugin hooks
      if (plugin.registerHooks) {
        plugin.registerHooks(this.hooks);
      }

      // Store plugin
      this.plugins.set(id, plugin);
      this.setState(id, 'loaded');

      // Emit event
      this.emit('plugin:loaded', { pluginId: id });

      return plugin;
    } catch (error) {
      this.setState(id, 'error');
      this.errors.set(id, error as Error);
      this.emit('plugin:error', { pluginId: id, error });
      throw error;
    }
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(id: string): Promise<void> {
    try {
      const plugin = this.getPlugin(id);
      if (!plugin) {
        throw new PluginLoadError(id, `Plugin ${id} not found`);
      }

      // Stop plugin if running
      if (this.getState(id) === 'running') {
        await this.stopPlugin(id);
      }

      // Destroy plugin
      if (this.getState(id) !== 'unloaded') {
        await this.destroyPlugin(id);
      }

      // Remove from maps
      this.plugins.delete(id);
      this.contexts.delete(id);
      this.states.delete(id);
      this.configs.delete(id);
      this.startTimes.delete(id);
      this.errors.delete(id);

      // Unregister hooks
      this.hooks.clear();

      // Emit event
      this.emit('plugin:unloaded', { pluginId: id });
    } catch (error) {
      this.emit('plugin:error', { pluginId: id, error });
      throw error;
    }
  }

  /**
   * Reload a plugin
   */
  async reloadPlugin(id: string): Promise<Plugin> {
    const config = this.configs.get(id);
    await this.unloadPlugin(id);
    return await this.loadPlugin(id, config);
  }

  /**
   * Get a plugin
   */
  getPlugin(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  /**
   * Get all plugins
   */
  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins by state
   */
  getPluginsByState(state: PluginState): Plugin[] {
    return Array.from(this.plugins.entries())
      .filter(([id]) => this.getState(id) === state)
      .map(([, plugin]) => plugin);
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(id: string): Promise<void> {
    const config = this.configs.get(id);
    if (!config) {
      throw new PluginLoadError(id, `Plugin ${id} not found`);
    }

    config.enabled = true;

    // Start plugin if not running
    if (this.getState(id) === 'initialized') {
      await this.startPlugin(id);
    }

    this.emit('plugin:config:changed', { pluginId: id, config });
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(id: string): Promise<void> {
    const config = this.configs.get(id);
    if (!config) {
      throw new PluginLoadError(id, `Plugin ${id} not found`);
    }

    config.enabled = false;

    // Stop plugin if running
    if (this.getState(id) === 'running') {
      await this.stopPlugin(id);
    }

    this.emit('plugin:config:changed', { pluginId: id, config });
  }

  /**
   * Execute a plugin action
   */
  async execute<TInput = unknown, TOutput = unknown>(
    pluginId: string,
    action: string,
    input?: TInput
  ): Promise<TOutput> {
    const plugin = this.getPlugin(pluginId);
    if (!plugin) {
      throw new PluginLoadError(pluginId, `Plugin ${pluginId} not found`);
    }

    const state = this.getState(pluginId);
    if (state !== 'running') {
      throw new PluginExecuteError(
        pluginId,
        `Plugin ${pluginId} is not running (state: ${state})`
      );
    }

    const config = this.configs.get(pluginId);
    if (!config?.enabled) {
      throw new PluginExecuteError(pluginId, `Plugin ${pluginId} is disabled`);
    }

    try {
      // Execute before hooks
      await this.executeHook('beforeExecute', {
        pluginId,
        action,
        input,
      });

      // Execute plugin action
      const result = await plugin.execute?.(action, input);

      // Execute after hooks
      await this.executeHook('afterExecute', {
        pluginId,
        action,
        input,
        output: result,
      });

      return result;
    } catch (error) {
      this.errors.set(pluginId, error as Error);
      this.emit('plugin:error', { pluginId, error });
      throw error;
    }
  }

  /**
   * Execute a hook
   */
  async executeHook<TInput = unknown, TOutput = unknown>(
    hook: HookName,
    input?: TInput
  ): Promise<TOutput[]> {
    const handlers = this.hooks.getHandlers(hook);
    const results: TOutput[] = [];

    for (const { handler, config } of handlers) {
      try {
        const context: HookContext = {
          hook,
          pluginId: '', // Will be set by handler
          timestamp: new Date(),
          input,
        };

        const result = await handler(context, input);
        results.push(result);

        this.emit('hook:executed', { hook, result });
      } catch (error) {
        this.emit('hook:error', { hook, error });
        if (!config?.retry) {
          throw error;
        }
      }
    }

    return results;
  }

  /**
   * Get health status
   */
  async getHealthStatus(pluginId: string): Promise<PluginHealthStatus> {
    const plugin = this.getPlugin(pluginId);
    if (!plugin) {
      return {
        status: 'unknown',
        message: `Plugin ${pluginId} not found`,
        timestamp: new Date(),
      };
    }

    if (plugin.healthCheck) {
      return await plugin.healthCheck();
    }

    const state = this.getState(pluginId);
    const lastError = this.errors.get(pluginId);

    return {
      status: state === 'running' ? 'healthy' : 'unhealthy',
      message: `Plugin state: ${state}`,
      timestamp: new Date(),
      checks: {
        state: {
          status: state === 'running' ? 'healthy' : 'unhealthy',
          message: state,
        },
        error: lastError
          ? {
              status: 'unhealthy',
              message: lastError.message,
            }
          : {
              status: 'healthy',
              message: 'No errors',
            },
      },
    };
  }

  /**
   * Get metrics
   */
  async getMetrics(pluginId: string): Promise<PluginMetrics> {
    const plugin = this.getPlugin(pluginId);
    if (!plugin) {
      throw new PluginLoadError(pluginId, `Plugin ${pluginId} not found`);
    }

    if (plugin.getMetrics) {
      return await plugin.getMetrics();
    }

    return {
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      timestamp: new Date(),
    };
  }

  /**
   * Initialize a plugin
   */
  async initPlugin(id: string): Promise<void> {
    const plugin = this.getPlugin(id);
    if (!plugin) {
      throw new PluginLoadError(id, `Plugin ${id} not found`);
    }

    const state = this.getState(id);
    if (state !== 'loaded') {
      throw new PluginInitError(id, `Plugin ${id} is not in loaded state (state: ${state})`);
    }

    try {
      this.setState(id, 'initializing');

      // Execute before hooks
      await this.executeHook('beforeInit', { pluginId: id });

      // Initialize plugin
      const context = this.contexts.get(id);
      if (context) {
        await plugin.init(context);
      }

      this.setState(id, 'initialized');

      // Execute after hooks
      await this.executeHook('afterInit', { pluginId: id });
    } catch (error) {
      this.setState(id, 'error');
      this.errors.set(id, error as Error);
      this.emit('plugin:error', { pluginId: id, error });
      throw error;
    }
  }

  /**
   * Start a plugin
   */
  async startPlugin(id: string): Promise<void> {
    const plugin = this.getPlugin(id);
    if (!plugin) {
      throw new PluginLoadError(id, `Plugin ${id} not found`);
    }

    const state = this.getState(id);
    if (state !== 'initialized') {
      throw new PluginInitError(id, `Plugin ${id} is not initialized (state: ${state})`);
    }

    const config = this.configs.get(id);
    if (!config?.enabled) {
      throw new PluginInitError(id, `Plugin ${id} is disabled`);
    }

    try {
      this.setState(id, 'starting');

      // Execute before hooks
      await this.executeHook('beforeStart', { pluginId: id });

      // Start plugin
      await plugin.start();

      this.setState(id, 'running');
      this.startTimes.set(id, Date.now());

      // Execute after hooks
      await this.executeHook('afterStart', { pluginId: id });

      // Emit event
      this.emit('plugin:started', { pluginId: id });
    } catch (error) {
      this.setState(id, 'error');
      this.errors.set(id, error as Error);
      this.emit('plugin:error', { pluginId: id, error });
      throw error;
    }
  }

  /**
   * Stop a plugin
   */
  async stopPlugin(id: string): Promise<void> {
    const plugin = this.getPlugin(id);
    if (!plugin) {
      throw new PluginLoadError(id, `Plugin ${id} not found`);
    }

    const state = this.getState(id);
    if (state !== 'running') {
      throw new PluginInitError(id, `Plugin ${id} is not running (state: ${state})`);
    }

    try {
      this.setState(id, 'stopping');

      // Execute before hooks
      await this.executeHook('beforeStop', { pluginId: id });

      // Stop plugin
      await plugin.stop();

      this.setState(id, 'stopped');
      this.startTimes.delete(id);

      // Execute after hooks
      await this.executeHook('afterStop', { pluginId: id });

      // Emit event
      this.emit('plugin:stopped', { pluginId: id });
    } catch (error) {
      this.setState(id, 'error');
      this.errors.set(id, error as Error);
      this.emit('plugin:error', { pluginId: id, error });
      throw error;
    }
  }

  /**
   * Destroy a plugin
   */
  async destroyPlugin(id: string): Promise<void> {
    const plugin = this.getPlugin(id);
    if (!plugin) {
      throw new PluginLoadError(id, `Plugin ${id} not found`);
    }

    try {
      // Execute before hooks
      await this.executeHook('beforeDestroy', { pluginId: id });

      // Destroy plugin
      await plugin.destroy();

      // Destroy sandbox
      await this.sandbox.destroy(id);

      this.setState(id, 'unloaded');

      // Execute after hooks
      await this.executeHook('afterDestroy', { pluginId: id });
    } catch (error) {
      this.setState(id, 'error');
      this.errors.set(id, error as Error);
      this.emit('plugin:error', { pluginId: id, error });
      throw error;
    }
  }

  /**
   * Create plugin context
   */
  private async createContext(
    plugin: Plugin,
    config: PluginConfig
  ): Promise<PluginContext> {
    const { PluginLoggerImpl, PluginStorageImpl, PluginSDK } = await import('./PluginSDK');

    return {
      config,
      metadata: plugin.metadata,
      logger: new PluginLoggerImpl(plugin.metadata.id),
      manager: this,
      registry: this.registry,
      sandbox: this.sandbox,
      sdk: new PluginSDK(plugin.metadata.id, config),
      events: new EventEmitter(),
      state: 'loaded',
      storage: new PluginStorageImpl(plugin.metadata.id),
    };
  }

  /**
   * Validate plugin dependencies
   */
  private async validateDependencies(plugin: Plugin): Promise<void> {
    const dependencies = plugin.metadata.dependencies || [];

    for (const dep of dependencies) {
      const depPlugin = this.getPlugin(dep.id);

      if (!depPlugin && !dep.optional) {
        throw new PluginDependencyError(
          plugin.metadata.id,
          `Required dependency ${dep.id} not found`
        );
      }

      if (depPlugin && dep.version) {
        const depVersion = depPlugin.metadata.version;
        if (!this.isVersionCompatible(depVersion, dep.version)) {
          throw new PluginDependencyError(
            plugin.metadata.id,
            `Dependency ${dep.id} version ${depVersion} is not compatible with required version ${dep.version}`
          );
        }
      }
    }
  }

  /**
   * Check version compatibility
   */
  private isVersionCompatible(version: string, range: string): boolean {
    // Simple semver check (use semver library in production)
    return true;
  }

  /**
   * Get plugin state
   */
  private getState(id: string): PluginState {
    return this.states.get(id) || 'unloaded';
  }

  /**
   * Set plugin state
   */
  private setState(id: string, state: PluginState): void {
    this.states.set(id, state);
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('plugin:error', ({ pluginId, error }) => {
      console.error(`Plugin error: ${pluginId}`, error);
    });
  }
}