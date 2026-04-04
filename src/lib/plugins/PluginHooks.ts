/**
 * Plugin Hooks
 * Hook system for plugin lifecycle and events
 */

import { EventEmitter } from 'events';
import {
  HookRegistry as IHookRegistry,
  HookName,
  HookHandler,
  HookConfig,
  HookContext,
} from './types';

interface RegisteredHook {
  handler: HookHandler;
  config: HookConfig;
  pluginId?: string;
}

export class PluginHooks implements IHookRegistry {
  private hooks: Map<HookName, RegisteredHook[]> = new Map();
  private events: EventEmitter = new EventEmitter();

  /**
   * Register a hook handler
   */
  register<TInput = any, TOutput = any>(
    hook: HookName,
    handler: HookHandler<TInput, TOutput>,
    config: HookConfig = {}
  ): void {
    if (!this.hooks.has(hook)) {
      this.hooks.set(hook, []);
    }

    const hooks = this.hooks.get(hook)!;
    hooks.push({
      handler,
      config: {
        enabled: true,
        priority: 0,
        timeout: 5000,
        async: false,
        retry: false,
        ...config,
      },
    });

    // Sort by priority (higher priority first)
    hooks.sort((a, b) => (b.config.priority || 0) - (a.config.priority || 0));

    this.events.emit('hook:registered', { hook, config });
  }

  /**
   * Unregister a hook handler
   */
  unregister(hook: HookName, handler: HookHandler): void {
    const hooks = this.hooks.get(hook);
    if (!hooks) {
      return;
    }

    const index = hooks.findIndex((h) => h.handler === handler);
    if (index !== -1) {
      hooks.splice(index, 1);
      this.events.emit('hook:unregistered', { hook });
    }
  }

  /**
   * Get hook handlers
   */
  getHandlers(hook: HookName): Array<{ handler: HookHandler; config: HookConfig }> {
    return (this.hooks.get(hook) || [])
      .filter((h) => h.config.enabled !== false)
      .map((h) => ({ handler: h.handler, config: h.config }));
  }

  /**
   * Execute a hook
   */
  async execute<TInput = any, TOutput = any>(
    hook: HookName,
    input?: TInput
  ): Promise<TOutput[]> {
    const handlers = this.getHandlers(hook);
    const results: TOutput[] = [];

    for (const { handler, config } of handlers) {
      try {
        const context: HookContext = {
          hook,
          pluginId: '',
          timestamp: new Date(),
          input,
        };

        // Execute with timeout
        const result = await this.executeWithTimeout<TOutput>(
          handler(context, input) as Promise<TOutput>,
          config.timeout || 5000
        );

        results.push(result);

        this.events.emit('hook:executed', {
          hook,
          result,
          timestamp: new Date(),
        });
      } catch (error) {
        this.events.emit('hook:error', {
          hook,
          error,
          timestamp: new Date(),
        });

        if (!config.retry) {
          throw error;
        }
      }
    }

    return results;
  }

  /**
   * Execute hook with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeout: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Hook execution timed out after ${timeout}ms`));
      }, timeout);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Execute hook in parallel
   */
  async executeParallel<TInput = any, TOutput = any>(
    hook: HookName,
    input?: TInput
  ): Promise<TOutput[]> {
    const handlers = this.getHandlers(hook);
    const context: HookContext = {
      hook,
      pluginId: '',
      timestamp: new Date(),
      input,
    };

    const promises = handlers.map(async ({ handler, config }) => {
      try {
        return await this.executeWithTimeout(
          handler(context, input),
          config.timeout || 5000
        );
      } catch (error) {
        if (!config.retry) {
          throw error;
        }
        return undefined;
      }
    });

    const results = await Promise.all(promises);
    return results.filter((r): r is TOutput => r !== undefined);
  }

  /**
   * Execute hook with waterfall pattern
   */
  async executeWaterfall<T = any>(
    hook: HookName,
    initialInput: T
  ): Promise<T> {
    const handlers = this.getHandlers(hook);
    let currentValue = initialInput;

    for (const { handler, config } of handlers) {
      const context: HookContext = {
        hook,
        pluginId: '',
        timestamp: new Date(),
        input: currentValue,
      };

      try {
        currentValue = await this.executeWithTimeout(
          handler(context, currentValue),
          config.timeout || 5000
        );
      } catch (error) {
        if (!config.retry) {
          throw error;
        }
      }
    }

    return currentValue;
  }

  /**
   * Clear all hooks
   */
  clear(): void {
    this.hooks.clear();
    this.events.emit('hooks:cleared');
  }

  /**
   * Clear hooks by name
   */
  clearHook(hook: HookName): void {
    this.hooks.delete(hook);
    this.events.emit('hook:cleared', { hook });
  }

  /**
   * Check if hook exists
   */
  has(hook: HookName): boolean {
    const hooks = this.hooks.get(hook);
    return hooks !== undefined && hooks.length > 0;
  }

  /**
   * Get hook count
   */
  count(hook?: HookName): number {
    if (hook) {
      return this.hooks.get(hook)?.length || 0;
    }

    let total = 0;
    for (const hooks of this.hooks.values()) {
      total += hooks.length;
    }
    return total;
  }

  /**
   * List all registered hooks
   */
  list(): HookName[] {
    return Array.from(this.hooks.keys());
  }

  /**
   * Subscribe to hook events
   */
  on(event: string, listener: (...args: unknown[]) => void): this {
    this.events.on(event, listener);
    return this;
  }

  /**
   * Unsubscribe from hook events
   */
  off(event: string, listener: (...args: unknown[]) => void): this {
    this.events.off(event, listener);
    return this;
  }

  /**
   * Emit hook event
   */
  emit(event: string, ...args: any[]): boolean {
    return this.events.emit(event, ...args);
  }
}

/**
 * Built-in hooks
 */
export const BUILTIN_HOOKS: HookName[] = [
  'beforeInit',
  'afterInit',
  'beforeStart',
  'afterStart',
  'beforeStop',
  'afterStop',
  'beforeDestroy',
  'afterDestroy',
  'beforeExecute',
  'afterExecute',
  'onError',
  'onConfigChange',
  'onHealthCheck',
  'onMetrics',
  'onLog',
  'onRequest',
  'onResponse',
  'onMessage',
  'onEvent',
  'onDatabaseQuery',
  'onCacheHit',
  'onCacheMiss',
  'onAuthAttempt',
  'onAuthSuccess',
  'onAuthFailure',
  'onWebhookReceived',
];

/**
 * Hook builder for fluent API
 */
export class HookBuilder {
  private hooks: PluginHooks;
  private hookName: HookName;
  private config: HookConfig = {};

  constructor(hooks: PluginHooks, hookName: HookName) {
    this.hooks = hooks;
    this.hookName = hookName;
  }

  /**
   * Set hook priority
   */
  priority(value: number): this {
    this.config.priority = value;
    return this;
  }

  /**
   * Set hook timeout
   */
  timeout(value: number): this {
    this.config.timeout = value;
    return this;
  }

  /**
   * Enable async execution
   */
  async(enabled: boolean = true): this {
    this.config.async = enabled;
    return this;
  }

  /**
   * Enable retry on failure
   */
  retry(enabled: boolean = true): this {
    this.config.retry = enabled;
    return this;
  }

  /**
   * Register the hook
   */
  handler<TInput = any, TOutput = any>(
    fn: HookHandler<TInput, TOutput>
  ): void {
    this.hooks.register(this.hookName, fn, this.config);
  }
}