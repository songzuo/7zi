'use client'
import { InputHTMLAttributes } from 'react'

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Checkbox({ label, className = '', ...props }: CheckboxProps) {
  return (
    <label className={`flex items-center gap-2 ${className}`}>
      <input type="checkbox" {...props} className="h-4 w-4" />
      {label && <span>{label}</span>}
    </label>
  )
}
