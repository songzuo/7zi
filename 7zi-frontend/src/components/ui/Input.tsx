'use memo';

/**
 * Input 组件 - 输入框组件
 * 支持文本、密码、邮箱等多种类型，包含增强的验证反馈
 * 
 * @version 1.1.0
 * @date 2026-03-29
 */

import React, { forwardRef, useState, useCallback, useEffect } from 'react';
import clsx from 'clsx';

// ============================================
// 类型定义
// ============================================

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** 标签 */
  label?: string;
  /** 错误信息 */
  error?: string;
  /** 成功信息 */
  success?: string;
  /** 警告信息 */
  warning?: string;
  /** 帮助文本 */
  helperText?: string;
  /** 前缀图标 */
  prefix?: React.ReactNode;
  /** 后缀图标 */
  suffix?: React.ReactNode;
  /** 输入框大小 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否全宽 */
  fullWidth?: boolean;
  /** 验证状态 */
  validationState?: 'none' | 'valid' | 'invalid' | 'warning';
  /** 是否显示验证图标 */
  showValidationIcon?: boolean;
  /** 动画效果 */
  animated?: boolean;
}

// ============================================
// 验证状态图标
// ============================================

interface ValidationIconProps {
  state: 'valid' | 'invalid' | 'warning';
}

const ValidationIcon: React.FC<ValidationIconProps> = ({ state }) => {
  if (state === 'valid') {
    return (
      <svg
        className="h-5 w-5 text-green-500 animate-in fade-in zoom-in duration-200"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
    );
  }

  if (state === 'invalid') {
    return (
      <svg
        className="h-5 w-5 text-red-500 animate-in fade-in zoom-in duration-200"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }

  if (state === 'warning') {
    return (
      <svg
        className="h-5 w-5 text-yellow-500 animate-in fade-in zoom-in duration-200"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    );
  }

  return null;
};

// ============================================
// 密码可见性切换按钮
// ============================================

interface PasswordToggleProps {
  visible: boolean;
  onToggle: () => void;
}

const PasswordToggle: React.FC<PasswordToggleProps> = ({ visible, onToggle }) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none transition-colors duration-200"
      tabIndex={-1}
    >
      {visible ? (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
          />
        </svg>
      ) : (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      )}
    </button>
  );
};

// ============================================
// Input 组件
// ============================================

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      success,
      warning,
      helperText,
      prefix,
      suffix,
      size = 'md',
      fullWidth = false,
      type = 'text',
      validationState = 'none',
      showValidationIcon = true,
      animated = true,
      className,
      id,
      value,
      defaultValue,
      onChange,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [internalValue, setInternalValue] = useState(defaultValue ?? value ?? '');
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    // 确定验证状态
    const getValidationState = useCallback((): 'valid' | 'invalid' | 'warning' | 'none' => {
      if (validationState !== 'none') return validationState;
      if (error) return 'invalid';
      if (success) return 'valid';
      if (warning) return 'warning';
      return 'none';
    }, [validationState, error, success, warning]);

    const currentValidationState = getValidationState();

    // 基础样式
    const baseStyles = clsx(
      'block w-full rounded-lg border-2',
      'transition-all duration-200 ease-out',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60',
      animated && 'animate-in fade-in duration-150'
    );

    // 尺寸样式
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-5 py-3 text-lg',
    };

    // 验证状态样式
    const validationStyles = {
      none: clsx(
        'border-gray-300 dark:border-gray-600',
        'hover:border-gray-400 dark:hover:border-gray-500',
        'focus:border-blue-500 focus:ring-blue-500',
        'dark:bg-gray-800 dark:text-gray-100'
      ),
      valid: clsx(
        'border-green-300 dark:border-green-600',
        'hover:border-green-400 dark:hover:border-green-500',
        'focus:border-green-500 focus:ring-green-500',
        'bg-green-50 dark:bg-green-900/10',
        'dark:text-gray-100'
      ),
      invalid: clsx(
        'border-red-300 dark:border-red-600',
        'hover:border-red-400 dark:hover:border-red-500',
        'focus:border-red-500 focus:ring-red-500',
        'bg-red-50 dark:bg-red-900/10',
        'dark:text-gray-100',
        animated && 'animate-in shake-in duration-300'
      ),
      warning: clsx(
        'border-yellow-300 dark:border-yellow-600',
        'hover:border-yellow-400 dark:hover:border-yellow-500',
        'focus:border-yellow-500 focus:ring-yellow-500',
        'bg-yellow-50 dark:bg-yellow-900/10',
        'dark:text-gray-100'
      ),
    };

    const inputStyles = clsx(
      baseStyles,
      sizeStyles[size],
      validationStyles[currentValidationState],
      prefix && 'pl-10',
      (suffix || isPassword || (showValidationIcon && currentValidationState !== 'none')) && 'pr-10'
    );

    const togglePassword = useCallback(() => {
      setShowPassword(prev => !prev);
    }, []);

    // 处理值变化
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalValue(e.target.value);
      onChange?.(e);
    }, [onChange]);

    // 获取反馈消息
    const getFeedbackMessage = () => {
      if (error) return { message: error, type: 'error' };
      if (success) return { message: success, type: 'success' };
      if (warning) return { message: warning, type: 'warning' };
      if (helperText) return { message: helperText, type: 'helper' };
      return null;
    };

    const feedback = getFeedbackMessage();

    return (
      <div className={clsx(fullWidth && 'w-full', className)}>
        {/* 标签 */}
        {label && (
          <label
            htmlFor={id}
            className={clsx(
              'block text-sm font-medium mb-1.5 transition-colors duration-200',
              isFocused ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
            )}
          >
            {label}
          </label>
        )}

        {/* 输入框容器 */}
        <div className="relative">
          {/* 前缀图标 */}
          {prefix && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
              {prefix}
            </div>
          )}

          {/* 输入框 */}
          <input
            id={id}
            ref={ref}
            type={inputType}
            value={value ?? internalValue}
            onChange={handleChange}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            className={inputStyles}
            aria-invalid={currentValidationState === 'invalid'}
            aria-describedby={
              feedback ? `${id}-feedback` : undefined
            }
            {...props}
          />

          {/* 后缀区域 */}
          <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-3">
            {/* 验证图标 */}
            {showValidationIcon && currentValidationState !== 'none' && (
              <ValidationIcon state={currentValidationState} />
            )}

            {/* 密码切换按钮 */}
            {isPassword && (
              <PasswordToggle visible={showPassword} onToggle={togglePassword} />
            )}

            {/* 自定义后缀图标 */}
            {suffix && !isPassword && currentValidationState === 'none' && (
              <div className="text-gray-400 dark:text-gray-500 pointer-events-none">
                {suffix}
              </div>
            )}
          </div>
        </div>

        {/* 反馈消息 */}
        {feedback && (
          <div
            id={`${id}-feedback`}
            className={clsx(
              'mt-1.5 text-sm flex items-center gap-1.5',
              animated && 'animate-in slide-in-from-top-1 duration-200',
              {
                'text-red-600 dark:text-red-400': feedback.type === 'error',
                'text-green-600 dark:text-green-400': feedback.type === 'success',
                'text-yellow-600 dark:text-yellow-400': feedback.type === 'warning',
                'text-gray-500 dark:text-gray-400': feedback.type === 'helper',
              }
            )}
            role={feedback.type === 'error' ? 'alert' : undefined}
          >
            {/* 状态图标 */}
            {feedback.type === 'error' && (
              <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            {feedback.type === 'success' && (
              <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {feedback.type === 'warning' && (
              <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            {feedback.message}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ============================================
// Textarea 组件
// ============================================

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** 标签 */
  label?: string;
  /** 错误信息 */
  error?: string;
  /** 帮助文本 */
  helperText?: string;
  /** 字符计数 */
  showCount?: boolean;
  /** 最大字符数 */
  maxLength?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      showCount = false,
      maxLength,
      className,
      id,
      value,
      defaultValue,
      onChange,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(defaultValue ?? value ?? '');

    const currentLength = (value ?? internalValue).toString().length;
    const isOverLimit = maxLength !== undefined && currentLength > maxLength;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInternalValue(e.target.value);
      onChange?.(e);
    };

    return (
      <div className={className}>
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            {label}
          </label>
        )}

        <textarea
          id={id}
          ref={ref}
          value={value ?? internalValue}
          onChange={handleChange}
          maxLength={maxLength}
          className={clsx(
            'block w-full rounded-lg border-2',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            error || isOverLimit
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            'px-4 py-3 text-base resize-y min-h-[100px]',
            'dark:bg-gray-800 dark:text-gray-100'
          )}
          aria-invalid={!!error || isOverLimit}
          {...props}
        />

        <div className="flex justify-between items-center mt-1.5">
          <div>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            {helperText && !error && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
            )}
          </div>

          {showCount && (
            <span className={clsx(
              'text-sm',
              isOverLimit ? 'text-red-600' : 'text-gray-400'
            )}>
              {currentLength}{maxLength !== undefined && ` / ${maxLength}`}
            </span>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// ============================================
// 导出
// ============================================

export default Input;
