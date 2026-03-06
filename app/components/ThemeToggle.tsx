'use client';

import React, { useState, useRef, useCallback, memo, useMemo } from 'react';
import { useTheme, Theme } from './ThemeProvider';

// ============================================================================
// 类型定义
// ============================================================================

interface ThemeOption {
  value: Theme;
  label: string;
  icon: string;
  description: string;
}

interface ThemeToggleProps {
  /** 是否显示下拉菜单（默认只显示图标按钮） */
  showDropdown?: boolean;
  /** 是否启用涟漪动画 */
  enableRipple?: boolean;
  /** 按钮尺寸 */
  size?: 'sm' | 'md' | 'lg';
}

// ============================================================================
// 常量配置 - 移到模块级别避免每次渲染重新创建
// ============================================================================

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'light', label: '浅色', icon: '☀️', description: '浅色主题' },
  { value: 'dark', label: '深色', icon: '🌙', description: '深色主题' },
  { value: 'system', label: '系统', icon: '💻', description: '跟随系统' },
];

const SIZE_CLASSES = {
  sm: 'p-1.5 text-base',
  md: 'p-2 text-lg',
  lg: 'p-3 text-xl',
} as const;

// ============================================================================
// 主题选项按钮组件
// ============================================================================

interface ThemeOptionButtonProps {
  option: ThemeOption;
  isSelected: boolean;
  onSelect: (theme: Theme) => void;
}

const ThemeOptionButton = memo(function ThemeOptionButton({
  option,
  isSelected,
  onSelect,
}: ThemeOptionButtonProps) {
  const handleClick = useCallback(() => {
    onSelect(option.value);
  }, [option.value, onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(option.value);
    }
  }, [option.value, onSelect]);

  return (
    <button
      data-value={option.value}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        w-full px-4 py-3 flex items-center gap-3 text-left transition-colors
        focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700
        ${isSelected
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
        }
      `}
      role="menuitem"
      tabIndex={0}
      aria-selected={isSelected}
    >
      <span className="text-xl" aria-hidden="true">{option.icon}</span>
      <div className="flex-1">
        <div className="font-medium">{option.label}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{option.description}</div>
      </div>
      {isSelected && (
        <span className="text-blue-600 dark:text-blue-400" aria-hidden="true">✓</span>
      )}
    </button>
  );
});

// ============================================================================
// 主题切换组件 - 性能优化版本
// ============================================================================

/**
 * 高级主题切换组件
 * 
 * 功能：
 * - 三种主题模式切换（浅色/深色/跟随系统）
 * - 涟漪动画效果
 * - 下拉菜单选择
 * - 键盘导航支持
 * 
 * 性能优化措施:
 * 1. 使用 React.memo 防止不必要的重渲染
 * 2. 使用 useCallback 缓存事件处理
 * 3. 使用 useMemo 缓存计算结果
 * 4. 子组件提取并使用 memo
 */
function ThemeToggleComponent({
  showDropdown = false,
  enableRipple = true,
  size = 'md',
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 涟漪动画效果
  const createRipple = useCallback((event: React.MouseEvent) => {
    if (!enableRipple || typeof document === 'undefined') return;

    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // 创建涟漪元素
    const ripple = document.createElement('span');
    ripple.className = 'theme-switch-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.width = '20px';
    ripple.style.height = '20px';
    ripple.style.backgroundColor = resolvedTheme === 'light' ? '#1f2937' : '#f3f4f6';

    document.body.appendChild(ripple);

    // 清理涟漪
    setTimeout(() => {
      ripple.remove();
    }, 500);
  }, [enableRipple, resolvedTheme]);

  // 切换主题（简单模式）
  const handleToggle = useCallback((e: React.MouseEvent) => {
    createRipple(e);
    setIsAnimating(true);
    toggleTheme();
    
    // 动画完成后重置
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  }, [createRipple, toggleTheme]);

  // 选择主题（下拉菜单模式）
  const handleSelect = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    setIsOpen(false);
    buttonRef.current?.focus();
  }, [setTheme]);

  // 切换下拉菜单
  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // 键盘导航
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleTheme();
      }
      return;
    }

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen) {
          // 选择当前聚焦的选项
          const focused = document.activeElement as HTMLElement;
          const value = focused?.dataset.value as Theme;
          if (value) handleSelect(value);
        } else {
          setIsOpen(true);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          const items = dropdownRef.current?.querySelectorAll('[role="menuitem"]');
          const currentIndex = Array.from(items || []).findIndex(
            item => item === document.activeElement
          );
          const nextIndex = currentIndex < (items?.length || 0) - 1 ? currentIndex + 1 : 0;
          (items?.[nextIndex] as HTMLElement)?.focus();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          const items = dropdownRef.current?.querySelectorAll('[role="menuitem"]');
          const currentIndex = Array.from(items || []).findIndex(
            item => item === document.activeElement
          );
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : (items?.length || 0) - 1;
          (items?.[prevIndex] as HTMLElement)?.focus();
        }
        break;
    }
  }, [isOpen, showDropdown, toggleTheme, handleSelect]);

  // 点击外部关闭
  const handleClickOutside = useCallback((e: React.MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  // 缓存当前主题选项
  const currentThemeOption = useMemo(
    () => THEME_OPTIONS.find(o => o.value === theme),
    [theme]
  );

  const sizeClass = SIZE_CLASSES[size];

  // 简单按钮模式
  if (!showDropdown) {
    return (
      <button
        ref={buttonRef}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={`
          ${sizeClass}
          text-gray-500 dark:text-gray-400 
          hover:text-gray-700 dark:hover:text-gray-200 
          hover:bg-gray-100 dark:hover:bg-gray-800 
          rounded-lg transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
          active:scale-95
          ${isAnimating ? 'theme-toggle-animating' : ''}
        `}
        aria-label={resolvedTheme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
        title={resolvedTheme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
        type="button"
      >
        <span 
          className={`
            block transition-transform duration-300 
            hover:rotate-12
            ${isAnimating ? 'theme-icon-spin' : ''}
          `} 
          aria-hidden="true"
        >
          {resolvedTheme === 'light' ? '🌙' : '☀️'}
        </span>
      </button>
    );
  }

  // 下拉菜单模式
  return (
    <div className="relative" ref={dropdownRef} onClick={handleClickOutside}>
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        className={`
          ${sizeClass}
          flex items-center gap-2
          text-gray-700 dark:text-gray-300 
          bg-white dark:bg-gray-800
          hover:bg-gray-50 dark:hover:bg-gray-700
          border border-gray-300 dark:border-gray-600
          rounded-lg transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
        `}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="选择主题"
        type="button"
      >
        <span className="transition-transform duration-300" aria-hidden="true">
          {currentThemeOption?.icon || '🎨'}
        </span>
        <span className="text-sm font-medium hidden sm:inline">
          {currentThemeOption?.label || '主题'}
        </span>
        <span className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true">
          ▼
        </span>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50 animate-fadeIn"
          role="menu"
          aria-orientation="vertical"
          aria-label="主题选项"
        >
          {THEME_OPTIONS.map((option) => (
            <ThemeOptionButton
              key={option.value}
              option={option}
              isSelected={theme === option.value}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

// 使用 memo 包装导出
export const ThemeToggle = memo(ThemeToggleComponent);

export default ThemeToggle;