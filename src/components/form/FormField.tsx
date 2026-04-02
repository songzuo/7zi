/**
 * 表单字段组件
 * 带实时验证反馈
 */
'use client'

import {
  forwardRef,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from 'react'
import { useFieldValidation, UseFieldValidationOptions } from './useFieldValidation'

export interface FormFieldProps {
  label?: string
  error?: string
  touched?: boolean
  required?: boolean
  hint?: string
  className?: string
  children: ReactNode
}

/**
 * 表单字段包装器
 */
export function FormField({
  label,
  error,
  touched,
  required,
  hint,
  className = '',
  children,
}: FormFieldProps) {
  const showError = touched && error

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      {children}
      {showError && (
        <p className="flex items-center gap-1 text-sm text-red-500">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {error}
        </p>
      )}
      {hint && !showError && <p className="text-sm text-zinc-500 dark:text-zinc-400">{hint}</p>}
    </div>
  )
}

/**
 * 输入框组件（带实时验证）
 */
export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'defaultValue'>, UseFieldValidationOptions {
  error?: string
  touched?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      validate,
      validateOn = 'blur',
      validateOnChange,
      validateOnBlur,
      error: externalError,
      touched: externalTouched,
      className = '',
      onChange,
      onBlur,
      ...props
    },
    ref
  ) => {
    const { value, error, handleChange, handleBlur, isTouched } = useFieldValidation({
      validate,
      validateOn,
      validateOnChange,
      validateOnBlur,
      defaultValue: String(props.defaultValue || ''),
    })

    const showError = (externalTouched ?? isTouched) && (externalError ?? error)

    // 合并外部和内部事件处理器
    const handleChangeWrapper = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleChange(e)
      onChange?.(e)
    }

    const handleBlurWrapper = (e: React.FocusEvent<HTMLInputElement>) => {
      handleBlur(e)
      onBlur?.(e)
    }

    return (
      <input
        ref={ref}
        value={value}
        onChange={handleChangeWrapper}
        onBlur={handleBlurWrapper}
        className={`w-full rounded-xl border bg-zinc-50 px-4 py-3 dark:bg-zinc-800 ${
          showError
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
            : 'border-zinc-200 focus:border-cyan-500 focus:ring-cyan-500/20 dark:border-zinc-700'
        } text-zinc-900 transition-all focus:ring-4 focus:outline-none dark:text-white ${className}`}
        aria-invalid={showError ? 'true' : 'false'}
        aria-describedby={showError ? `${props.name}-error` : undefined}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

/**
 * 文本域组件（带实时验证）
 */
export interface TextareaProps
  extends
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'defaultValue'>,
    UseFieldValidationOptions {
  error?: string
  touched?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      validate,
      validateOn = 'blur',
      error: externalError,
      touched: externalTouched,
      className = '',
      onChange,
      onBlur,
      ...props
    },
    ref
  ) => {
    const { value, error, handleChange, handleBlur, isTouched } = useFieldValidation({
      validate,
      validateOn,
      defaultValue: String(props.defaultValue || ''),
    })

    const showError = (externalTouched ?? isTouched) && (externalError ?? error)

    const handleChangeWrapper = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      handleChange(e as unknown as React.ChangeEvent<HTMLInputElement>)
      onChange?.(e)
    }

    const handleBlurWrapper = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      handleBlur(e as unknown as React.FocusEvent<HTMLInputElement>)
      onBlur?.(e)
    }

    return (
      <textarea
        ref={ref}
        value={value}
        onChange={handleChangeWrapper}
        onBlur={handleBlurWrapper}
        className={`w-full rounded-xl border bg-zinc-50 px-4 py-3 dark:bg-zinc-800 ${
          showError
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
            : 'border-zinc-200 focus:border-cyan-500 focus:ring-cyan-500/20 dark:border-zinc-700'
        } resize-none text-zinc-900 transition-all focus:ring-4 focus:outline-none dark:text-white ${className}`}
        aria-invalid={showError ? 'true' : 'false'}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'

/**
 * 下拉选择组件
 */
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: Array<{ value: string; label: string }>
  error?: string
  touched?: boolean
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, error, touched, placeholder, className = '', ...props }, ref) => {
    const showError = touched && error

    return (
      <select
        ref={ref}
        className={`w-full rounded-xl border bg-zinc-50 px-4 py-3 dark:bg-zinc-800 ${
          showError
            ? 'border-red-500 focus:border-red-500'
            : 'border-zinc-200 focus:border-cyan-500 dark:border-zinc-700'
        } text-zinc-900 transition-colors focus:outline-none dark:text-white ${className}`}
        aria-invalid={showError ? 'true' : 'false'}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }
)

Select.displayName = 'Select'

/**
 * 复选框组件
 */
export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <label className={`flex cursor-pointer items-start gap-3 ${className}`}>
        <input
          ref={ref}
          type="checkbox"
          className="mt-0.5 h-5 w-5 rounded border-zinc-300 text-cyan-500 focus:ring-4 focus:ring-cyan-500/20 dark:border-zinc-600"
          {...props}
        />
        <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
        {error && <span className="text-sm text-red-500">{error}</span>}
      </label>
    )
  }
)

Checkbox.displayName = 'Checkbox'

const FormComponents = {
  FormField,
  Input,
  Textarea,
  Select,
  Checkbox,
}

export default FormComponents
