'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * 主题颜色配置
 */
export interface ThemeColors {
  /** 主色调 */
  primary: string;
  /** 主色调（悬停态） */
  primaryHover: string;
  /** 强调色 */
  accent: string;
  /** 背景色 */
  background: string;
  /** 前景色（文字） */
  foreground: string;
  /** 卡片背景 */
  card: string;
  /** 边框色 */
  border: string;
  /** 成功色 */
  success: string;
  /** 警告色 */
  warning: string;
  /** 错误色 */
  error: string;
  /** 信息色 */
  info: string;
}

/**
 * 主题间距配置
 */
export interface ThemeSpacing {
  /** 基础单位 */
  baseUnit: number;
  /** 组件间距 */
  componentGap: number;
  /** 卡片内边距 */
  cardPadding: number;
  /** 页面边距 */
  pagePadding: number;
}

/**
 * 主题圆角配置
 */
export interface ThemeRadius {
  /** 按钮 */
  button: number;
  /** 卡片 */
  card: number;
  /** 输入框 */
  input: number;
  /** 模态框 */
  modal: number;
}

/**
 * 完整主题配置
 */
export interface ThemeConfig {
  /** 主题名称 */
  name: string;
  /** 主题ID */
  id: string;
  /** 是否为深色主题 */
  isDark: boolean;
  /** 颜色配置 */
  colors: ThemeColors;
  /** 间距配置 */
  spacing: ThemeSpacing;
  /** 圆角配置 */
  radius: ThemeRadius;
  /** 字体 */
  fontFamily: string;
  /** 动画时长倍率 */
  animationSpeed: number;
}

/**
 * 预设主题
 */
export const PRESET_THEMES: Record<string, ThemeConfig> = {
  // 默认浅色主题
  'light-default': {
    name: '默认浅色',
    id: 'light-default',
    isDark: false,
    colors: {
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      accent: '#8b5cf6',
      background: '#f9fafb',
      foreground: '#111827',
      card: '#ffffff',
      border: '#e5e7eb',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    spacing: {
      baseUnit: 4,
      componentGap: 16,
      cardPadding: 16,
      pagePadding: 24,
    },
    radius: {
      button: 8,
      card: 12,
      input: 6,
      modal: 16,
    },
    fontFamily: 'Inter, system-ui, sans-serif',
    animationSpeed: 1,
  },
  
  // 默认深色主题
  'dark-default': {
    name: '默认深色',
    id: 'dark-default',
    isDark: true,
    colors: {
      primary: '#60a5fa',
      primaryHover: '#3b82f6',
      accent: '#a78bfa',
      background: '#0f172a',
      foreground: '#f1f5f9',
      card: '#1e293b',
      border: '#334155',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#60a5fa',
    },
    spacing: {
      baseUnit: 4,
      componentGap: 16,
      cardPadding: 16,
      pagePadding: 24,
    },
    radius: {
      button: 8,
      card: 12,
      input: 6,
      modal: 16,
    },
    fontFamily: 'Inter, system-ui, sans-serif',
    animationSpeed: 1,
  },
  
  // 海洋蓝主题
  'ocean-blue': {
    name: '海洋蓝',
    id: 'ocean-blue',
    isDark: false,
    colors: {
      primary: '#0ea5e9',
      primaryHover: '#0284c7',
      accent: '#06b6d4',
      background: '#f0f9ff',
      foreground: '#0c4a6e',
      card: '#ffffff',
      border: '#bae6fd',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#0ea5e9',
    },
    spacing: {
      baseUnit: 4,
      componentGap: 16,
      cardPadding: 16,
      pagePadding: 24,
    },
    radius: {
      button: 8,
      card: 12,
      input: 6,
      modal: 16,
    },
    fontFamily: 'Inter, system-ui, sans-serif',
    animationSpeed: 1,
  },
  
  // 森林绿主题
  'forest-green': {
    name: '森林绿',
    id: 'forest-green',
    isDark: false,
    colors: {
      primary: '#22c55e',
      primaryHover: '#16a34a',
      accent: '#14b8a6',
      background: '#f0fdf4',
      foreground: '#14532d',
      card: '#ffffff',
      border: '#bbf7d0',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    spacing: {
      baseUnit: 4,
      componentGap: 16,
      cardPadding: 16,
      pagePadding: 24,
    },
    radius: {
      button: 8,
      card: 12,
      input: 6,
      modal: 16,
    },
    fontFamily: 'Inter, system-ui, sans-serif',
    animationSpeed: 1,
  },
  
  // 紫罗兰主题
  'violet-dream': {
    name: '紫罗兰',
    id: 'violet-dream',
    isDark: false,
    colors: {
      primary: '#8b5cf6',
      primaryHover: '#7c3aed',
      accent: '#ec4899',
      background: '#faf5ff',
      foreground: '#3b0764',
      card: '#ffffff',
      border: '#e9d5ff',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#8b5cf6',
    },
    spacing: {
      baseUnit: 4,
      componentGap: 16,
      cardPadding: 16,
      pagePadding: 24,
    },
    radius: {
      button: 8,
      card: 12,
      input: 6,
      modal: 16,
    },
    fontFamily: 'Inter, system-ui, sans-serif',
    animationSpeed: 1,
  },
  
  // 午夜深色主题
  'midnight-dark': {
    name: '午夜深色',
    id: 'midnight-dark',
    isDark: true,
    colors: {
      primary: '#818cf8',
      primaryHover: '#6366f1',
      accent: '#c084fc',
      background: '#030712',
      foreground: '#f9fafb',
      card: '#111827',
      border: '#1f2937',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#818cf8',
    },
    spacing: {
      baseUnit: 4,
      componentGap: 16,
      cardPadding: 16,
      pagePadding: 24,
    },
    radius: {
      button: 8,
      card: 12,
      input: 6,
      modal: 16,
    },
    fontFamily: 'Inter, system-ui, sans-serif',
    animationSpeed: 1,
  },
  
  // 高对比度主题
  'high-contrast': {
    name: '高对比度',
    id: 'high-contrast',
    isDark: false,
    colors: {
      primary: '#000000',
      primaryHover: '#333333',
      accent: '#0000ff',
      background: '#ffffff',
      foreground: '#000000',
      card: '#ffffff',
      border: '#000000',
      success: '#008000',
      warning: '#ff8c00',
      error: '#ff0000',
      info: '#0000ff',
    },
    spacing: {
      baseUnit: 4,
      componentGap: 20,
      cardPadding: 20,
      pagePadding: 28,
    },
    radius: {
      button: 4,
      card: 4,
      input: 4,
      modal: 8,
    },
    fontFamily: 'Arial, sans-serif',
    animationSpeed: 0.5,
  },
};

const STORAGE_KEY = 'custom-theme-config';

/**
 * 将主题配置应用为 CSS 变量
 */
function applyThemeToDOM(config: ThemeConfig): void {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  
  // 颜色变量
  root.style.setProperty('--color-primary', config.colors.primary);
  root.style.setProperty('--color-primary-hover', config.colors.primaryHover);
  root.style.setProperty('--color-accent', config.colors.accent);
  root.style.setProperty('--color-background', config.colors.background);
  root.style.setProperty('--color-foreground', config.colors.foreground);
  root.style.setProperty('--color-card', config.colors.card);
  root.style.setProperty('--color-border', config.colors.border);
  root.style.setProperty('--color-success', config.colors.success);
  root.style.setProperty('--color-warning', config.colors.warning);
  root.style.setProperty('--color-error', config.colors.error);
  root.style.setProperty('--color-info', config.colors.info);
  
  // 间距变量
  root.style.setProperty('--spacing-base', `${config.spacing.baseUnit}px`);
  root.style.setProperty('--spacing-component', `${config.spacing.componentGap}px`);
  root.style.setProperty('--spacing-card', `${config.spacing.cardPadding}px`);
  root.style.setProperty('--spacing-page', `${config.spacing.pagePadding}px`);
  
  // 圆角变量
  root.style.setProperty('--radius-button', `${config.radius.button}px`);
  root.style.setProperty('--radius-card', `${config.radius.card}px`);
  root.style.setProperty('--radius-input', `${config.radius.input}px`);
  root.style.setProperty('--radius-modal', `${config.radius.modal}px`);
  
  // 字体
  root.style.setProperty('--font-family', config.fontFamily);
  
  // 动画速度
  root.style.setProperty('--animation-speed', String(config.animationSpeed));
  
  // 深色模式类
  if (config.isDark) {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
}

/**
 * 从 localStorage 加载自定义主题
 */
function loadCustomTheme(): ThemeConfig | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  
  return null;
}

/**
 * 保存自定义主题到 localStorage
 */
function saveCustomTheme(config: ThemeConfig): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

/**
 * 主题定制 Hook
 * 
 * @example
 * ```tsx
 * function ThemeCustomizer() {
 *   const { currentTheme, setTheme, customizeColors } = useThemeCustomization();
 *   
 *   return (
 *     <div>
 *       <ColorPicker
 *         value={currentTheme.colors.primary}
 *         onChange={(color) => customizeColors({ primary: color })}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function useThemeCustomization() {
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(PRESET_THEMES['light-default']);
  const [customThemes, setCustomThemes] = useState<Record<string, ThemeConfig>>({});
  const [mounted, setMounted] = useState(false);

  // 所有可用主题（预设 + 自定义）
  const availableThemes = useMemo(() => ({
    ...PRESET_THEMES,
    ...customThemes,
  }), [customThemes]);

  // 初始化
  useEffect(() => {
    const savedTheme = loadCustomTheme();
    if (savedTheme) {
      setCurrentTheme(savedTheme);
      applyThemeToDOM(savedTheme);
    }
    setMounted(true);
  }, []);

  // 设置主题
  const setTheme = useCallback((themeId: string) => {
    const theme = availableThemes[themeId] || PRESET_THEMES['light-default'];
    setCurrentTheme(theme);
    applyThemeToDOM(theme);
    saveCustomTheme(theme);
  }, [availableThemes]);

  // 自定义颜色
  const customizeColors = useCallback((colors: Partial<ThemeColors>) => {
    setCurrentTheme(prev => {
      const newTheme: ThemeConfig = {
        ...prev,
        colors: { ...prev.colors, ...colors },
      };
      applyThemeToDOM(newTheme);
      saveCustomTheme(newTheme);
      return newTheme;
    });
  }, []);

  // 自定义间距
  const customizeSpacing = useCallback((spacing: Partial<ThemeSpacing>) => {
    setCurrentTheme(prev => {
      const newTheme: ThemeConfig = {
        ...prev,
        spacing: { ...prev.spacing, ...spacing },
      };
      applyThemeToDOM(newTheme);
      saveCustomTheme(newTheme);
      return newTheme;
    });
  }, []);

  // 自定义圆角
  const customizeRadius = useCallback((radius: Partial<ThemeRadius>) => {
    setCurrentTheme(prev => {
      const newTheme: ThemeConfig = {
        ...prev,
        radius: { ...prev.radius, ...radius },
      };
      applyThemeToDOM(newTheme);
      saveCustomTheme(newTheme);
      return newTheme;
    });
  }, []);

  // 设置字体
  const setFontFamily = useCallback((fontFamily: string) => {
    setCurrentTheme(prev => {
      const newTheme: ThemeConfig = { ...prev, fontFamily };
      applyThemeToDOM(newTheme);
      saveCustomTheme(newTheme);
      return newTheme;
    });
  }, []);

  // 设置动画速度
  const setAnimationSpeed = useCallback((speed: number) => {
    setCurrentTheme(prev => {
      const newTheme: ThemeConfig = { ...prev, animationSpeed: speed };
      applyThemeToDOM(newTheme);
      saveCustomTheme(newTheme);
      return newTheme;
    });
  }, []);

  // 保存为自定义主题
  const saveAsCustomTheme = useCallback((name: string) => {
    const id = `custom-${Date.now()}`;
    const newTheme: ThemeConfig = { ...currentTheme, id, name };
    
    setCustomThemes(prev => {
      const updated = { ...prev, [id]: newTheme };
      return updated;
    });
    
    // 同时保存自定义主题列表
    try {
      const stored = localStorage.getItem('custom-themes-list');
      const list = stored ? JSON.parse(stored) : {};
      localStorage.setItem('custom-themes-list', JSON.stringify({ ...list, [id]: newTheme }));
    } catch {
      // ignore
    }
    
    return id;
  }, [currentTheme]);

  // 重置为默认主题
  const resetTheme = useCallback(() => {
    const defaultTheme = PRESET_THEMES['light-default'];
    setCurrentTheme(defaultTheme);
    applyThemeToDOM(defaultTheme);
    saveCustomTheme(defaultTheme);
  }, []);

  // 导出主题
  const exportTheme = useCallback(() => {
    return JSON.stringify(currentTheme, null, 2);
  }, [currentTheme]);

  // 导入主题
  const importTheme = useCallback((json: string): { success: boolean; error?: string } => {
    try {
      const imported = JSON.parse(json) as ThemeConfig;
      
      // 验证必要字段
      if (!imported.id || !imported.colors || !imported.spacing || !imported.radius) {
        return { success: false, error: '主题配置不完整' };
      }
      
      setCurrentTheme(imported);
      applyThemeToDOM(imported);
      saveCustomTheme(imported);
      return { success: true };
    } catch {
      return { success: false, error: '无效的主题格式' };
    }
  }, []);

  return {
    currentTheme,
    availableThemes,
    presetThemes: PRESET_THEMES,
    customThemes,
    mounted,
    
    // 设置方法
    setTheme,
    customizeColors,
    customizeSpacing,
    customizeRadius,
    setFontFamily,
    setAnimationSpeed,
    
    // 自定义主题
    saveAsCustomTheme,
    
    // 重置
    resetTheme,
    
    // 导入导出
    exportTheme,
    importTheme,
  };
}

export default useThemeCustomization;