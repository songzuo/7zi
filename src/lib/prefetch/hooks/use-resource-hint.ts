/**
 * useResourceHint Hook
 * 
 * 生成和管理 resource hints (prefetch, preload, preconnect, dns-prefetch)
 */

'use client';

import { useCallback, useEffect, useMemo } from 'react';
import type { ResourceConfig } from '../resource-prefetcher';

export interface ResourceHintConfig {
  /** 资源 URL */
  url: string;
  /** Hint 类型 */
  type: 'prefetch' | 'preload' | 'preconnect' | 'dns-prefetch';
  /** 资源类型 (用于 preload) */
  as?: 'script' | 'style' | 'font' | 'image' | 'fetch' | 'document';
  /** 是否跨域 */
  crossorigin?: boolean;
  /** 媒体查询 */
  media?: string;
  /** 图片尺寸 */
  sizes?: string;
  /** MIME 类型 (用于字体) */
  typeAttr?: string;
  /** 优先级 */
  priority?: 'high' | 'medium' | 'low';
  /** 是否动态插入 */
  dynamic?: boolean;
  /** 插入延迟 (ms) */
  insertDelay?: number;
}

export interface ResourceHintResult {
  /** Hint HTML 字符串 */
  html: string;
  /** 插入的 link 元素 */
  element?: HTMLLinkElement;
  /** 是否已插入 */
  inserted: boolean;
}

/**
 * 使用 Resource Hint Hook
 */
export function useResourceHint(config: ResourceHintConfig): ResourceHintResult {
  const { url, type, as, crossorigin, media, sizes, typeAttr, dynamic = false, insertDelay = 0 } = config;

  // 生成 HTML 字符串
  const html = useMemo(() => {
    const attrs: string[] = [`rel="${type}"`, `href="${url}"`];

    if (as) attrs.push(`as="${as}"`);
    if (crossorigin) attrs.push('crossorigin');
    if (media) attrs.push(`media="${media}"`);
    if (sizes) attrs.push(`sizes="${sizes}"`);
    if (typeAttr) attrs.push(`type="${typeAttr}"`);

    return `<link ${attrs.join(' ')}>`;
  }, [url, type, as, crossorigin, media, sizes, typeAttr]);

  // 动态插入
  useEffect(() => {
    if (!dynamic || typeof document === 'undefined') return;

    const timer = setTimeout(() => {
      const link = document.createElement('link');
      link.rel = type;
      link.href = url;

      if (as) link.as = as;
      if (crossorigin) link.crossOrigin = 'anonymous';
      if (media) link.media = media;
      if (sizes) link.sizes = sizes;
      if (typeAttr) link.type = typeAttr;

      document.head.appendChild(link);
    }, insertDelay);

    return () => clearTimeout(timer);
  }, [dynamic, insertDelay, url, type, as, crossorigin, media, sizes, typeAttr]);

  return {
    html,
    inserted: false, // 动态插入的元素不返回引用
  };
}

/**
 * 批量 Resource Hook
 */
export function useBatchResourceHints(configs: ResourceHintConfig[]): {
  html: string;
  insertAll: () => void;
  removeAll: () => void;
  insertedCount: number;
} {
  // 生成所有 HTML
  const html = useMemo(() => {
    return configs
      .map(config => {
        const { url, type, as, crossorigin, media, sizes, typeAttr } = config;
        const attrs: string[] = [`rel="${type}"`, `href="${url}"`];

        if (as) attrs.push(`as="${as}"`);
        if (crossorigin) attrs.push('crossorigin');
        if (media) attrs.push(`media="${media}"`);
        if (sizes) attrs.push(`sizes="${sizes}"`);
        if (typeAttr) attrs.push(`type="${typeAttr}"`);

        return `<link ${attrs.join(' ')}>`;
      })
      .join('\n');
  }, [configs]);

  // 批量插入
  const insertAll = useCallback(() => {
    if (typeof document === 'undefined') return;

    configs.forEach(config => {
      if (!config.dynamic) return;

      const { url, type, as, crossorigin, media, sizes, typeAttr, insertDelay = 0 } = config;

      setTimeout(() => {
        const link = document.createElement('link');
        link.rel = type;
        link.href = url;

        if (as) link.as = as;
        if (crossorigin) link.crossOrigin = 'anonymous';
        if (media) link.media = media;
        if (sizes) link.sizes = sizes;
        if (typeAttr) link.type = typeAttr;

        document.head.appendChild(link);
      }, insertDelay);
    });
  }, [configs]);

  // 批量移除
  const removeAll = useCallback(() => {
    if (typeof document === 'undefined') return;

    configs.forEach(config => {
      const { url, type } = config;
      const links = document.querySelectorAll(`link[rel="${type}"][href="${url}"]`);
      links.forEach(link => link.remove());
    });
  }, [configs]);

  // 统计已插入的 hints
  const insertedCount = useMemo(() => {
    if (typeof document === 'undefined') return 0;

    return configs.filter(config => {
      const { url, type } = config;
      return document.querySelector(`link[rel="${type}"][href="${url}"]`) !== null;
    }).length;
  }, [configs]);

  return {
    html,
    insertAll,
    removeAll,
    insertedCount,
  };
}

/**
 * DNS Prefetch Hook
 */
export function useDnsPrefetch(domains: string[], options?: {
  delay?: number;
  enabled?: boolean;
}) {
  const { delay = 0, enabled = true } = options || {};

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    const timer = setTimeout(() => {
      domains.forEach(domain => {
        const link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = domain;
        document.head.appendChild(link);
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [domains, delay, enabled]);
}

/**
 * Preconnect Hook
 */
export function usePreconnect(origins: string[], options?: {
  delay?: number;
  enabled?: boolean;
  crossorigin?: boolean;
}) {
  const { delay = 0, enabled = true, crossorigin = false } = options || {};

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    const timer = setTimeout(() => {
      origins.forEach(origin => {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = origin;
        if (crossorigin) link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [origins, delay, enabled, crossorigin]);
}

/**
 * Prefetch Images Hook
 */
export function usePrefetchImages(urls: string[], options?: {
  lazy?: boolean;
  observerOptions?: IntersectionObserverInit;
}) {
  const { lazy = false, observerOptions } = options || {};

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (!lazy) {
      // 立即预加载所有图片
      urls.forEach(url => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.as = 'image';
        link.href = url;
        document.head.appendChild(link);
      });
    } else {
      // 使用 Intersection Observer 延迟预加载
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const url = img.dataset.prefetchUrl;

            if (url) {
              const link = document.createElement('link');
              link.rel = 'prefetch';
              link.as = 'image';
              link.href = url;
              document.head.appendChild(link);
            }

            observer.unobserve(img);
          }
        });
      }, observerOptions);

      // 创建临时元素用于观察
      urls.forEach(url => {
        const div = document.createElement('div');
        div.dataset.prefetchUrl = url;
        div.style.position = 'absolute';
        div.style.width = '1px';
        div.style.height = '1px';
        div.style.opacity = '0';
        document.body.appendChild(div);
        observer.observe(div);
      });

      return () => {
        observer.disconnect();
      };
    }
  }, [urls, lazy, observerOptions]);
}

/**
 * Preload Critical Fonts Hook
 */
export function usePreloadFonts(fonts: Array<{ url: string; family: string; weight?: string }>) {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    fonts.forEach(font => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.href = font.url;
      link.crossOrigin = 'anonymous';
      link.type = 'font/woff2';

      // 添加 font-display 指令
      if (font.family) {
        link.setAttribute('data-font-family', font.family);
        if (font.weight) {
          link.setAttribute('data-font-weight', font.weight);
        }
      }

      document.head.appendChild(link);
    });
  }, [fonts]);
}

/**
 * 获取所有 Resource Hints
 */
export function useAllResourceHints(): {
  prefetch: HTMLLinkElement[];
  preload: HTMLLinkElement[];
  preconnect: HTMLLinkElement[];
  dnsPrefetch: HTMLLinkElement[];
} {
  const hints = useMemo(() => {
    if (typeof document === 'undefined') {
      return {
        prefetch: [],
        preload: [],
        preconnect: [],
        dnsPrefetch: [],
      };
    }

    const prefetch = Array.from(document.querySelectorAll('link[rel="prefetch"]'));
    const preload = Array.from(document.querySelectorAll('link[rel="preload"]'));
    const preconnect = Array.from(document.querySelectorAll('link[rel="preconnect"]'));
    const dnsPrefetch = Array.from(document.querySelectorAll('link[rel="dns-prefetch"]'));

    return {
      prefetch: prefetch as HTMLLinkElement[],
      preload: preload as HTMLLinkElement[],
      preconnect: preconnect as HTMLLinkElement[],
      dnsPrefetch: dnsPrefetch as HTMLLinkElement[],
    };
  }, []);

  return hints;
}

/**
 * 智能资源 Hint 生成器
 * 根据页面类型和设备能力自动生成优化的 hints
 */
export function useSmartResourceHints(pageType: string) {
  const hints = useMemo<ResourceHintConfig[]>(() => {
    const baseHints: ResourceHintConfig[] = [];

    // DNS Prefetch - 始终预解析关键域名
    baseHints.push({
      url: '//fonts.googleapis.com',
      type: 'dns-prefetch',
      insertDelay: 0,
    });

    baseHints.push({
      url: '//fonts.gstatic.com',
      type: 'dns-prefetch',
      insertDelay: 0,
    });

    // Preconnect - 建立连接到关键源
    baseHints.push({
      url: window.location.origin,
      type: 'preconnect',
      insertDelay: 0,
    });

    // 根据页面类型添加特定 hints
    switch (pageType) {
      case 'home':
        baseHints.push({
          url: '/fonts/inter-var.woff2',
          type: 'preload',
          as: 'font',
          crossorigin: true,
          typeAttr: 'font/woff2',
          dynamic: true,
        });
        baseHints.push({
          url: '/styles/critical.css',
          type: 'preload',
          as: 'style',
          dynamic: true,
        });
        break;

      case 'dashboard':
        baseHints.push({
          url: '/api/dashboard/stats',
          type: 'prefetch',
          as: 'fetch',
          dynamic: true,
          insertDelay: 500,
        });
        break;

      case 'tasks':
        baseHints.push({
          url: '/api/tasks',
          type: 'prefetch',
          as: 'fetch',
          dynamic: true,
          insertDelay: 500,
        });
        break;

      default:
        break;
    }

    return baseHints;
  }, [pageType]);

  return hints;
}

export default useResourceHint;
