/**
 * Redis Client Configuration
 *
 * Supports both ioredis and @upstash/redis clients
 */

import Redis from 'ioredis';
import { logger } from '@/lib/logger';

// Redis connection configuration
interface RedisConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  url?: string; // Full Redis URL (e.g., redis://:password@host:port/db)
}

/**
 * Get Redis configuration from environment variables
 */
function getRedisConfig(): RedisConfig | undefined {
  // Check if Redis is configured
  if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
    logger.warn('Redis is not configured. Rate limiting will use in-memory fallback.');
    return undefined;
  }

  // Use URL if provided
  if (process.env.REDIS_URL) {
    return { url: process.env.REDIS_URL };
  }

  // Use individual config options
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  };
}

/**
 * Create Redis client instance
 */
function createRedisClient(): Redis | undefined {
  const config = getRedisConfig();

  if (!config) {
    return undefined;
  }

  let client: Redis;

  if (config.url) {
    client = new Redis(config.url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      enableReadyCheck: true,
    });
  } else {
    client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      enableReadyCheck: true,
    });
  }

  // Event handlers
  client.on('connect', () => {
    logger.info('Redis client connected');
  });

  client.on('ready', () => {
    logger.info('Redis client ready');
  });

  client.on('error', (error) => {
    logger.error('Redis client error', { error });
  });

  client.on('close', () => {
    logger.warn('Redis client connection closed');
  });

  client.on('reconnecting', (delay: number) => {
    logger.info(`Redis client reconnecting in ${delay}ms`);
  });

  return client;
}

// Singleton Redis client instance
let redisClient: Redis | undefined = undefined;

/**
 * Get or create Redis client singleton
 */
export function getRedisClient(): Redis | undefined {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
}

/**
 * Close Redis client connection
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = undefined;
    logger.info('Redis client closed');
  }
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  const client = getRedisClient();
  if (!client) {
    return false;
  }

  try {
    await client.ping();
    return true;
  } catch (error) {
    logger.warn('Redis is not available', { error });
    return false;
  }
}

/**
 * Execute Redis command with error handling
 */
export async function redisCommand<T>(
  command: (...args: any[]) => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  const client = getRedisClient();

  if (!client) {
    return fallback;
  }

  try {
    return await command();
  } catch (error) {
    logger.error('Redis command failed', { error });
    return fallback;
  }
}

/**
 * Graceful shutdown handler
 */
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await closeRedisClient();
  });

  process.on('SIGINT', async () => {
    await closeRedisClient();
  });

  process.on('SIGTERM', async () => {
    await closeRedisClient();
  });
}
