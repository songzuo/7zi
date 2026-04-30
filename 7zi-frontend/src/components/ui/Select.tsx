'use client'
import React, { createContext, useContext, useState, ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Select Context
interface SelectContextValue {
  value: string
  onValueChange: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
}

const SelectContext = createContext<SelectContextValue | undefined>(undefined)

// Main Select Component
export interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  defaultValue?: string
  children: ReactNode
  className?: string
}

export function Select({ value, onValueChange, defaultValue = '', children, className }: SelectProps): React.ReactElement {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  
  const isControlled = value !== undefined
  const currentValue = isControlled ? value : internalValue
  
  const handleValueChange = (newValue: string) => {
    if (!isControlled) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
    setOpen(false)
  }

  return (
    <SelectContext.Provider value={{ value: currentValue, onValueChange: handleValueChange, open, setOpen }}>
      <div className={cn('relative', className)}>
        {children}
      </div>
    </SelectContext.Provider>
  )
}

// SelectTrigger Component
export interface SelectTriggerProps {
  children: ReactNode
  className?: string
}

export function SelectTrigger({ children, className }: SelectTriggerProps): React.ReactElement {
  const context = useContext(SelectContext)
  if (!context) throw new Error('SelectTrigger must be used within Select')

  return (
    <button
      type="button"
      onClick={() => context.setOpen(!context.open)}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800',
        className
      )}
    >
      {children}
    </button>
  )
}

// SelectValue Component
export interface SelectValueProps {
  placeholder?: string
}

export function SelectValue({ placeholder }: SelectValueProps): React.ReactElement {
  const context = useContext(SelectContext)
  if (!context) throw new Error('SelectValue must be used within Select')

  return (
    <span className={cn(!context.value && 'text-muted-foreground')}>
      {context.value || placeholder || 'Select...'}
    </span>
  )
}

// SelectContent Component
export interface SelectContentProps {
  children: ReactNode
  className?: string
}

export function SelectContent({ children, className }: SelectContentProps): React.ReactElement | null {
  const context = useContext(SelectContext)
  if (!context) throw new Error('SelectContent must be used within Select')

  if (!context.open) return null

  return (
    <div
      className={cn(
        'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800',
        className
      )}
    >
      {children}
    </div>
  )
}

// SelectItem Component
export interface SelectItemProps {
  value: string
  children: ReactNode
  className?: string
}

export function SelectItem({ value, children, className }: SelectItemProps): React.ReactElement {
  const context = useContext(SelectContext)
  if (!context) throw new Error('SelectItem must be used within Select')

  const isSelected = context.value === value

  return (
    <div
      onClick={() => context.onValueChange(value)}
      className={cn(
        'relative flex cursor-pointer select-none items-center py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-gray-100 dark:hover:bg-gray-700',
        isSelected && 'bg-gray-100 dark:bg-gray-700',
        className
      )}
    >
      {isSelected && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          ✓
        </span>
      )}
      {children}
    </div>
  )
}