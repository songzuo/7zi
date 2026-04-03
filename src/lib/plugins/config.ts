/**
 * Plugin System Configuration
 * Example configuration for the plugin system
 */

import { PluginConfig, PluginPermission, PluginResourceLimits } from './types';

/**
 * Plugin directory configuration
 */
export const pluginConfig = {
  // Plugin directories to scan
  pluginDirs: [
    './plugins',
    './node_modules/@openclaw',
  ],

  // Enable hot reload in development
  enableHotReload: process.env.NODE_ENV === 'development',

  // Enable plugin caching
  enableCache: true,

  // Plugin sandbox configuration
  sandbox: {
    enabled: true,
    timeout: 5000,
    maxMemory: 512, // MB
  },

  // Default plugin configuration
  defaults: {
    enabled: true,
    priority: 0,
    retry: {
      maxAttempts: 3,
      delay: 1000,
      exponentialBackoff: true,
    },
  },
};

/**
 * Example plugin configurations
 */
export const examplePlugins: Record<string, PluginConfig> = {
  // Logging Plugin
  '@openclaw/plugin-logging': {
    id: '@openclaw/plugin-logging',
    enabled: true,
    priority: 100,
    config: {
      level: 'info',
      format: 'json',
      transports: [
        { type: 'console', enabled: true },
        {
          type: 'file',
          enabled: true,
          config: { path: './logs/app.log' },
        },
      ],
      bufferSize: 1000,
      flushInterval: 5000,
    },
    permissions: [
      { name: 'fs:write', scope: 'write' },
    ],
  },

  // Cache Plugin
  '@openclaw/plugin-cache': {
    id: '@openclaw/plugin-cache',
    enabled: true,
    priority: 90,
    config: {
      backend: 'memory',
      ttl: 3600,
      maxSize: 10000,
      strategy: 'lru',
      compression: false,
    },
    limits: {
      maxMemory: 256, // MB
    },
  },

  // Auth Plugin
  '@openclaw/plugin-auth': {
    id: '@openclaw/plugin-auth',
    enabled: true,
    priority: 95,
    config: {
      providers: [
        { type: 'local', enabled: true },
        { type: 'jwt', enabled: true },
      ],
      sessionTimeout: 3600,
      maxAttempts: 5,
      lockoutDuration: 900,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
      },
    },
    permissions: [
      { name: 'db:read', scope: 'read' },
      { name: 'db:write', scope: 'write' },
    ],
    limits: {
      maxMemory: 128,
      maxCpuTime: 2000,
    },
  },

  // Webhook Plugin
  '@openclaw/plugin-webhook': {
    id: '@openclaw/plugin-webhook',
    enabled: true,
    priority: 80,
    config: {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      maxConcurrent: 10,
      enableSignature: true,
    },
    permissions: [
      { name: 'http', scope: 'execute' },
    ],
    limits: {
      maxConnections: 20,
      maxRequestSize: 1048576, // 1 MB
    },
  },
};

/**
 * Plugin permissions configuration
 */
export const defaultPermissions: PluginPermission[] = [
  // File system
  { name: 'fs:read', scope: 'read' },
  { name: 'fs:write', scope: 'write' },

  // Network
  { name: 'http', scope: 'execute' },
  { name: 'net', scope: 'execute' },

  // Database
  { name: 'db:read', scope: 'read' },
  { name: 'db:write', scope: 'write' },

  // System
  { name: 'process', scope: 'execute' },
  { name: 'env', scope: 'read' },
];

/**
 * Plugin resource limits
 */
export const defaultLimits: PluginResourceLimits = {
  maxMemory: 256, // MB
  maxCpuTime: 5000, // ms
  maxExecutionTime: 30000, // ms
  maxFileDescriptors: 100,
  maxConnections: 10,
  maxRequestSize: 1048576, // 1 MB
};

/**
 * Hook configuration
 */
export const hookConfig = {
  // Hook execution timeout
  timeout: 5000,

  // Enable async execution
  async: true,

  // Retry on failure
  retry: false,

  // Default priority
  defaultPriority: 0,
};

/**
 * Marketplace configuration
 */
export const marketplaceConfig = {
  // Marketplace URL
  url: 'https://marketplace.openclaw.com',

  // Enable auto-update check
  enableAutoUpdateCheck: true,

  // Update check interval (ms)
  updateCheckInterval: 86400000, // 24 hours

  // Enable security scan
  enableSecurityScan: true,

  // Verify signatures
  verifySignatures: true,
};

/**
 * Security configuration
 */
export const securityConfig = {
  // Enable sandbox
  enableSandbox: true,

  // Code validation
  validateCode: true,

  // Security scan on install
  scanOnInstall: true,

  // Minimum security score
  minSecurityScore: 60,

  // Block plugins with vulnerabilities
  blockVulnerablePlugins: true,

  // Allowed modules in sandbox
  allowedModules: [
    'crypto',
    'url',
    'querystring',
    'path',
    'util',
    'events',
    'stream',
    'buffer',
    'zlib',
  ],
};

/**
 * Development configuration
 */
export const devConfig = {
  // Enable debug logging
  debugLogging: true,

  // Enable hot reload
  hotReload: true,

  // Enable source maps
  sourceMaps: true,

  // Plugin discovery paths
  discoveryPaths: [
    './plugins',
    './plugins-dev',
  ],

  // Auto-restart on plugin error
  autoRestartOnError: false,

  // Enable performance monitoring
  performanceMonitoring: true,
};

/**
 * Production configuration
 */
export const prodConfig = {
  // Disable debug logging
  debugLogging: false,

  // Disable hot reload
  hotReload: false,

  // Enable caching
  caching: true,

  // Plugin optimization
  optimization: {
    minify: true,
    treeShaking: true,
  },

  // Error handling
  errorHandling: {
    logErrors: true,
    notifyOnError: true,
    retryAttempts: 3,
  },

  // Monitoring
  monitoring: {
    enabled: true,
    metricsInterval: 60000,
    healthCheckInterval: 30000,
  },
};

/**
 * Get configuration based on environment
 */
export function getConfig() {
  const env = process.env.NODE_ENV || 'development';
  
  return {
    ...pluginConfig,
    env,
    ...(env === 'development' ? devConfig : prodConfig),
    security: securityConfig,
    hooks: hookConfig,
    marketplace: marketplaceConfig,
  };
}

/**
 * Validate plugin configuration
 */
export function validatePluginConfig(config: PluginConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.id) {
    errors.push('Plugin ID is required');
  }

  if (typeof config.enabled !== 'boolean') {
    errors.push('enabled must be a boolean');
  }

  if (config.priority !== undefined && typeof config.priority !== 'number') {
    errors.push('priority must be a number');
  }

  if (config.limits) {
    if (config.limits.maxMemory !== undefined && config.limits.maxMemory < 0) {
      errors.push('maxMemory must be a positive number');
    }

    if (config.limits.maxCpuTime !== undefined && config.limits.maxCpuTime < 0) {
      errors.push('maxCpuTime must be a positive number');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default {
  plugin: pluginConfig,
  plugins: examplePlugins,
  permissions: defaultPermissions,
  limits: defaultLimits,
  hooks: hookConfig,
  marketplace: marketplaceConfig,
  security: securityConfig,
  dev: devConfig,
  prod: prodConfig,
  getConfig,
  validatePluginConfig,
};