/**
 * Redis 适配器
 *
 * 管理 Redis 连接，提供原子操作和错误处理
 */

import { Redis } from 'ioredis';

export interface RedisConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
}

export interface RedisAdapterOptions {
  keyPrefix: string;
  defaultTTL?: number;  // 默认过期时间（秒）
}

export class RedisAdapter {
  private client: Redis | null = null;
  private keyPrefix: string;
  private defaultTTL: number;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor(options: RedisAdapterOptions) {
    this.keyPrefix = options.keyPrefix;
    this.defaultTTL = options.defaultTTL || 3600; // 默认 1 小时
  }

  /**
   * 连接到 Redis
   * @param config Redis 配置
   */
  async connect(config: RedisConfig = {}): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    try {
      this.client = new Redis({
        host: config.host || process.env.REDIS_HOST || 'localhost',
        port: config.port || parseInt(process.env.REDIS_PORT || '6379'),
        password: config.password || process.env.REDIS_PASSWORD,
        db: config.db || parseInt(process.env.REDIS_DB || '0'),
      });

      // 监听连接事件
      this.client.on('connect', () => {
        console.log('[RedisAdapter] Connected to Redis');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.client.on('error', (error) => {
        console.error('[RedisAdapter] Redis error:', error);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.warn('[RedisAdapter] Redis connection closed');
        this.isConnected = false;
        this.attemptReconnect();
      });

      // 测试连接
      await this.client.ping();
      this.isConnected = true;
      this.reconnectAttempts = 0;
    } catch (_error) {
      console.error('[RedisAdapter] Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * 尝试重连
   */
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[RedisAdapter] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // 指数退避，最大 30 秒

    console.log(`[RedisAdapter] Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (_error) {
        console.error('[RedisAdapter] Reconnection failed:', error);
        this.attemptReconnect();
      }
    }, delay);
  }

  /**
   * 生成带前缀的键
   * @param key 原始键
   * @returns 带前缀的键
   */
  private prefixedKey(key: string): string {
    return `${this.keyPrefix}:${key}`;
  }

  /**
   * 获取值
   * @param key 键
   * @returns 值
   */
  async get(key: string): Promise<string | null> {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      return await this.client.get(this.prefixedKey(key));
    } catch (_error) {
      console.error('[RedisAdapter] Get failed:', error);
      throw error;
    }
  }

  /**
   * 设置值
   * @param key 键
   * @param value 值
   * @param ttl 过期时间（秒），默认使用 defaultTTL
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const prefixedKey = this.prefixedKey(key);
      if (ttl !== undefined) {
        await this.client.setex(prefixedKey, ttl, value);
      } else {
        await this.client.setex(prefixedKey, this.defaultTTL, value);
      }
    } catch (_error) {
      console.error('[RedisAdapter] Set failed:', error);
      throw error;
    }
  }

  /**
   * 删除键
   * @param key 键
   * @returns 是否删除成功
   */
  async delete(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const result = await this.client.del(this.prefixedKey(key));
      return result > 0;
    } catch (_error) {
      console.error('[RedisAdapter] Delete failed:', error);
      throw error;
    }
  }

  /**
   * 原子递增操作
   * @param key 键
   * @param increment 递增量
   * @param ttl 过期时间（秒），默认使用 defaultTTL
   * @returns 递增后的值
   */
  async incr(key: string, increment: number = 1, ttl?: number): Promise<number> {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const prefixedKey = this.prefixedKey(key);

      // 使用 Lua 脚本保证原子性
      const luaScript = `
        local current = redis.call('GET', KEYS[1])
        if current == false then
          current = 0
        else
          current = tonumber(current)
        end
        local newValue = current + tonumber(ARGV[1])
        redis.call('SETEX', KEYS[1], tonumber(ARGV[2]), tostring(newValue))
        return newValue
      `;

      const result = await this.client.eval(
        luaScript,
        1,
        prefixedKey,
        increment,
        ttl || this.defaultTTL
      );

      return result as number;
    } catch (_error) {
      console.error('[RedisAdapter] Incr failed:', error);
      throw error;
    }
  }

  /**
   * 原子递减操作
   * @param key 键
   * @param decrement 递减量
   * @param ttl 过期时间（秒），默认使用 defaultTTL
   * @returns 递减后的值
   */
  async decr(key: string, decrement: number = 1, ttl?: number): Promise<number> {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const prefixedKey = this.prefixedKey(key);

      // 使用 Lua 脚本保证原子性
      const luaScript = `
        local current = redis.call('GET', KEYS[1])
        if current == false then
          current = 0
        else
          current = tonumber(current)
        end
        local newValue = current - tonumber(ARGV[1])
        if newValue < 0 then
          newValue = 0
        end
        redis.call('SETEX', KEYS[1], tonumber(ARGV[2]), tostring(newValue))
        return newValue
      `;

      const result = await this.client.eval(
        luaScript,
        1,
        prefixedKey,
        decrement,
        ttl || this.defaultTTL
      );

      return result as number;
    } catch (_error) {
      console.error('[RedisAdapter] Decr failed:', error);
      throw error;
    }
  }

  /**
   * 设置过期时间
   * @param key 键
   * @param ttl 过期时间（秒）
   * @returns 是否设置成功
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const result = await this.client.expire(this.prefixedKey(key), ttl);
      return result > 0;
    } catch (_error) {
      console.error('[RedisAdapter] Expire failed:', error);
      throw error;
    }
  }

  /**
   * 获取剩余过期时间
   * @param key 键
   * @returns 剩余时间（秒），-1 表示没有过期时间，-2 表示键不存在
   */
  async ttl(key: string): Promise<number> {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      return await this.client.ttl(this.prefixedKey(key));
    } catch (_error) {
      console.error('[RedisAdapter] TTL failed:', error);
      throw error;
    }
  }

  /**
   * 批量删除键
   * @param pattern 键模式（例如：rate-limit:*）
   * @returns 删除的键数量
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const keys = await this.client.keys(this.prefixedKey(pattern));
      if (keys.length === 0) {
        return 0;
      }
      return await this.client.del(...keys);
    } catch (_error) {
      console.error('[RedisAdapter] Delete pattern failed:', error);
      throw error;
    }
  }

  /**
   * 检查连接状态
   * @returns 是否已连接
   */
  isClientConnected(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * 获取 Redis 客户端实例（用于高级操作）
   * @returns Redis 客户端
   */
  getClient(): Redis | null {
    return this.client;
  }
}
