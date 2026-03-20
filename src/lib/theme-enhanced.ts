/**
 * Theme Enhanced - 深色模式增强工具
 * 
 * 提供深色模式的辅助函数和工具
 */

export type Theme = 'light' | 'dark' | 'system';

/**
 * 检测系统是否处于深色模式
 */
export function isSystemDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * 监听系统深色模式变化
 */
export function listenSystemThemeChange(callback: (isDark: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  // 使用 addEventListener 而不是 addListener (已废弃)
  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches);
  };
  mediaQuery.addEventListener('change', handler);

  return () => {
    mediaQuery.removeEventListener('change', handler);
  };
}

/**
 * 获取有效主题（解析 system 主题）
 */
export function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return isSystemDark() ? 'dark' : 'light';
  }
  return theme;
}

/**
 * 应用主题到 DOM
 */
export function applyTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;

  const effectiveTheme = getEffectiveTheme(theme);
  const root = document.documentElement;

  if (effectiveTheme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }

  // 设置 color-scheme 属性
  root.style.colorScheme = effectiveTheme;
}

/**
 * 添加过渡动画防止闪烁
 */
export function enableThemeTransition(): void {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  
  // 首次加载时不显示过渡，防止闪烁
  const removeNoTransition = () => {
    root.classList.remove('no-transitions');
    window.removeEventListener('load', removeNoTransition);
  };
  
  root.classList.add('no-transitions');
  window.addEventListener('load', removeNoTransition);

  // 如果已经加载完成，立即移除
  if (document.readyState === 'complete') {
    root.classList.remove('no-transitions');
  }
}

/**
 * 图片滤镜适配深色模式
 */
export function getImageFilter(isDark: boolean): string {
  if (isDark) {
    // 在深色模式下降低图片亮度，避免过亮
    return 'brightness(0.9) contrast(1.1)';
  }
  return 'none';
}

/**
 * 图表颜色适配深色模式
 */
export function getChartColors(isDark: boolean) {
  return {
    text: isDark ? '#a1a1aa' : '#71717a',
    grid: isDark ? '#27272a' : '#e4e4e7',
    tooltipBg: isDark ? '#18181b' : '#ffffff',
    tooltipText: isDark ? '#fafafa' : '#171717',
    border: isDark ? '#3f3f46' : '#e4e4e7',
  };
}

/**
 * 防止主题切换时的闪烁
 */
export function preventThemeFlash(theme: Theme): void {
  if (typeof window === 'undefined') return;

  // 在页面加载前就设置主题
  const effectiveTheme = getEffectiveTheme(theme);
  
  // 立即应用主题类
  const root = document.documentElement;
  root.classList.add(effectiveTheme === 'dark' ? 'dark' : 'light');
  root.style.colorScheme = effectiveTheme;
  
  // 设置可见性
  document.documentElement.style.visibility = 'visible';
}
