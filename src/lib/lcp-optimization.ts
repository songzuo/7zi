/**
 * LCP Optimization Helper
 * 专门优化 Largest Contentful Paint (LCP) 的辅助函数
 * 
 * LCP 是最重要的性能指标之一，优化它包括：
 * 1. 预加载关键资源
 * 2. 优化关键渲染路径
 * 3. 移除阻塞渲染的 JavaScript
 * 4. 优化字体加载
 * 5. 确保关键 CSS 优先级
 */

// ============================================
// 关键资源预加载
// ============================================

/**
 * 预加载 LCP 图片
 * 
 * 这应该是页面上最大的图片元素
 * 
 * 使用方法：
 * ```tsx
 * useEffect(() => {
 *   preloadLCPImage('/hero-image.jpg');
 * }, []);
 * ```
 */
export function preloadLCPImage(src: string) {
  if (typeof document === 'undefined') return;

  // 检查是否已存在
  const existing = document.querySelector(`link[href="${src}"][rel="preload"][as="image"]`);
  if (existing) return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = src;
  
  // 添加 fetchpriority="high" 优先加载
  link.setAttribute('fetchpriority', 'high');
  
  document.head.appendChild(link);
}

/**
 * 预加载关键字体
 * 
 * 字体加载会阻塞文本渲染（FOIT/FOUT）
 */
export function preloadCriticalFonts(fontUrls: string[]) {
  if (typeof document === 'undefined') return;

  fontUrls.forEach((url) => {
    const existing = document.querySelector(`link[href="${url}"][rel="preload"][as="font"]`);
    if (existing) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.href = url;
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    
    document.head.appendChild(link);
  });
}

/**
 * 预连接到字体和图片 CDN
 */
export function preconnectToCDNs() {
  if (typeof document === 'undefined') return;

  const domains = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    'https://images.unsplash.com',
    'https://cdn.jsdelivr.net',
  ];

  domains.forEach((domain) => {
    // DNS 预解析
    const dnsLink = document.createElement('link');
    dnsLink.rel = 'dns-prefetch';
    dnsLink.href = domain;
    document.head.appendChild(dnsLink);

    // 预连接（建立 TCP 握手）
    const connectLink = document.createElement('link');
    connectLink.rel = 'preconnect';
    connectLink.href = domain;
    connectLink.crossOrigin = 'anonymous';
    document.head.appendChild(connectLink);
  });
}

// ============================================
// 图片优化
// ============================================

/**
 * 优化 LCP 图片元素
 * 
 * 使用方法：
 * ```tsx
 * <img
 *   src="/hero.jpg"
 *   alt="Hero"
 *   {...optimizeLCPImage({
 *     priority: true,
 *     width: 1920,
 *     height: 1080,
 *   })}
 * />
 * ```
 */
export function optimizeLCPImage(options: {
  priority?: boolean;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager' | 'auto';
}) {
  const props: Record<string, string | number> = {
    loading: options.loading || (options.priority ? 'eager' : 'lazy'),
  };

  if (options.priority) {
    props.fetchpriority = 'high';
  }

  if (options.width) props.width = options.width;
  if (options.height) props.height = options.height;

  return props;
}

/**
 * 使用 srcset 响应式图片
 * 
 * 这可以确保浏览器下载最合适的图片尺寸
 */
export function generateSrcSet(
  baseUrl: string,
  widths: number[] = [640, 750, 828, 1080, 1200, 1920, 2048, 3840]
): string {
  return widths
    .map((width) => `${baseUrl}?w=${width} ${width}w`)
    .join(', ');
}

/**
 * 使用 sizes 属性进一步优化
 */
export function generateSizes(breakpoints: Record<string, string> = {
  '(max-width: 640px)': '100vw',
  '(max-width: 1024px)': '90vw',
  'default': '1200px',
}): string {
  return Object.entries(breakpoints)
    .map(([condition, size]) => {
      return condition === 'default' ? size : `${condition} ${size}`;
    })
    .join(', ');
}

// ============================================
// 字体优化
// ============================================

/**
 * 防止字体交换（FOUT）
 * 
 * 使用 font-display: swap 可以让文本立即可见，但会导致 FOUT
 * 使用 font-display: optional 可以防止 FOUT，但可能导致字体不加载
 */
export function optimizeFontDisplay() {
  if (typeof document === 'undefined') return;

  // 添加 font-display: optional 到字体样式
  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-family: 'Geist Sans';
      font-display: optional;
    }
    @font-face {
      font-family: 'Geist Mono';
      font-display: optional;
    }
  `;
  document.head.appendChild(style);
}

/**
 * 预加载并立即使用关键字体
 */
export function preloadAndUseCriticalFont(fontUrl: string, fontFamily: string) {
  if (typeof document === 'undefined') return;

  // 预加载字体
  preloadCriticalFonts([fontUrl]);

  // 立即使用字体
  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-family: '${fontFamily}';
      src: url('${fontUrl}') format('woff2');
      font-display: swap;
      font-weight: 400;
    }
  `;
  document.head.appendChild(style);
}

// ============================================
// CSS 优化
// ============================================

/**
 * 内联关键 CSS
 * 
 * 关键 CSS（首屏渲染所需的 CSS）应该内联在 HTML 中
 * 避免阻塞渲染
 */
export function inlineCriticalCSS(css: string) {
  if (typeof document === 'undefined') return;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

/**
 * 异步加载非关键 CSS
 * 
 * 非关键 CSS 可以延迟加载
 */
export function loadCSSAsync(href: string) {
  if (typeof document === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'style';
  link.href = href;
  link.onload = () => {
    link.rel = 'stylesheet';
  };
  document.head.appendChild(link);
}

// ============================================
// JavaScript 优化
// ============================================

/**
 * 延迟非关键 JavaScript
 * 
 * 使用 defer 或 async 避免阻塞渲染
 */
export function deferNonCriticalJS(src: string) {
  if (typeof document === 'undefined') return;

  const script = document.createElement('script');
  script.src = src;
  script.defer = true;
  document.body.appendChild(script);
}

/**
 * 使用 requestIdleCallback 延迟加载低优先级 JS
 */
export function loadJSWhenIdle(src: string) {
  if (typeof window === 'undefined') return;

  const load = () => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    document.body.appendChild(script);
  };

  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(load);
  } else {
    setTimeout(load, 2000);
  }
}

// ============================================
// 性能标记
// ============================================

/**
 * Extended PerformanceEntry type for LCP
 */
interface LCPPerformanceEntry extends PerformanceEntry {
  /** The LCP element */
  element?: HTMLElement;
  /** URL of the image resource (for image LCP) */
  url?: string;
  /** Size of the LCP element */
  size?: number;
  /** Load time of the LCP resource */
  loadTime?: number;
}

/**
 * 标记 LCP 元素
 *
 * 用于性能分析和调试
 */
export function markLCPElement(element: HTMLElement) {
  if (typeof performance === 'undefined') return;

  // 标记 LCP 元素加载
  performance.mark('lcp-element-load');

  // 监听 LCP 事件
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lcpEntry = entries[entries.length - 1] as LCPPerformanceEntry;

      if (lcpEntry) {
        console.log('[LCP] Largest Contentful Paint:', lcpEntry);
        console.log('[LCP] Element:', lcpEntry.element);

        // 测量从元素加载到 LCP 的时间
        performance.measure(
          'lcp-element-to-paint',
          lcpEntry.startTime.toString()
        );
      }
    });

    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  }
}

// ============================================
// 初始化 LCP 优化
// ============================================

/**
 * 自动应用 LCP 优化
 * 
 * 在页面加载时调用此函数
 */
export function initLCPOptimizations() {
  if (typeof window === 'undefined') return;

  // 预连接到 CDN
  preconnectToCDNs();

  // 优化字体显示
  optimizeFontDisplay();

  // 添加性能标记
  performance.mark('lcp-optimizations-init');

  // 页面加载完成后清理
  window.addEventListener('load', () => {
    performance.mark('lcp-optimizations-complete');
    performance.measure(
      'lcp-optimizations-duration',
      'lcp-optimizations-init',
      'lcp-optimizations-complete'
    );
  });
}
