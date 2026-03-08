/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Redis Cache Client
 * Provides a high-performance caching layer with multiple strategies
 */

const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

class CacheClient {
  constructor(config = {}) {
    this.config = {
      host: config.host || process.env.REDIS_HOST || 'localhost',
      port: config.port || parseInt(process.env.REDIS_PORT) || 6379,
      password: config.password || process.env.REDIS_PASSWORD,
      db: config.db || 0,
      keyPrefix: config.keyPrefix || 'cache:',
      defaultTTL: config.defaultTTL || 3600, // 1 hour default
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
      retryStrategy: config.retryStrategy || this.defaultRetryStrategy,
      ...config
    };

    this.client = null;
    this.connected = false;
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  /**
   * Default retry strategy for reconnection attempts
   */
  defaultRetryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }

  /**
   * Connect to Redis server
   */
  async connect() {
    if (this.connected) return;

    try {
      this.client = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        maxRetriesPerRequest: this.config.maxRetriesPerRequest,
        retryStrategy: this.config.retryStrategy,
        lazyConnect: true
      });

      this.client.on('connect', () => {
        this.connected = true;
      });

      this.client.on('error', (err) => {
        console.error('[Cache] Redis error:', err);
        this.metrics.errors++;
      });

      this.client.on('close', () => {
        this.connected = false;
      });

      await this.client.connect();
      await this.client.ping();
      this.connected = true;
    } catch (err) {
      console.error('[Cache] Connection failed:', err);
      throw err;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.connected = false;
    }
  }

  /**
   * Generate cache key with prefix
   */
  makeKey(key) {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * Get value from cache
   */
  async get(key) {
    try {
      if (!this.connected) await this.connect();

      const cacheKey = this.makeKey(key);
      const data = await this.client.get(cacheKey);

      if (data === null) {
        this.metrics.misses++;
        return null;
      }

      this.metrics.hits++;
      return JSON.parse(data);
    } catch (err) {
      console.error('[Cache] Get error:', err);
      this.metrics.errors++;
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  async set(key, value, ttl = null) {
    try {
      if (!this.connected) await this.connect();

      const cacheKey = this.makeKey(key);
      const data = JSON.stringify(value);
      const expiry = ttl || this.config.defaultTTL;

      if (expiry > 0) {
        await this.client.setex(cacheKey, expiry, data);
      } else {
        await this.client.set(cacheKey, data);
      }

      this.metrics.sets++;
      return true;
    } catch (err) {
      console.error('[Cache] Set error:', err);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key) {
    try {
      if (!this.connected) await this.connect();

      const cacheKey = this.makeKey(key);
      const result = await this.client.del(cacheKey);

      if (result > 0) {
        this.metrics.deletes++;
      }
      return result > 0;
    } catch (err) {
      console.error('[Cache] Delete error:', err);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Delete multiple keys (pattern-based)
   */
  async deletePattern(pattern) {
    try {
      if (!this.connected) await this.connect();

      const keys = await this.client.keys(`${this.config.keyPrefix}${pattern}`);
      if (keys.length > 0) {
        await this.client.del(...keys);
        this.metrics.deletes += keys.length;
      }
      return keys.length;
    } catch (err) {
      console.error('[Cache] Delete pattern error:', err);
      this.metrics.errors++;
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    try {
      if (!this.connected) await this.connect();

      const cacheKey = this.makeKey(key);
      const result = await this.client.exists(cacheKey);
      return result === 1;
    } catch (err) {
      console.error('[Cache] Exists error:', err);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Get TTL of a key
   */
  async ttl(key) {
    try {
      if (!this.connected) await this.connect();

      const cacheKey = this.makeKey(key);
      return await this.client.ttl(cacheKey);
    } catch (err) {
      console.error('[Cache] TTL error:', err);
      this.metrics.errors++;
      return -1;
    }
  }

  /**
   * Set TTL on existing key
   */
  async expire(key, ttl) {
    try {
      if (!this.connected) await this.connect();

      const cacheKey = this.makeKey(key);
      const result = await this.client.expire(cacheKey, ttl);
      return result === 1;
    } catch (err) {
      console.error('[Cache] Expire error:', err);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Get or set (cache-aside pattern)
   */
  async getOrSet(key, fetchFn, ttl = null) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetchFn();
    if (value !== null && value !== undefined) {
      await this.set(key, value, ttl);
    }
    return value;
  }

  /**
   * Increment counter
   */
  async increment(key, amount = 1) {
    try {
      if (!this.connected) await this.connect();

      const cacheKey = this.makeKey(key);
      const result = await this.client.incrby(cacheKey, amount);
      return result;
    } catch (err) {
      console.error('[Cache] Increment error:', err);
      this.metrics.errors++;
      return null;
    }
  }

  /**
   * Decrement counter
   */
  async decrement(key, amount = 1) {
    try {
      if (!this.connected) await this.connect();

      const cacheKey = this.makeKey(key);
      const result = await this.client.decrby(cacheKey, amount);
      return result;
    } catch (err) {
      console.error('[Cache] Decrement error:', err);
      this.metrics.errors++;
      return null;
    }
  }

  /**
   * Clear all cache entries with prefix
   */
  async flush() {
    try {
      if (!this.connected) await this.connect();

      const keys = await this.client.keys(`${this.config.keyPrefix}*`);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return keys.length;
    } catch (err) {
      console.error('[Cache] Flush error:', err);
      this.metrics.errors++;
      return 0;
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? (this.metrics.hits / total * 100).toFixed(2) : 0;

    return {
      ...this.metrics,
      hitRate: `${hitRate}%`,
      totalRequests: total
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }
}

module.exports = CacheClient;