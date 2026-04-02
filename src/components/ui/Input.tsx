'use client'
import { InputHTMLAttributes } from 'react'
import { useTranslations } from 'next-intl'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  labelKey?: string
  placeholderKey?: string
  required?: boolean
}

export function Input({
  label,
  labelKey,
  placeholderKey,
  required,
  className = '',
  ...props
}: InputProps) {
  const t = useTranslations('ui.input')

  const labelText = labelKey ? t(label as keyof typeof t) : label
  const placeholderText = placeholderKey ? t(placeholderKey as keyof typeof t) : props.placeholder

  return (
    <div className="flex flex-col gap-1">
      {labelText && (
        <label className="text-sm font-medium">
          {labelText}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <input
        {...props}
        placeholder={placeholderText}
        className={`rounded-lg border border-zinc-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white ${className}`}
      />
    </div>
  )
}
