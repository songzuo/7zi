/**
 * Date Range Picker Component
 * 日期范围选择器
 */

'use client'

import React, { useState, useMemo } from 'react'
import { Calendar, ChevronDown, Check } from 'lucide-react'
import { type TimeRange, type DateRange } from '@/lib/types/analytics'

// ============================================================================
// Type Definitions
// ============================================================================

export interface DateRangePickerProps {
  selectedRange: TimeRange
  customRange?: DateRange
  onChange: (range: TimeRange, customRange?: DateRange) => void
  locale?: string
  className?: string
}

interface TimeRangeOption {
  value: TimeRange
  label: { en: string; zh: string }
  days?: number
}

// ============================================================================
// Constants
// ============================================================================

const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { value: 'today', label: { en: 'Today', zh: '今天' }, days: 1 },
  { value: 'week', label: { en: 'Last 7 Days', zh: '最近7天' }, days: 7 },
  { value: 'month', label: { en: 'Last 30 Days', zh: '最近30天' }, days: 30 },
  { value: 'quarter', label: { en: 'Last 90 Days', zh: '最近90天' }, days: 90 },
  { value: 'year', label: { en: 'Last 365 Days', zh: '最近365天' }, days: 365 },
  { value: 'custom', label: { en: 'Custom', zh: '自定义' } },
]

// ============================================================================
// Main Component
// ============================================================================

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  selectedRange,
  customRange,
  onChange,
  locale = 'en',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [tempRange, setTempRange] = useState<TimeRange>(selectedRange)

  const [tempCustomRange, setTempCustomRange] = useState<DateRange>(
    customRange || { start: '', end: '' }
  )

  const t = locale === 'zh' ? 'zh' : 'en'

  const handleSelect = (range: TimeRange) => {
    setTempRange(range)
    if (range !== 'custom') {
      onChange(range)
      setIsOpen(false)
    }
  }

  const handleCustomRangeApply = () => {
    if (tempCustomRange.start && tempCustomRange.end) {
      onChange('custom', tempCustomRange)
      setIsOpen(false)
    }
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getSelectedLabel = (): string => {
    if (selectedRange === 'custom' && customRange) {
      return `${formatDate(customRange.start)} - ${formatDate(customRange.end)}`
    }
    const option = TIME_RANGE_OPTIONS.find(opt => opt.value === selectedRange)
    return option?.label[t] || selectedRange
  }

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-w-[180px] items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">
            {getSelectedLabel()}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-zinc-500 transition-transform dark:text-zinc-400 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 w-72 rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
          <div className="p-2">
            {/* Quick Selection */}
            <div className="space-y-1">
              {TIME_RANGE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  <span className="text-zinc-700 dark:text-zinc-300">{option.label[t]}</span>
                  {selectedRange === option.value && (
                    <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  )}
                </button>
              ))}
            </div>

            {/* Custom Range */}
            {tempRange === 'custom' && (
              <div className="mt-3 space-y-3 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {locale === 'zh' ? '开始日期' : 'Start Date'}
                  </label>
                  <input
                    type="date"
                    value={tempCustomRange.start}
                    onChange={e =>
                      setTempCustomRange({ ...tempCustomRange, start: e.target.value })
                    }
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {locale === 'zh' ? '结束日期' : 'End Date'}
                  </label>
                  <input
                    type="date"
                    value={tempCustomRange.end}
                    onChange={e => setTempCustomRange({ ...tempCustomRange, end: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                  />
                </div>
                <button
                  onClick={handleCustomRangeApply}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  {locale === 'zh' ? '应用' : 'Apply'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default DateRangePicker
