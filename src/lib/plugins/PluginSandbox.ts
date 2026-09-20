// @ts-nocheck
/**
 * Plugin Sandbox
 * Secure execution environment for plugins
 */

import { EventEmitter } from 'events';
import * as vm from 'vm';
import {
  PluginSandbox as IPluginSandbox,
  PluginPermission,
  SandboxContext,
  SandboxStatus,
  ValidationResult,
  PluginSandboxError,
} from './types';

export class PluginSandbox implements IPluginSandbox {
  private sandboxes: Map<string, vm.Context> = new Map();
  private statuses: Map<string, SandboxStatus> = new Map();
  private eventEmitters: Map<string, EventEmitter> = new Map();

  /**
   * Create sandbox for plugin
   */
  async create(pluginId: string, permissions: PluginPermission[]): Promise<SandboxContext> {
    // Check if sandbox already exists
    if (this.sandboxes.has(pluginId)) {
      throw new PluginSandboxError(pluginId, `Sandbox already exists for plugin ${pluginId}`);
    }

    // Create permission set
    const permissionSet = new Set(permissions.map((p) => p.name));

    // Build sandbox context
    const context: SandboxContext = {
      global: {},
      require: this.createSecureRequire(pluginId, permissionSet),
      console: this.createSecureConsole(pluginId),
      setTimeout: this.createSecureSetTimeout(pluginId) as typeof setTimeout,
      setInterval: this.createSecureSetInterval(pluginId) as typeof setInterval,
      clearTimeout,
      clearInterval,
      process: {
        env: this.createSecureEnv(permissionSet),
        nextTick: process.nextTick,
      },
    };

    // Create VM context
    const vmContext = vm.createContext(context);
    this.sandboxes.set(pluginId, vmContext);

    // Initialize status
    this.statuses.set(pluginId, {
      pluginId,
      active: true,
      memoryUsage: 0,
      cpuUsage: 0,
      uptime: 0,
      errors: [],
    });

    // Create event emitter
    this.eventEmitters.set(pluginId, new EventEmitter());

    return context;
  }

  /**
   * Destroy sandbox
   */
  async destroy(pluginId: string): Promise<void> {
    const sandbox = this.sandboxes.get(pluginId);
    if (!sandbox) {
      return;
    }

    // Clean up
    this.sandboxes.delete(pluginId);
    this.statuses.delete(pluginId);
    this.eventEmitters.delete(pluginId);
  }

  /**
   * Execute code in sandbox
   */
  async execute<T = unknown>(
    pluginId: string,
    code: string | Function,
    context?: Record<string, unknown>
  ): Promise<T> {
    const sandbox = this.sandboxes.get(pluginId);
    if (!sandbox) {
      throw new PluginSandboxError(pluginId, `Sandbox not found for plugin ${pluginId}`);
    }

    const status = this.statuses.get(pluginId)!;
    const startTime = Date.now();

    try {
      // Prepare code
      const script = typeof code === 'string'
        ? new vm.Script(code)
        : new vm.Script(`(${code.toString()})(${JSON.stringify(context || {})})`);

      // Execute with timeout
      const result = script.runInContext(sandbox, {
        timeout: 5000, // 5 second timeout
        displayErrors: true,
      });

      // Update metrics
      const executionTime = Date.now() - startTime;
      status.cpuUsage = executionTime;

      return result;
    } catch (error) {
      status.errors.push(error as Error);
      throw new PluginSandboxError(pluginId, `Execution failed: ${(error as Error).message}`);
    }
  }

  /**
   * Validate plugin code
   */
  async validate(code: string): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    // Check for dangerous patterns
    const dangerousPatterns = [
      { pattern: /eval\s*\(/, message: 'Use of eval() is not allowed' },
      { pattern: /Function\s*\(/, message: 'Use of Function() constructor is not allowed' },
      { pattern: /require\s*\(\s*['"]child_process['"]\s*\)/, message: 'Child process access is restricted' },
      { pattern: /require\s*\(\s*['"]fs['"]\s*\)/, message: 'File system access requires permission' },
      { pattern: /process\.exit/, message: 'Process exit is not allowed' },
      { pattern: /import\s+/gm, message: 'ES modules should be transpiled to CommonJS' },
    ];

    for (const { pattern, message } of dangerousPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        const lines = code.substring(0, matches.index || 0).split('\n');
        errors.push({
          line: lines.length,
          column: lines[lines.length - 1].length + 1,
          message,
        });
      }
    }

    // Check for warnings
    const warningPatterns = [
      { pattern: /console\.log/, message: 'Consider using the logger instead of console.log' },
      { pattern: /var\s+/, message: 'Consider using let or const instead of var' },
      { pattern: /==(?!=)/, message: 'Consider using === instead of ==' },
    ];

    for (const { pattern, message } of warningPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        const lines = code.substring(0, matches.index || 0).split('\n');
        warnings.push({
          line: lines.length,
          column: lines[lines.length - 1].length + 1,
          message,
        });
      }
    }

    // Try to parse code
    try {
      new vm.Script(code);
    } catch (error: unknown) {
      const match = error.message.match(/:(\d+):(\d+)/);
      if (match) {
        errors.push({
          line: parseInt(match[1]),
          column: parseInt(match[2]),
          message: error.message,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get sandbox status
   */
  getStatus(pluginId: string): SandboxStatus {
    const status = this.statuses.get(pluginId);
    if (!status) {
      return {
        pluginId,
        active: false,
        memoryUsage: 0,
        cpuUsage: 0,
        uptime: 0,
        errors: [],
      };
    }

    // Update uptime
    status.uptime = Date.now() - (this.statuses.get(pluginId)?.uptime || Date.now());

    // Estimate memory usage
    status.memoryUsage = process.memoryUsage().heapUsed;

    return status;
  }

  /**
   * Create secure require function
   */
  private createSecureRequire(pluginId: string, permissions: Set<string>): (module: string) => unknown {
    const allowedModules = new Map<string, unknown>([
      // Safe built-in modules
      ['crypto', require('crypto')],
      ['url', require('url')],
      ['querystring', require('querystring')],
      ['path', require('path')],
      ['util', require('util')],
      ['events', require('events')],
      ['stream', require('stream')],
      ['buffer', require('buffer')],
      ['zlib', require('zlib')],
    ]);

    // Add permission-based modules
    if (permissions.has('fs:read') || permissions.has('fs:write')) {
      allowedModules.set('fs', require('fs'));
    }

    if (permissions.has('http')) {
      allowedModules.set('http', require('http'));
      allowedModules.set('https', require('https'));
    }

    if (permissions.has('net')) {
      allowedModules.set('net', require('net'));
    }

    return (module: string) => {
      if (allowedModules.has(module)) {
        return allowedModules.get(module);
      }

      throw new PluginSandboxError(
        pluginId,
        `Module '${module}' is not allowed in sandbox`
      );
    };
  }

  /**
   * Create secure console
   */
  private createSecureConsole(pluginId: string): Console {
    const logger = {
      log: (...args: unknown[]) => console.log(`[${pluginId}]`, ...args),
      info: (...args: unknown[]) => console.info(`[${pluginId}]`, ...args),
      warn: (...args: unknown[]) => console.warn(`[${pluginId}]`, ...args),
      error: (...args: unknown[]) => console.error(`[${pluginId}]`, ...args),
      debug: (...args: unknown[]) => console.debug(`[${pluginId}]`, ...args),
      trace: (...args: unknown[]) => console.trace(`[${pluginId}]`, ...args),
      dir: (obj: unknown) => console.dir(obj),
      time: (label: string) => console.time(`${pluginId}:${label}`),
      timeEnd: (label: string) => console.timeEnd(`${pluginId}:${label}`),
    };

    return logger as Console;
  }

  /**
   * Create secure setTimeout
   */
  private createSecureSetTimeout(pluginId: string): (callback: (...args: unknown[]) => void, delay: number, ...args: unknown[]) => NodeJS.Timeout {
    return (callback: (...args: unknown[]) => void, delay: number, ...args: unknown[]) => {
      const maxDelay = 60000; // 1 minute max
      const safeDelay = Math.min(delay, maxDelay);

      return setTimeout(() => {
        try {
          callback(...args);
        } catch (error) {
          const status = this.statuses.get(pluginId);
          if (status) {
            status.errors.push(error as Error);
          }
        }
      }, safeDelay);
    };
  }

  /**
   * Create secure setInterval
   */
  private createSecureSetInterval(pluginId: string): (callback: (...args: unknown[]) => void, delay: number, ...args: unknown[]) => NodeJS.Timeout {
    return (callback: (...args: unknown[]) => void, delay: number, ...args: unknown[]) => {
      const maxDelay = 60000; // 1 minute max
      const safeDelay = Math.min(delay, maxDelay);

      return setInterval(() => {
        try {
          callback(...args);
        } catch (error) {
          const status = this.statuses.get(pluginId);
          if (status) {
            status.errors.push(error as Error);
          }
        }
      }, safeDelay);
    };
  }

  /**
   * Create secure environment
   */
  private createSecureEnv(permissions: Set<string>): Record<string, string> {
    const env: Record<string, string> = {};

    // Only allow safe environment variables
    const allowedEnvVars = [
      'NODE_ENV',
      'TZ',
      'LANG',
      'LC_ALL',
    ];

    for (const key of allowedEnvVars) {
      if (process.env[key]) {
        env[key] = process.env[key]!;
      }
    }

    return env;
  }

  /**
   * Get all active sandboxes
   */
  getActiveSandboxes(): string[] {
    return Array.from(this.sandboxes.keys());
  }

  /**
   * Clear all sandboxes
   */
  clear(): void {
    for (const pluginId of this.sandboxes.keys()) {
      this.destroy(pluginId);
    }
  }
}