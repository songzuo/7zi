/**
 * Plugin SDK
 * Development kit for plugin authors
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import {
  PluginSDK as IPluginSDK,
  PluginLogger,
  PluginStorage,
  PluginHTTPClient,
  PluginDatabaseClient,
  PluginCacheClient,
  PluginQueueClient,
  PluginConfigHelper,
  PluginUtils,
  PluginConfig,
  LogLevel,
} from './types';

/**
 * Plugin Logger Implementation
 */
export class PluginLoggerImpl implements PluginLogger {
  private pluginId: string;
  private prefix: string;

  constructor(pluginId: string) {
    this.pluginId = pluginId;
    this.prefix = `[${pluginId}]`;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log('error', message, meta);
  }

  fatal(message: string, meta?: Record<string, unknown>): void {
    this.log('fatal', message, meta);
  }

  log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    console.log(`${timestamp} [${level.toUpperCase()}] ${this.prefix} ${message}${metaStr}`);
  }
}

/**
 * Plugin Storage Implementation
 */
export class PluginStorageImpl implements PluginStorage {
  private pluginId: string;
  private storage: Map<string, { value: any; expires?: number }> = new Map();

  constructor(pluginId: string) {
    this.pluginId = pluginId;
  }

  async get<T = any>(key: string): Promise<T | undefined> {
    const item = this.storage.get(key);
    if (!item) {
      return undefined;
    }

    if (item.expires && Date.now() > item.expires) {
      this.storage.delete(key);
      return undefined;
    }

    return item.value as T;
  }

  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    const expires = ttl ? Date.now() + ttl * 1000 : undefined;
    this.storage.set(key, { value, expires });
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async has(key: string): Promise<boolean> {
    const item = this.storage.get(key);
    if (!item) {
      return false;
    }

    if (item.expires && Date.now() > item.expires) {
      this.storage.delete(key);
      return false;
    }

    return true;
  }

  async keys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }
}

/**
 * Plugin HTTP Client Implementation
 */
export class PluginHTTPClientImpl implements PluginHTTPClient {
  private pluginId: string;
  private baseUrl?: string;

  constructor(pluginId: string, baseUrl?: string) {
    this.pluginId = pluginId;
    this.baseUrl = baseUrl;
  }

  private getUrl(url: string): string {
    if (this.baseUrl && !url.startsWith('http')) {
      return `${this.baseUrl}${url}`;
    }
    return url;
  }

  async fetch(url: string, options?: RequestInit): Promise<Response> {
    return fetch(this.getUrl(url), {
      ...options,
      headers: {
        'X-Plugin-ID': this.pluginId,
        ...options?.headers,
      },
    });
  }

  async get(url: string, options?: RequestInit): Promise<Response> {
    return this.fetch(url, { ...options, method: 'GET' });
  }

  async post(url: string, body?: any, options?: RequestInit): Promise<Response> {
    return this.fetch(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(body),
    });
  }

  async put(url: string, body?: any, options?: RequestInit): Promise<Response> {
    return this.fetch(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(body),
    });
  }

  async delete(url: string, options?: RequestInit): Promise<Response> {
    return this.fetch(url, { ...options, method: 'DELETE' });
  }
}

/**
 * Plugin Database Client Implementation
 */
export class PluginDatabaseClientImpl implements PluginDatabaseClient {
  private pluginId: string;
  private db: any;

  constructor(pluginId: string, db: any) {
    this.pluginId = pluginId;
    this.db = db;
  }

  async query(sql: string, params?: any[]): Promise<any> {
    return this.db.query(sql, params);
  }

  async transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    return this.db.transaction(callback);
  }

  async insert(table: string, data: Record<string, any>): Promise<any> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    return this.query(sql, values);
  }

  async update(table: string, data: Record<string, any>, where: Record<string, any>): Promise<any> {
    const setClauses = Object.keys(data).map((key, i) => `${key} = $${i + 1}`);
    const whereClauses = Object.keys(where).map((key, i) => `${key} = $${setClauses.length + i + 1}`);
    
    const sql = `UPDATE ${table} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`;
    const params = [...Object.values(data), ...Object.values(where)];
    
    return this.query(sql, params);
  }

  async delete(table: string, where: Record<string, any>): Promise<any> {
    const whereClauses = Object.keys(where).map((key, i) => `${key} = $${i + 1}`);
    const sql = `DELETE FROM ${table} WHERE ${whereClauses.join(' AND ')}`;
    
    return this.query(sql, Object.values(where));
  }

  async find(table: string, where: Record<string, any>): Promise<any[]> {
    const whereClauses = Object.keys(where).map((key, i) => `${key} = $${i + 1}`);
    const sql = `SELECT * FROM ${table} WHERE ${whereClauses.join(' AND ')}`;
    
    const result = await this.query(sql, Object.values(where));
    return result.rows || [];
  }

  async findOne(table: string, where: Record<string, any>): Promise<any> {
    const results = await this.find(table, where);
    return results[0];
  }
}

/**
 * Plugin Cache Client Implementation
 */
export class PluginCacheClientImpl implements PluginCacheClient {
  private pluginId: string;
  private cache: Map<string, { value: any; expires?: number }> = new Map();

  constructor(pluginId: string) {
    this.pluginId = pluginId;
  }

  async get<T = any>(key: string): Promise<T | undefined> {
    const item = this.cache.get(key);
    if (!item) {
      return undefined;
    }

    if (item.expires && Date.now() > item.expires) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value as T;
  }

  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    const expires = ttl ? Date.now() + ttl * 1000 : undefined;
    this.cache.set(key, { value, expires });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async has(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    if (item.expires && Date.now() > item.expires) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

/**
 * Plugin Queue Client Implementation
 */
export class PluginQueueClientImpl implements PluginQueueClient {
  private pluginId: string;
  private queues: Map<string, Set<(message: any) => Promise<void>>> = new Map();

  constructor(pluginId: string) {
    this.pluginId = pluginId;
  }

  async publish(queue: string, message: any): Promise<void> {
    const handlers = this.queues.get(queue);
    if (handlers) {
      for (const handler of handlers) {
        await handler(message);
      }
    }
  }

  async subscribe(queue: string, handler: (message: any) => Promise<void>): Promise<void> {
    if (!this.queues.has(queue)) {
      this.queues.set(queue, new Set());
    }
    this.queues.get(queue)!.add(handler);
  }

  async unsubscribe(queue: string): Promise<void> {
    this.queues.delete(queue);
  }
}

/**
 * Plugin Config Helper Implementation
 */
export class PluginConfigHelperImpl implements PluginConfigHelper {
  private config: Record<string, any>;

  constructor(config: Record<string, any>) {
    this.config = config;
  }

  get<T = any>(key: string, defaultValue?: T): T {
    const keys = key.split('.');
    let value: any = this.config;

    for (const k of keys) {
      if (value === undefined || value === null) {
        return defaultValue !== undefined ? defaultValue : (undefined as T);
      }
      value = value[k];
    }

    return value !== undefined ? value : (defaultValue !== undefined ? defaultValue : (undefined as T));
  }

  set(key: string, value: any): void {
    const keys = key.split('.');
    let current: any = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!current[k]) {
        current[k] = {};
      }
      current = current[k];
    }

    current[keys[keys.length - 1]] = value;
  }

  has(key: string): boolean {
    const keys = key.split('.');
    let value: any = this.config;

    for (const k of keys) {
      if (value === undefined || value === null) {
        return false;
      }
      value = value[k];
    }

    return value !== undefined;
  }

  getAll(): Record<string, any> {
    return { ...this.config };
  }

  async reload(): Promise<void> {
    // Reload configuration from source
    // Implementation depends on configuration source
  }
}

/**
 * Plugin Utils Implementation
 */
export class PluginUtilsImpl implements PluginUtils {
  debounce<T extends (...args: unknown[]) => any>(fn: T, delay: number): T {
    let timeoutId: NodeJS.Timeout;
    return ((...args: unknown[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    }) as T;
  }

  throttle<T extends (...args: unknown[]) => any>(fn: T, delay: number): T {
    let lastCall = 0;
    return ((...args: unknown[]) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        return fn(...args);
      }
    }) as T;
  }

  async retry<T>(fn: () => Promise<T>, attempts: number, delay: number): Promise<T> {
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === attempts - 1) {
          throw error;
        }
        await this.sleep(delay);
      }
    }
    throw new Error('Retry failed');
  }

  async timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout')), ms);
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

  async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  generateId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  merge<T>(target: T, source: Partial<T>): T {
    return { ...target, ...source };
  }
}

/**
 * Plugin SDK Implementation
 */
export class PluginSDK implements IPluginSDK {
  logger: PluginLogger;
  storage: PluginStorage;
  http: PluginHTTPClient;
  events: EventEmitter;
  db: PluginDatabaseClient;
  cache: PluginCacheClient;
  queue: PluginQueueClient;
  config: PluginConfigHelper;
  utils: PluginUtils;

  constructor(pluginId: string, pluginConfig: PluginConfig, db?: any) {
    this.logger = new PluginLoggerImpl(pluginId);
    this.storage = new PluginStorageImpl(pluginId);
    this.http = new PluginHTTPClientImpl(pluginId, pluginConfig.config?.apiBaseUrl);
    this.events = new EventEmitter();
    this.db = new PluginDatabaseClientImpl(pluginId, db);
    this.cache = new PluginCacheClientImpl(pluginId);
    this.queue = new PluginQueueClientImpl(pluginId);
    this.config = new PluginConfigHelperImpl(pluginConfig.config || {});
    this.utils = new PluginUtilsImpl();
  }
}

/**
 * Plugin Builder for easier plugin creation
 */
export class PluginBuilder {
  private id: string = '';
  private name: string = '';
  private version: string = '1.0.0';
  private description: string = '';
  private pluginClass: any;
  private config: Partial<PluginConfig> = {};

  setId(id: string): this {
    this.id = id;
    return this;
  }

  setName(name: string): this {
    this.name = name;
    return this;
  }

  setVersion(version: string): this {
    this.version = version;
    return this;
  }

  setDescription(description: string): this {
    this.description = description;
    return this;
  }

  setPluginClass(pluginClass: any): this {
    this.pluginClass = pluginClass;
    return this;
  }

  setConfig(config: Partial<PluginConfig>): this {
    this.config = config;
    return this;
  }

  build(): any {
    return {
      metadata: {
        id: this.id,
        name: this.name,
        version: this.version,
        description: this.description,
      },
      config: {
        id: this.id,
        enabled: true,
        ...this.config,
      },
      ...new this.pluginClass(),
    };
  }
}