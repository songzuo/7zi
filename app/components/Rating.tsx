'use client';

import React, { memo, useCallback, useState } from 'react';

export interface RatingProps {
  /** 当前评分值 (0-5) */
  value: number;
  /** 评分变化回调 */
  onChange?: (value: number) => void;
  /** 最大星数 */
  maxStars?: number;
  /** 是否只读 */
  readonly?: boolean;
  /** 星星大小 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示评分文字 */
  showValue?: boolean;
  /** 自定义标签 */
  label?: string;
  /** 禁用状态 */
  disabled?: boolean;
}

// 尺寸配置
const SIZE_CONFIG = {
  sm: { star: 'w-4 h-4', text: 'text-sm', gap: 'gap-1' },
  md: { star: 'w-6 h-6', text: 'text-base', gap: 'gap-1.5' },
  lg: { star: 'w-8 h-8', text: 'text-lg', gap: 'gap-2' },
} as const;

// 评分文字映射
const RATING_LABELS: Record<number, string> = {
  0: '未评分',
  1: '很差',
  2: '较差',
  3: '一般',
  4: '很好',
  5: '完美',
};

/**
 * 评分组件
 * 
 * 特性:
 * - 支持半星评分
 * - 支持只读模式
 * - 支持多种尺寸
 * - 完整的无障碍支持
 * - 深色模式支持
 */
const RatingComponent: React.FC<RatingProps> = ({
  value,
  onChange,
  maxStars = 5,
  readonly = false,
  size = 'md',
  showValue = true,
  label,
  disabled = false,
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const displayValue = hoverValue ?? value;
  const sizeConfig = SIZE_CONFIG[size];

  // 处理鼠标移入
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, index: number) => {
      if (readonly || disabled) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const halfWidth = rect.width / 2;

      // 计算是否是半星
      if (x < halfWidth) {
        setHoverValue(index + 0.5);
      } else {
        setHoverValue(index + 1);
      }
    },
    [readonly, disabled]
  );

  // 处理点击
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, index: number) => {
      if (readonly || disabled || !onChange) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const halfWidth = rect.width / 2;

      // 计算点击位置对应的评分
      if (x < halfWidth) {
        onChange(index + 0.5);
      } else {
        onChange(index + 1);
      }
    },
    [readonly, disabled, onChange]
  );

  // 处理鼠标离开
  const handleMouseLeave = useCallback(() => {
    setHoverValue(null);
  }, []);

  // 处理键盘操作
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (readonly || disabled || !onChange) return;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          e.preventDefault();
          onChange(Math.min(value + 0.5, maxStars));
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          e.preventDefault();
          onChange(Math.max(value - 0.5, 0));
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onChange(index + 1);
          break;
      }
    },
    [readonly, disabled, onChange, value, maxStars]
  );

  // 渲染单个星星
  const renderStar = (index: number) => {
    const filled = displayValue >= index + 1;
    const half = displayValue === index + 0.5;

    return (
      <button
        key={index}
        type="button"
        className={`
          ${sizeConfig.star}
          relative
          focus:outline-none
          focus-visible:ring-2
          focus-visible:ring-blue-500
          focus-visible:ring-offset-1
          dark:focus-visible:ring-offset-gray-900
          ${readonly || disabled ? 'cursor-default' : 'cursor-pointer'}
          ${disabled ? 'opacity-50' : ''}
          transition-transform
          ${!readonly && !disabled ? 'hover:scale-110' : ''}
        `}
        onMouseMove={(e) => handleMouseMove(e, index)}
        onClick={(e) => handleClick(e, index)}
        onMouseLeave={handleMouseLeave}
        onKeyDown={(e) => handleKeyDown(e, index)}
        disabled={disabled}
        aria-label={`${index + 1} 星`}
        role="radio"
        aria-checked={filled}
      >
        {/* 背景星 (空心) */}
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-gray-300 dark:text-gray-600"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>

        {/* 前景星 (实心或半星) */}
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`
            absolute inset-0
            ${filled || half ? 'text-yellow-400' : 'text-transparent'}
          `}
          style={{
            clipPath: half ? 'inset(0 50% 0 0)' : undefined,
          }}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </button>
    );
  };

  return (
    <div
      className={`
        inline-flex items-center
        ${sizeConfig.gap}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      role="radiogroup"
      aria-label={label || '评分'}
    >
      {/* 标签 */}
      {label && (
        <span className={`${sizeConfig.text} text-gray-600 dark:text-gray-400 mr-2`}>
          {label}
        </span>
      )}

      {/* 星星组 */}
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxStars }, (_, i) => renderStar(i))}
      </div>

      {/* 评分文字 */}
      {showValue && (
        <span className={`${sizeConfig.text} text-gray-600 dark:text-gray-400 ml-2`}>
          {RATING_LABELS[Math.round(displayValue)] || displayValue.toFixed(1)}
        </span>
      )}
    </div>
  );
};

// 使用 memo 优化性能
export const Rating = memo(RatingComponent);

// 简化的只读评分显示组件
export interface RatingDisplayProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
}

export const RatingDisplay: React.FC<RatingDisplayProps> = ({
  value,
  size = 'sm',
  showValue = true,
}) => {
  return (
    <Rating
      value={value}
      readonly
      size={size}
      showValue={showValue}
    />
  );
};
