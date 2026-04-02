/**
 * Room Type Selector Component
 *
 * Select room type for creating new rooms
 * Supports: task/project/chat/document/voice/video types
 *
 * Features:
 * - Visual type selection with icons
 * - Type descriptions
 * - Dark/light mode support
 * - Responsive design
 */

'use client'

import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'

/**
 * Room types
 */
export type RoomType = 'task' | 'project' | 'chat' | 'document' | 'voice' | 'video'

/**
 * Room type configuration
 */
const roomTypes: Record<
  RoomType,
  {
    icon: string
    label: string
    description: string
    colorClass: string
    bgClass: string
  }
> = {
  task: {
    icon: '✅',
    label: 'Task',
    description: 'roomTypes.task',
    colorClass: 'text-green-600 dark:text-green-400',
    bgClass: 'bg-green-100 dark:bg-green-900/20',
  },
  project: {
    icon: '📁',
    label: 'Project',
    description: 'roomTypes.project',
    colorClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-100 dark:bg-blue-900/20',
  },
  chat: {
    icon: '💬',
    label: 'Chat',
    description: 'roomTypes.chat',
    colorClass: 'text-purple-600 dark:text-purple-400',
    bgClass: 'bg-purple-100 dark:bg-purple-900/20',
  },
  document: {
    icon: '📄',
    label: 'Document',
    description: 'roomTypes.document',
    colorClass: 'text-yellow-600 dark:text-yellow-400',
    bgClass: 'bg-yellow-100 dark:bg-yellow-900/20',
  },
  voice: {
    icon: '🎤',
    label: 'Voice',
    description: 'roomTypes.voice',
    colorClass: 'text-pink-600 dark:text-pink-400',
    bgClass: 'bg-pink-100 dark:bg-pink-900/20',
  },
  video: {
    icon: '📹',
    label: 'Video',
    description: 'roomTypes.video',
    colorClass: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-100 dark:bg-red-900/20',
  },
}

export interface RoomTypeSelectorProps {
  /** Selected type */
  selectedType?: RoomType
  /** Selection change handler */
  onChange: (type: RoomType) => void
  /** Disabled types */
  disabledTypes?: RoomType[]
  /** Additional CSS classes */
  className?: string
  /** Show compact mode */
  compact?: boolean
}

/**
 * Room Type Selector Component
 */
export function RoomTypeSelector({
  selectedType,
  onChange,
  disabledTypes = [],
  className,
  compact = false,
}: RoomTypeSelectorProps) {
  const { t } = useTranslation('rooms')

  const handleTypeSelect = useCallback(
    (type: RoomType) => {
      if (!disabledTypes.includes(type)) {
        onChange(type)
      }
    },
    [disabledTypes, onChange]
  )

  if (compact) {
    return (
      <div className={clsx('grid grid-cols-3 gap-2 sm:grid-cols-6', className)}>
        {(Object.keys(roomTypes) as RoomType[]).map(type => {
          const config = roomTypes[type]
          const isSelected = selectedType === type
          const isDisabled = disabledTypes.includes(type)

          return (
            <button
              key={type}
              onClick={() => handleTypeSelect(type)}
              disabled={isDisabled}
              type="button"
              className={clsx(
                'flex flex-col items-center gap-1 rounded-lg border p-2 transition-all',
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-sm dark:bg-blue-900/20'
                  : 'border-gray-200 hover:border-blue-300 dark:border-gray-700 dark:hover:border-blue-600',
                isDisabled && 'cursor-not-allowed opacity-50'
              )}
            >
              <span className={clsx('text-2xl', isSelected && config.colorClass)}>
                {config.icon}
              </span>
              <span
                className={clsx(
                  'text-xs font-medium',
                  isSelected
                    ? 'text-gray-900 dark:text-gray-100'
                    : 'text-gray-600 dark:text-gray-400'
                )}
              >
                {config.label}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className={clsx('grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {(Object.keys(roomTypes) as RoomType[]).map(type => {
        const config = roomTypes[type]
        const isSelected = selectedType === type
        const isDisabled = disabledTypes.includes(type)

        return (
          <button
            key={type}
            onClick={() => handleTypeSelect(type)}
            disabled={isDisabled}
            type="button"
            className={clsx(
              'flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all',
              isSelected
                ? 'border-blue-500 bg-blue-50 shadow-md dark:bg-blue-900/20'
                : 'border-gray-200 hover:border-blue-300 dark:border-gray-700 dark:hover:border-blue-600',
              isDisabled && 'cursor-not-allowed opacity-50'
            )}
          >
            {/* Icon */}
            <div
              className={clsx(
                'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg',
                config.bgClass
              )}
            >
              <span className={clsx('text-2xl', config.colorClass)}>{config.icon}</span>
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <h4
                className={clsx(
                  'font-semibold',
                  isSelected
                    ? 'text-gray-900 dark:text-gray-100'
                    : 'text-gray-700 dark:text-gray-300'
                )}
              >
                {config.label}
              </h4>
              <p
                className={clsx(
                  'mt-1 text-sm',
                  isSelected
                    ? 'text-gray-600 dark:text-gray-400'
                    : 'text-gray-500 dark:text-gray-500'
                )}
              >
                {t(config.description)}
              </p>
            </div>

            {/* Check mark */}
            {isSelected && (
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
                ✓
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Room Type Badge - Compact display
 */
export function RoomTypeBadge({ type }: { type: RoomType }) {
  const config = roomTypes[type]

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        config.bgClass,
        config.colorClass
      )}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  )
}

/**
 * Room Type Select - Dropdown version
 */
export function RoomTypeSelect({
  selectedType,
  onChange,
  disabledTypes = [],
  className,
}: Omit<RoomTypeSelectorProps, 'compact'>) {
  const { t } = useTranslation('rooms')
  const [isOpen, setIsOpen] = useState(false)

  const config = selectedType ? roomTypes[selectedType] : null

  return (
    <div className={clsx('relative', className)}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className={clsx(
          'flex w-full items-center gap-2 rounded-lg border px-4 py-2.5 text-left transition-all',
          isOpen
            ? 'ring-opacity-20 border-blue-500 ring-2 ring-blue-500'
            : 'border-gray-300 hover:border-blue-300 dark:border-gray-600 dark:hover:border-blue-600'
        )}
      >
        {config ? (
          <>
            <span className={clsx('text-xl', config.colorClass)}>{config.icon}</span>
            <span className="flex-1 font-medium text-gray-900 dark:text-gray-100">
              {config.label}
            </span>
          </>
        ) : (
          <span className="flex-1 text-gray-500 dark:text-gray-400">{t('selectType')}</span>
        )}
        <span className={clsx('text-gray-400 transition-transform', isOpen && 'rotate-180')}>
          ▼
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Menu */}
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
            {(Object.keys(roomTypes) as RoomType[]).map(type => {
              const config = roomTypes[type]
              const isSelected = selectedType === type
              const isDisabled = disabledTypes.includes(type)

              return (
                <button
                  key={type}
                  onClick={() => {
                    onChange(type)
                    setIsOpen(false)
                  }}
                  disabled={isDisabled}
                  type="button"
                  className={clsx(
                    'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                    isSelected && 'bg-blue-50 dark:bg-blue-900/20',
                    !isSelected && 'hover:bg-gray-100 dark:hover:bg-gray-700',
                    isDisabled && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <span className={clsx('text-xl', config.colorClass)}>{config.icon}</span>
                  <div className="flex-1">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {config.label}
                    </span>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {t(config.description)}
                    </p>
                  </div>
                  {isSelected && <span className="text-blue-500">✓</span>}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default RoomTypeSelector
