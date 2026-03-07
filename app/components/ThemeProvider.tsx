'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

/**
 * 主题类型
 * - light: 浅色模式
 * - dark: 深色模式
 * - system: 跟随系统设置
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * 解析后的实际主题（不包含 system）
 */
export type ResolvedTheme = 'light' | 'dark';

/**
 * 主题上下文类型
 */
interface ThemeContextType {
  /** 当前主题设置 */
  theme: Theme;
  /** 实际应用的主题（如果 theme 是 system，则返回系统当前主题） */
  resolvedTheme: ResolvedTheme;
  /** 是否正在切换主题（用于动画） */
  isTransitioning: boolean;
  /** 设置主题 */
  setTheme: (theme: Theme) => void;
  /** 切换主题（light <-> dark） */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'theme';
const DEFAULT_THEME: Theme = 'system';
const TRANSITION_DURATION = 300; // ms

/**
 * 获取系统主题偏好
 */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * 从 localStorage 读取主题
 */
function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 保存主题到 localStorage
 */
function setStoredTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

/**
 * 应用主题到 DOM
 */
function applyTheme(theme: ResolvedTheme, enableTransition: boolean = true): void {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  
  // 添加过渡类以启用平滑动画
  if (enableTransition) {
    root.classList.add('theme-transitioning');
  }
  
  if (theme === 'dark') {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
  
  // 动画完成后移除过渡类
  if (enableTransition) {
    setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, TRANSITION_DURATION);
  }
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

/**
 * 主题提供者组件
 * 
 * 功能：
 * - 支持 light/dark/system 三种模式
 * - 自动持久化到 localStorage
 * - 跟随系统主题变化
 * - 平滑的主题切换动画
 * 
 * @example
 * ```tsx
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({ 
  children, 
  defaultTheme = DEFAULT_THEME 
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 解析主题（将 system 转换为实际主题）
  const resolveTheme = useCallback((themeValue: Theme): ResolvedTheme => {
    if (themeValue === 'system') {
      return getSystemTheme();
    }
    return themeValue;
  }, []);

  // 设置主题
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    setStoredTheme(newTheme);
  }, []);

  // 切换主题
  const toggleTheme = useCallback(() => {
    // 如果当前是 system，基于解析后的主题切换
    const current = theme === 'system' ? resolveTheme(theme) : theme;
    const newTheme: Theme = current === 'light' ? 'dark' : 'light';
    setThemeState(newTheme);
    setStoredTheme(newTheme);
  }, [theme, resolveTheme]);

  // 初始化：从 localStorage 读取主题
  useEffect(() => {
    const stored = getStoredTheme();
    if (stored) {
      setThemeState(stored);
    }
    setMounted(true);
  }, []);

  // 监听主题变化并应用
  useEffect(() => {
    if (!mounted) return;

    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    
    // 触发过渡动画
    setIsTransitioning(true);
    applyTheme(resolved, true);
    
    // 过渡结束后重置状态
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, TRANSITION_DURATION);

    return () => clearTimeout(timer);
  }, [theme, mounted, resolveTheme]);

  // 监听系统主题变化
  useEffect(() => {
    if (!mounted || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const newResolvedTheme: ResolvedTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(newResolvedTheme);
      
      // 触发过渡动画
      setIsTransitioning(true);
      applyTheme(newResolvedTheme, true);
      
      setTimeout(() => {
        setIsTransitioning(false);
      }, TRANSITION_DURATION);
    };

    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [theme, mounted]);

  // 避免服务端渲染不匹配
  if (!mounted) {
    return (
      <ThemeContext.Provider
        value={{
          theme: defaultTheme,
          resolvedTheme: 'light',
          isTransitioning: false,
          setTheme: () => {},
          toggleTheme: () => {},
        }}
      >
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        isTransitioning,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * 使用主题 Hook
 * 
 * @returns 主题上下文
 * @throws 如果在 ThemeProvider 外部使用会抛出错误
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
 *   
 *   return (
 *     <button onClick={toggleTheme}>
 *       当前: {resolvedTheme}
 *     </button>
 *   );
 * }
 * ```
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}
