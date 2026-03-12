/**
 * Reusable form textarea component
 */
'use client';

import { TextareaHTMLAttributes, forwardRef } from 'react';

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  required?: boolean;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, required, className = '', ...props }, ref) => {
    return (
      <div>
        <label
          htmlFor={props.id}
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
        >
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
        <textarea
          ref={ref}
          className={`w-full px-6 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border ${
            error
              ? 'border-red-500 focus:border-red-500'
              : 'border-zinc-200 dark:border-zinc-700 focus:border-cyan-500'
          } text-zinc-900 dark:text-white focus:outline-none transition-colors resize-none ${className}`}
          {...props}
        />
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

FormTextarea.displayName = 'FormTextarea';