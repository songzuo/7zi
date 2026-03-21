'use client';
import { InputHTMLAttributes } from 'react';
import { useTranslations } from 'next-intl';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelKey?: string;
  placeholderKey?: string;
  required?: boolean;
}

export function Input({ label, labelKey, placeholderKey, required, className = '', ...props }: InputProps) {
  const t = useTranslations('ui.input');

  const labelText = labelKey ? t(label as keyof typeof t) : label;
  const placeholderText = placeholderKey ? t(placeholderKey as keyof typeof t) : props.placeholder;

  return (
    <div className="flex flex-col gap-1">
      {labelText && (
        <label className="text-sm font-medium">
          {labelText}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        {...props}
        placeholder={placeholderText}
        className={`border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white ${className}`}
      />
    </div>
  );
}
