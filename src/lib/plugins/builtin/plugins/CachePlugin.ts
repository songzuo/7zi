/**
 * Cache Plugin
 * High-performance caching with multiple backends
 */

import {
  Plugin,
  PluginMetadata,
  PluginConfig,
  PluginContext,
  PluginHealthStatus,
  PluginMetrics,
  HookHandler,
} from '../../types';

export interface CachePluginConfig {
  backend: 'memory' | 'redis' | 'memcached';
  ttl: number;
  maxSize: number;
  strategy: 'lru' | 'lfu' | 'fifo';
  compression: boolean;
  serialization: 'json' | 'msgpack';
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  ttl: number;
  createdAt: number;
  accessedAt: number;
  hits: number;
}

export class CachePlugin implements Plugin {
  metadata: PluginMetadata = {
    id: '@openclaw/plugin-cache',
    name: 'Cache Plugin',
    version: '1.0.0',
    description: 'High-performance caching with multiple backends',
    category: 'caching',
    tags: ['cache', 'performance', 'redis', 'memory'],
    author: {
      name: 'OpenClaw Team',
      email: 'team@openclaw.com',
    },
    license: 'MIT',
  };

  config: PluginConfig = {
    id: this.metadata.id,
    enabled: true,
    priority: 90,
    config: {
      backend: 'memory',
      ttl: 3600,
      maxSize: 1000,
      strategy: 'lru',
      compression: false,
      serialization: 'json',
    } as CachePluginConfig,
  };

  private context?: PluginContext;
  private cache: Map<string, CacheEntry> = new Map();
  private metrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    size: 0,
  };

  /**
   * Initialize plugin
   */
  async init(context: PluginContext): Promise<void> {
    this.context = context;
    context.logger.info('Cache plugin initialized');

    // Start cleanup timer
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Start plugin
   */
  async start(): Promise<void> {
    this.context?.logger.info('Cache plugin started');
  }

  /**
   * Stop plugin
   */
  async stop(): Promise<void> {
    this.cache.clear();
    this.context?.logger.info('Cache plugin stopped');
  }

  /**
   * Destroy plugin
   */
  async destroy(): Promise<void> {
    this.cache.clear();
    this.context?.logger.info('Cache plugin destroyed');
  }

  /**
   * Register hooks
   */
  registerHooks(registry: HookRegistry): void {
    registry.register('onCacheHit', this.handleCacheHit.bind(this) as HookHandler);
    registry.register('onCacheMiss', this.handleCacheMiss.bind(this) as HookHandler);
  }

  /**
   * Execute plugin action
   */
  async execute<TInput = any, TOutput = any>(
    action: string,
    input?: TInput
  ): Promise<TOutput> {
    switch (action) {
      case 'get':
        return (await this.get((input as any).key)) as TOutput;

      case 'set':
        return (await this.set((input as any).key, (input as any).value, (input as any).ttl)) as TOutput;

      case 'delete':
        return (await this.delete((input as any).key)) as TOutput;

      case 'clear':
        return (await this.clear()) as TOutput;

      case 'has':
        return (await this.has((input as any).key)) as TOutput;

      case 'keys':
        return (await this.keys()) as TOutput;

      case 'stats':
        return (await this.stats()) as TOutput;

      case 'invalidate':
        return (await this.invalidate((input as any).pattern)) as TOutput;

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Get value from cache
   */
  private async get<T = any>(key: string): Promise<T | undefined> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.metrics.misses++;
      return undefined;
    }

    // Check if expired
    if (entry.ttl > 0 && Date.now() - entry.createdAt > entry.ttl * 1000) {
      this.cache.delete(key);
      this.metrics.misses++;
      this.metrics.evictions++;
      return undefined;
    }

    // Update access time and hits
    entry.accessedAt = Date.now();
    entry.hits++;

    this.metrics.hits++;

    return entry.value;
  }

  /**
   * Set value in cache
   */
  private async set<T = any>(key: string, value: T, ttl?: number): Promise<{ success: boolean }> {
    const config = this.config.config as CachePluginConfig;

    // Check if we need to evict
    if (this.cache.size >= config.maxSize) {
      this.evict();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      ttl: ttl ?? config.ttl,
      createdAt: Date.now(),
      accessedAt: Date.now(),
      hits: 0,
    };

    this.cache.set(key, entry);
    this.metrics.sets++;
    this.metrics.size = this.cache.size;

    return { success: true };
  }

  /**
   * Delete value from cache
   */
  private async delete(key: string): Promise<{ success: boolean }> {
    const result = this.cache.delete(key);
    if (result) {
      this.metrics.deletes++;
      this.metrics.size = this.cache.size;
    }
    return { success: result };
  }

  /**
   * Clear cache
   */
  private async clear(): Promise<{ success: boolean; count: number }> {
    const count = this.cache.size;
    this.cache.clear();
    this.metrics.size = 0;
    return { success: true, count };
  }

  /**
   * Check if key exists
   */
  private async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // Check if expired
    if (entry.ttl > 0 && Date.now() - entry.createdAt > entry.ttl * 1000) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get all keys
   */
  private async keys(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache statistics
   */
  private async stats(): Promise<typeof this.metrics & { hitRate: number }> {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      ...this.metrics,
      hitRate: total > 0 ? this.metrics.hits / total : 0,
    };
  }

  /**
   * Invalidate keys by pattern
   */
  private async invalidate(pattern: string): Promise<{ count: number }> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    this.metrics.size = this.cache.size;
    return { count };
  }

  /**
   * Evict entries based on strategy
   */
  private evict(): void {
    const config = this.config.config as CachePluginConfig;
    const entries = Array.from(this.cache.entries());

    switch (config.strategy) {
      case 'lru':
        // Least Recently Used
        entries.sort((a, b) => a[1].accessedAt - b[1].accessedAt);
        break;

      case 'lfu':
        // Least Frequently Used
        entries.sort((a, b) => a[1].hits - b[1].hits);
        break;

      case 'fifo':
        // First In First Out
        entries.sort((a, b) => a[1].createdAt - b[1].createdAt);
        break;
    }

    // Remove 10% of entries
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
      this.metrics.evictions++;
    }

    this.metrics.size = this.cache.size;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let evicted = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.ttl > 0 && now - entry.createdAt > entry.ttl * 1000) {
        this.cache.delete(key);
        evicted++;
      }
    }

    if (evicted > 0) {
      this.metrics.evictions += evicted;
      this.metrics.size = this.cache.size;
      this.context?.logger.debug(`Cleaned up ${evicted} expired cache entries`);
    }
  }

  /**
   * Handle cache hit hook
   */
  private handleCacheHit(context: unknown, input: unknown): void {
    this.metrics.hits++;
  }

  /**
   * Handle cache miss hook
   */
  private handleCacheMiss(context: unknown, input: unknown): void {
    this.metrics.misses++;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<PluginHealthStatus> {
    const stats = await this.stats();
    return {
      status: 'healthy',
      message: 'Cache plugin is running',
      timestamp: new Date(),
      checks: {
        memory: {
          status: stats.size < 10000 ? 'healthy' : 'degraded',
          message: `Cache size: ${stats.size}`,
        },
        hitRate: {
          status: stats.hitRate > 0.5 ? 'healthy' : 'degraded',
          message: `Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`,
        },
      },
    };
  }

  /**
   * Get metrics
   */
  async getMetrics(): Promise<PluginMetrics> {
    const stats = await this.stats();
    return {
      executionCount: this.metrics.hits + this.metrics.misses,
      successCount: this.metrics.hits,
      failureCount: this.metrics.misses,
      memoryUsage: process.memoryUsage().heapUsed,
      custom: stats as any,
      timestamp: new Date(),
    };
  }
}