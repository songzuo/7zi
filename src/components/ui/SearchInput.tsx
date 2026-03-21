'use client';

/**
 * @fileoverview 搜索输入组件
 * @description 带防抖功能的搜索输入框，支持实时搜索
 */

import React, { useState, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

// ============================================================================
// Props 类型定义
// ============================================================================

export interface SearchInputProps {
  /** 搜索关键词 */
  value?: string;
  /** 值变化回调 */
  onChange?: (value: string) => void;
  /** 搜索提交回调（防抖后触发） */
  onSearch?: (value: string) => void;
  /** 占位符文本 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否显示清除按钮 */
  showClear?: boolean;
  /** 是否自动聚焦 */
  autoFocus?: boolean;
  /** 防抖延迟（毫秒） */
  debounceMs?: number;
  /** 额外的 CSS 类名 */
  className?: string;
  /** 输入框尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 加载状态 */
  loading?: boolean;
  /** 前缀图标 */
  prefixIcon?: React.ReactNode;
  /** 后缀图标 */
  suffixIcon?: React.ReactNode;
}

// ============================================================================
// 尺寸配置
// ============================================================================

const SIZE_CONFIG = {
  sm: {
    input: 'px-3 py-1.5 text-sm',
    icon: 'w-4 h-4',
  },
  md: {
    input: 'px-4 py-2 text-sm',
    icon: 'w-5 h-5',
  },
  lg: {
    input: 'px-5 py-3 text-base',
    icon: 'w-6 h-6',
  },
};

// ============================================================================
// 默认搜索图标
// ============================================================================

const DEFAULT_SEARCH_ICON = (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    className="pointer-events-none"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

// ============================================================================
// 主组件：SearchInput
// ============================================================================

export function SearchInput({
  value: controlledValue,
  onChange,
  onSearch,
  placeholder = '搜索...',
  disabled = false,
  showClear = true,
  autoFocus = false,
  debounceMs = 300,
  className = '',
  size = 'md',
  loading = false,
  prefixIcon,
  suffixIcon,
}: SearchInputProps) {
  // 内部状态（用于非受控模式）
  const [internalValue, setInternalValue] = useState(controlledValue || '');

  // 使用受控值或内部值
  const value = controlledValue !== undefined ? controlledValue : internalValue;

  // 防抖处理搜索
  const debouncedValue = useDebounce(value, debounceMs);

  // 处理值变化
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (onChange) {
      onChange(newValue);
    } else {
      setInternalValue(newValue);
    }
  }, [onChange]);

  // 清除搜索
  const handleClear = useCallback(() => {
    if (onChange) {
      onChange('');
    } else {
      setInternalValue('');
    }
  }, [onChange]);

  // 处理防抖后的搜索
  React.useEffect(() => {
    if (onSearch) {
      onSearch(debouncedValue);
    }
  }, [debouncedValue, onSearch]);

  const sizeClasses = SIZE_CONFIG[size];

  return (
    <div className={`relative flex items-center ${className}`}>
      {/* 前缀图标（搜索图标） */}
      <div className={`absolute left-3 text-zinc-400 ${sizeClasses.icon}`}>
        {prefixIcon || DEFAULT_SEARCH_ICON}
      </div>

      {/* 输入框 */}
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={`w-full ${sizeClasses.input} pl-10 pr-12 border border-zinc-300 dark:border-zinc-600 rounded-lg shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 outline-none`}
      />

      {/* 后缀区域（清除按钮 + 自定义图标 + 加载状态） */}
      <div className={`absolute right-3 flex items-center gap-1 ${sizeClasses.icon}`}>
        {/* 加载状态 */}
        {loading && (
          <svg
            className="animate-spin text-cyan-500"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}

        {/* 清除按钮 */}
        {showClear && value && !loading && (
          <button
            onClick={handleClear}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700"
            title="清除搜索"
            type="button"
          >
            <svg
              className="w-full h-full"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {/* 自定义后缀图标 */}
        {suffixIcon && !loading && <div className="text-zinc-400">{suffixIcon}</div>}
      </div>
    </div>
  );
}

// ============================================================================
// 导出默认组件
// ============================================================================

export default SearchInput;
