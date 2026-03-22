'use client';

/**
 * @fileoverview 过滤下拉组件
 * @description 通用的过滤下拉框，支持单选、多选、自定义选项
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';

// ============================================================================
// Props 类型定义
// ============================================================================

export interface FilterOption {
  /** 选项值 */
  value: unknown;
  /** 选项标签 */
  label: string;
  /** 选项图标（URL 或 emoji） */
  icon?: string;
  /** 选项颜色 */
  color?: string;
  /** 选项描述 */
  description?: string;
  /** 选项数量 */
  count?: number;
}

export interface FilterDropdownProps {
  /** 过滤器唯一标识 */
  id: string;
  /** 过滤器标签 */
  label: string;
  /** 过滤器选项列表 */
  options: FilterOption[];
  /** 选中的值 */
  selectedValues?: unknown[];
  /** 值变化回调 */
  onChange?: (values: unknown[]) => void;
  /** 是否多选 */
  multiple?: boolean;
  /** 是否启用 */
  enabled?: boolean;
  /** 占位符 */
  placeholder?: string;
  /** 是否显示数量徽章 */
  showCount?: boolean;
  /** 自定义过滤器函数 */
  customFilter?: (item: unknown, selectedValues: unknown[]) => boolean;
  /** 主题颜色 */
  theme?: 'cyan' | 'purple' | 'green' | 'blue' | 'orange';
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 额外的 CSS 类名 */
  className?: string;
}

// ============================================================================
// 主题配置
// ============================================================================

const THEME_CONFIG = {
  cyan: {
    active: 'bg-cyan-50 dark:bg-cyan-900/30 border-cyan-500 text-cyan-700 dark:text-cyan-300',
    hover: 'hover:border-cyan-500',
    badge: 'bg-cyan-600',
    selected: 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
    checkboxChecked: 'bg-cyan-600 border-cyan-600',
  },
  purple: {
    active: 'bg-purple-50 dark:bg-purple-900/30 border-purple-500 text-purple-700 dark:text-purple-300',
    hover: 'hover:border-purple-500',
    badge: 'bg-purple-600',
    selected: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    checkboxChecked: 'bg-purple-600 border-purple-600',
  },
  green: {
    active: 'bg-green-50 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300',
    hover: 'hover:border-green-500',
    badge: 'bg-green-600',
    selected: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    checkboxChecked: 'bg-green-600 border-green-600',
  },
  blue: {
    active: 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300',
    hover: 'hover:border-blue-500',
    badge: 'bg-blue-600',
    selected: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    checkboxChecked: 'bg-blue-600 border-blue-600',
  },
  orange: {
    active: 'bg-orange-50 dark:bg-orange-900/30 border-orange-500 text-orange-700 dark:text-orange-300',
    hover: 'hover:border-orange-500',
    badge: 'bg-orange-600',
    selected: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    checkboxChecked: 'bg-orange-600 border-orange-600',
  },
};

// ============================================================================
// 尺寸配置
// ============================================================================

const SIZE_CONFIG = {
  sm: {
    button: 'px-2.5 py-1 text-xs',
    icon: 'w-3.5 h-3.5',
  },
  md: {
    button: 'px-3 py-1.5 text-sm',
    icon: 'w-4 h-4',
  },
  lg: {
    button: 'px-4 py-2 text-base',
    icon: 'w-5 h-5',
  },
};

// ============================================================================
// 主组件：FilterDropdown
// ============================================================================

export function FilterDropdown({
  id,
  label,
  options = [],
  selectedValues: controlledValues,
  onChange,
  multiple = false,
  enabled = true,
  placeholder = '选择...',
  showCount = true,
  theme = 'cyan',
  size = 'md',
  className = '',
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValues, setInternalValues] = useState<unknown[]>(controlledValues || []);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 使用受控值或内部值
  const selectedValues = controlledValues !== undefined ? controlledValues : internalValues;

  const themeClasses = THEME_CONFIG[theme];
  const sizeClasses = SIZE_CONFIG[size];

  // 处理点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // 处理值选择
  const handleValueChange = useCallback((value: unknown) => {
    let newValues: unknown[];

    if (multiple) {
      if (selectedValues.includes(value)) {
        newValues = selectedValues.filter(v => v !== value);
      } else {
        newValues = [...selectedValues, value];
      }
    } else {
      newValues = [value];
      setIsOpen(false);
    }

    if (onChange) {
      onChange(newValues);
    } else {
      setInternalValues(newValues);
    }
  }, [multiple, selectedValues, onChange]);

  // 清除所有选择
  const handleClear = useCallback(() => {
    const newValues: unknown[] = [];
    if (onChange) {
      onChange(newValues);
    } else {
      setInternalValues(newValues);
    }
    setIsOpen(false);
  }, [onChange]);

  // 切换下拉框
  const handleToggle = useCallback(() => {
    if (!enabled) return;
    setIsOpen(!isOpen);
  }, [enabled, isOpen]);

  const hasSelection = selectedValues.length > 0;

  return (
    <div className={`relative ${className}`}>
      {/* 触发按钮 */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        disabled={!enabled}
        className={`inline-flex items-center gap-2 border rounded-lg font-medium transition-all duration-200 ${
          hasSelection
            ? `${themeClasses.active}`
            : `bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 ${themeClasses.hover}`
        } ${sizeClasses.button} ${!enabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label}
      >
        {/* 标签 */}
        <span>{label}</span>

        {/* 数量徽章 */}
        {showCount && hasSelection && (
          <span
            className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 ${themeClasses.badge} text-white text-xs rounded-full`}
          >
            {selectedValues.length}
          </span>
        )}

        {/* 下拉箭头 */}
        <svg
          className={`transition-transform ${sizeClasses.icon} ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-2 w-64 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl overflow-hidden"
          role="listbox"
          aria-label={`${label} 选项`}
        >
          {/* 头部 */}
          <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-900 dark:text-white">
              {label}
            </span>
            {hasSelection && (
              <button
                onClick={handleClear}
                className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              >
                清除
              </button>
            )}
          </div>

          {/* 选项列表 */}
          <div className="max-h-64 overflow-y-auto">
            {options.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                暂无选项
              </div>
            ) : (
              options.map((option, index) => {
                const isSelected = selectedValues.includes(option.value);

                return (
                  <button
                    key={String(option.value) || index}
                    onClick={() => handleValueChange(option.value)}
                    className={`w-full px-4 py-2 flex items-center gap-3 transition-colors ${
                      isSelected
                        ? `${themeClasses.selected}`
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50'
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    {/* 图标/头像 */}
                    {option.icon && (
                      <div className="flex-shrink-0">
                        {option.icon.startsWith('http') ? (
                          <Image
                            src={option.icon}
                            alt={option.label}
                            width={20}
                            height={20}
                            className="rounded-full"
                            unoptimized
                          />
                        ) : (
                          <span className="text-base">{option.icon}</span>
                        )}
                      </div>
                    )}

                    {/* 标签和描述 */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-sm truncate">{option.label}</div>
                      {option.description && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          {option.description}
                        </div>
                      )}
                    </div>

                    {/* 数量 */}
                    {option.count !== undefined && (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500 flex-shrink-0">
                        {option.count}
                      </span>
                    )}

                    {/* 颜色指示器 */}
                    {option.color && !option.icon && (
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: option.color }}
                      />
                    )}

                    {/* 多选复选框 */}
                    {multiple && (
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? themeClasses.checkboxChecked
                            : 'border-zinc-300 dark:border-zinc-600'
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 导出默认组件
// ============================================================================

export default FilterDropdown;
