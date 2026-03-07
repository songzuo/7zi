/**
 * API 缓存中间件
 * 支持内存缓存和响应缓存头
 */

import { NextRequest, NextResponse } from 'next/server';

interface CacheConfig {
  ttl: number; // 缓存时间（秒）
  useStaleWhileRevalidate?: boolean; // 是否使用过期缓存后台更新
  vary?: string[]; // 缓存键变体（如 ['Authorization']）
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag: string;
}

// 内存缓存存储
const cacheStore = new Map<string, CacheEntry<unknown>>();

// 清理过期缓存
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cacheStore.entries()) {
      if (now - entry.timestamp > 3600000) { // 1小时后清理
        cacheStore.delete(key);
      }
    }
  }, 300000); // 每5分钟清理一次
}

/**
 * 生成缓存键
 */
function generateCacheKey(request: NextRequest, vary?: string[]): string {
  const url = request.url;
  const varyParts: string[] = [];

  if (vary) {
    for (const header of vary) {
      const value = request.headers.get(header);
      if (value) {
        varyParts.push(`${header}:${value}`);
      }
    }
  }

  return varyParts.length > 0
    ? `${url}|${varyParts.join('|')}`
    : url;
}

/**
 * 生成 ETag
 */
function generateETag(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `"${Math.abs(hash).toString(36)}"`;
}

/**
 * 获取缓存
 */
export function getCache<T>(key: string): CacheEntry<T> | null {
  const entry = cacheStore.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  return entry;
}

/**
 * 设置缓存
 */
export function setCache<T>(key: string, data: T): void {
  cacheStore.set(key, {
    data,
    timestamp: Date.now(),
    etag: generateETag(data),
  });
}

/**
 * 清除缓存（按模式）
 */
export function clearCache(pattern?: string): void {
  if (!pattern) {
    cacheStore.clear();
    return;
  }

  for (const key of cacheStore.keys()) {
    if (key.includes(pattern)) {
      cacheStore.delete(key);
    }
  }
}

/**
 * 缓存统计
 */
export function getCacheStats() {
  return {
    size: cacheStore.size,
    keys: Array.from(cacheStore.keys()),
  };
}

/**
 * 创建缓存中间件
 */
export function createCacheMiddleware(config: CacheConfig) {
  const { ttl, useStaleWhileRevalidate = false, vary } = config;

  return function withCache<T extends (...args: unknown[]) => Promise<NextResponse>>(
    handler: T
  ): T {
    return (async (...args: Parameters<T>) => {
      const request = args[0] as NextRequest;
      const cacheKey = generateCacheKey(request, vary);

      // 检查 If-None-Match (ETag)
      const ifNoneMatch = request.headers.get('if-none-match');
      const cached = getCache(cacheKey);

      if (cached) {
        // ETag 匹配，返回 304
        if (ifNoneMatch === cached.etag) {
          return new NextResponse(null, {
            status: 304,
            headers: {
              ETag: cached.etag,
              'Cache-Control': `public, max-age=${ttl}`,
            },
          }) as NextResponse;
        }

        // 检查缓存是否过期
        const age = (Date.now() - cached.timestamp) / 1000;
        const isStale = age > ttl;

        if (!isStale) {
          // 缓存有效，直接返回
          const response = NextResponse.json(cached.data);
          response.headers.set('ETag', cached.etag);
          response.headers.set('Cache-Control', `public, max-age=${Math.ceil(ttl - age)}`);
          response.headers.set('X-Cache', 'HIT');
          return response;
        }

        // 缓存过期但启用了 stale-while-revalidate
        if (useStaleWhileRevalidate) {
          // 后台更新缓存（不阻塞请求）
          handler(...args).then(response => {
            if (response.ok) {
              response.clone().json().then(data => {
                setCache(cacheKey, data);
              });
            }
          });

          // 返回过期缓存
          const response = NextResponse.json(cached.data);
          response.headers.set('ETag', cached.etag);
          response.headers.set('Cache-Control', `public, max-age=${ttl}, stale-while-revalidate=60`);
          response.headers.set('X-Cache', 'STALE');
          return response;
        }
      }

      // 执行原始处理器
      const response = await handler(...args);

      // 只缓存成功的 GET 请求
      if (request.method === 'GET' && response.ok) {
        const data = await response.clone().json();
        setCache(cacheKey, data);

        // 创建新的响应并添加缓存头
        const cachedResponse = NextResponse.json(data);
        cachedResponse.headers.set('ETag', generateETag(data));
        cachedResponse.headers.set('Cache-Control', `public, max-age=${ttl}`);
        cachedResponse.headers.set('X-Cache', 'MISS');
        return cachedResponse;
      }

      response.headers.set('X-Cache', 'BYPASS');
      return response;
    }) as T;
  };
}

/**
 * 预设缓存配置
 */
export const cachePresets = {
  // 短期缓存：30秒
  short: {
    ttl: 30,
    useStaleWhileRevalidate: true,
  },
  // 中期缓存：5分钟
  medium: {
    ttl: 300,
    useStaleWhileRevalidate: true,
  },
  // 长期缓存：1小时
  long: {
    ttl: 3600,
    useStaleWhileRevalidate: true,
  },
  // 静态数据：1天
  static: {
    ttl: 86400,
    useStaleWhileRevalidate: false,
  },
};
