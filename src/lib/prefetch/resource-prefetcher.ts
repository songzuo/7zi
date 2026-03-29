/**
 * Resource Prefetcher
 * 
 * 智能资源预加载系统
 * - 图片预加载（基于视口）
 * - 脚本预加载
 * - 样式表预加载
 * - 字体预加载
 */

export interface ResourceConfig {
  url: string;
  type: 'image' | 'script' | 'style' | 'font' | 'fetch' | 'document';
  priority: 'high' | 'medium' | 'low';
  as?: string;
  crossorigin?: boolean;
  media?: string;
  sizes?: string;
  typeAttr?: string; // for fonts
}

export interface PrefetchResult {
  url: string;
  type: ResourceConfig['type'];
  status: 'pending' | 'loaded' | 'error';
  loadTime?: number;
  cached?: boolean;
  size?: number;
}

export interface ViewportBasedConfig {
  /** 预加载距离阈值（像素） */
  threshold: number;
  /** 是否考虑滚动方向 */
  considerDirection: boolean;
  /** 滚动方向 */
  scrollDirection?: 'up' | 'down';
}

/**
 * 资源预加载器
 */
export class ResourcePrefetcher {
  private prefetchedResources: Map<string, PrefetchResult> = new Map();
  private pendingPrefetches: Set<string> = new Set();
  private observer: IntersectionObserver | null = null;
  private config: {
    maxConcurrent: number;
    defaultPriority: 'high' | 'medium' | 'low';
    enableViewportBased: boolean;
    viewportConfig: ViewportBasedConfig;
  };

  constructor(config?: Partial<typeof ResourcePrefetcher.prototype.config>) {
    this.config = {
      maxConcurrent: 6,
      defaultPriority: 'medium',
      enableViewportBased: true,
      viewportConfig: {
        threshold: 200, // 200px
        considerDirection: true,
      },
      ...config,
    };
  }

  /**
   * 预加载资源
   */
  async prefetchResource(resource: ResourceConfig): Promise<PrefetchResult> {
    const { url } = resource;

    // 检查是否已预加载
    const existing = this.prefetchedResources.get(url);
    if (existing && existing.status === 'loaded') {
      return { ...existing, cached: true };
    }

    // 检查是否正在预加载
    if (this.pendingPrefetches.has(url)) {
      return {
        url,
        type: resource.type,
        status: 'pending',
      };
    }

    // 检查并发限制
    if (this.pendingPrefetches.size >= this.config.maxConcurrent) {
      console.warn('Max concurrent prefetches reached, skipping:', url);
      return {
        url,
        type: resource.type,
        status: 'pending',
      };
    }

    this.pendingPrefetches.add(url);
    const startTime = performance.now();

    try {
      await this.executePrefetch(resource);
      
      const result: PrefetchResult = {
        url,
        type: resource.type,
        status: 'loaded',
        loadTime: performance.now() - startTime,
      };

      this.prefetchedResources.set(url, result);
      return result;
    } catch (error) {
      const result: PrefetchResult = {
        url,
        type: resource.type,
        status: 'error',
      };

      this.prefetchedResources.set(url, result);
      return result;
    } finally {
      this.pendingPrefetches.delete(url);
    }
  }

  /**
   * 批量预加载资源
   */
  async prefetchResources(resources: ResourceConfig[]): Promise<PrefetchResult[]> {
    // 按优先级分组
    const grouped = this.groupByPriority(resources);
    
    // 按优先级顺序预加载
    const results: PrefetchResult[] = [];

    // 高优先级资源
    if (grouped.high.length > 0) {
      const highResults = await Promise.all(
        grouped.high.map(r => this.prefetchResource(r))
      );
      results.push(...highResults);
    }

    // 中优先级资源（延迟 100ms）
    if (grouped.medium.length > 0) {
      await this.delay(100);
      const mediumResults = await Promise.all(
        grouped.medium.map(r => this.prefetchResource(r))
      );
      results.push(...mediumResults);
    }

    // 低优先级资源（延迟 300ms）
    if (grouped.low.length > 0) {
      await this.delay(300);
      const lowResults = await Promise.all(
        grouped.low.map(r => this.prefetchResource(r))
      );
      results.push(...lowResults);
    }

    return results;
  }

  /**
   * 执行预加载
   */
  private async executePrefetch(resource: ResourceConfig): Promise<void> {
    if (typeof document === 'undefined') {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = resource.url;

    // 设置 as 属性
    if (resource.as) {
      link.as = resource.as;
    } else {
      link.as = this.getAsAttribute(resource.type);
    }

    // 设置其他属性
    if (resource.crossorigin) {
      link.crossOrigin = 'anonymous';
    }
    if (resource.media) {
      link.media = resource.media;
    }
    if (resource.sizes) {
      link.sizes = resource.sizes;
    }
    if (resource.typeAttr) {
      link.type = resource.typeAttr;
    }

    // 对于字体，使用 preload 而非 prefetch
    if (resource.type === 'font') {
      link.rel = 'preload';
    }

    return new Promise((resolve, reject) => {
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to prefetch: ${resource.url}`));

      document.head.appendChild(link);

      // 超时处理
      setTimeout(() => {
        reject(new Error(`Prefetch timeout: ${resource.url}`));
      }, 10000);
    });
  }

  /**
   * 预加载图片（基于视口）
   */
  prefetchImagesInViewport(
    selector: string = 'img[data-prefetch]',
    config?: Partial<ViewportBasedConfig>
  ): void {
    if (typeof document === 'undefined' || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const finalConfig = { ...this.config.viewportConfig, ...config };

    // 创建观察器
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.prefetch || img.src;

            if (src && !this.prefetchedResources.has(src)) {
              this.prefetchResource({
                url: src,
                type: 'image',
                priority: 'medium',
              });

              // 停止观察已处理的元素
              this.observer?.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: `${finalConfig.threshold}px`,
      }
    );

    // 观察所有匹配的图片
    document.querySelectorAll(selector).forEach((img) => {
      this.observer?.observe(img);
    });
  }

  /**
   * 预加载关键字体
   */
  async prefetchCriticalFonts(fonts: string[]): Promise<PrefetchResult[]> {
    return this.prefetchResources(
      fonts.map((font) => ({
        url: font,
        type: 'font' as const,
        priority: 'high' as const,
        crossorigin: true,
        typeAttr: 'font/woff2',
      }))
    );
  }

  /**
   * 预加载关键 CSS
   */
  async prefetchCriticalCSS(urls: string[]): Promise<PrefetchResult[]> {
    return this.prefetchResources(
      urls.map((url) => ({
        url,
        type: 'style' as const,
        priority: 'high' as const,
      }))
    );
  }

  /**
   * 预加载关键脚本
   */
  async prefetchCriticalScripts(urls: string[]): Promise<PrefetchResult[]> {
    return this.prefetchResources(
      urls.map((url) => ({
        url,
        type: 'script' as const,
        priority: 'high' as const,
      }))
    );
  }

  /**
   * 预加载数据（API 响应）
   */
  async prefetchData(urls: string[]): Promise<PrefetchResult[]> {
    return this.prefetchResources(
      urls.map((url) => ({
        url,
        type: 'fetch' as const,
        priority: 'medium' as const,
        crossorigin: true,
      }))
    );
  }

  /**
   * 使用 DNS 预解析
   */
  dnsPrefetch(domains: string[]): void {
    if (typeof document === 'undefined') return;

    domains.forEach((domain) => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      document.head.appendChild(link);
    });
  }

  /**
   * 使用预连接
   */
  preconnect(origins: string[]): void {
    if (typeof document === 'undefined') return;

    origins.forEach((origin) => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }

  /**
   * 生成 resource hints
   */
  generateResourceHints(resources: ResourceConfig[]): string[] {
    return resources.map((resource) => {
      const attrs: string[] = ['rel="prefetch"', `href="${resource.url}"`];

      const as = resource.as || this.getAsAttribute(resource.type);
      attrs.push(`as="${as}"`);

      if (resource.crossorigin) {
        attrs.push('crossorigin');
      }
      if (resource.media) {
        attrs.push(`media="${resource.media}"`);
      }
      if (resource.sizes) {
        attrs.push(`sizes="${resource.sizes}"`);
      }

      return `<link ${attrs.join(' ')}>`;
    });
  }

  /**
   * 获取预加载状态
   */
  getPrefetchStatus(): {
    total: number;
    loaded: number;
    pending: number;
    errors: number;
    resources: PrefetchResult[];
  } {
    const resources = Array.from(this.prefetchedResources.values());
    
    return {
      total: resources.length,
      loaded: resources.filter(r => r.status === 'loaded').length,
      pending: this.pendingPrefetches.size,
      errors: resources.filter(r => r.status === 'error').length,
      resources,
    };
  }

  /**
   * 清除预加载缓存
   */
  clearCache(): void {
    this.prefetchedResources.clear();
    this.pendingPrefetches.clear();
    
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  /**
   * 销毁实例
   */
  destroy(): void {
    this.clearCache();
  }

  /**
   * 按优先级分组
   */
  private groupByPriority(
    resources: ResourceConfig[]
  ): Record<'high' | 'medium' | 'low', ResourceConfig[]> {
    return {
      high: resources.filter(r => r.priority === 'high'),
      medium: resources.filter(r => r.priority === 'medium'),
      low: resources.filter(r => r.priority === 'low'),
    };
  }

  /**
   * 获取 as 属性值
   */
  private getAsAttribute(type: ResourceConfig['type']): string {
    const mapping: Record<ResourceConfig['type'], string> = {
      image: 'image',
      script: 'script',
      style: 'style',
      font: 'font',
      fetch: 'fetch',
      document: 'document',
    };
    return mapping[type];
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 全局资源预加载器实例
 */
export const globalResourcePrefetcher = new ResourcePrefetcher();

/**
 * 预加载配置预设
 */
export const PREFETCH_PRESETS = {
  /** 关键资源预加载 */
  critical: {
    fonts: [
      '/fonts/inter-var.woff2',
      '/fonts/inter-bold.woff2',
    ],
    styles: [
      '/styles/critical.css',
    ],
    scripts: [
      '/scripts/polyfills.js',
    ],
  },

  /** 首页预加载 */
  home: {
    images: [
      '/images/hero-bg.webp',
      '/images/hero-mobile-bg.webp',
    ],
    data: [
      '/api/featured-content',
      '/api/recent-updates',
    ],
  },

  /** Dashboard 预加载 */
  dashboard: {
    data: [
      '/api/dashboard/stats',
      '/api/user/preferences',
      '/api/notifications',
    ],
    images: [
      '/images/dashboard-placeholder.webp',
    ],
  },
} as const;
