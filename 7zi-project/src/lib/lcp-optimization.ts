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

/**
 * 预连接到字体和图片 CDN
 */
function preconnectToCDNs() {
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

/**
 * 防止字体交换（FOUT）
 *
 * 使用 font-display: swap 可以让文本立即可见，但会导致 FOUT
 * 使用 font-display: optional 可以防止 FOUT，但可能导致字体不加载
 */
function optimizeFontDisplay() {
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
