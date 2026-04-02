/**
 * Keyboard Shortcuts Tooltip Panel Component
 *
 * Displays available keyboard shortcuts in an organized panel.
 */

'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { useKeyboardShortcuts, useShortcutsDisplay } from './use-keyboard-shortcuts'
import { getShortcutDisplayText, SHORTCUT_CATEGORIES } from './shortcut-config'
import type { KeyboardShortcut } from './shortcut-manager'

/**
 * Props for ShortcutTooltip
 */
export interface ShortcutTooltipProps {
  /** Whether the tooltip is open */
  isOpen?: boolean
  /** Called when the tooltip is closed */
  onClose?: () => void
  /** Context to show shortcuts for (defaults to current context) */
  context?: string
  /** Whether to show global shortcuts */
  showGlobal?: boolean
  /** Custom className */
  className?: string
  /** Custom title */
  title?: string
  /** Search placeholder text */
  searchPlaceholder?: string
}

/**
 * Shortcut category section
 */
interface ShortcutCategory {
  name: string
  shortcuts: KeyboardShortcut[]
}

/**
 * Main ShortcutTooltip component
 */
export function ShortcutTooltip({
  isOpen = false,
  onClose,
  context: contextProp,
  showGlobal = true,
  className = '',
  title = 'Keyboard Shortcuts',
  searchPlaceholder = 'Search shortcuts...',
}: ShortcutTooltipProps) {
  const { currentContext, setContext, activeShortcuts } = useKeyboardShortcuts()
  const [searchQuery, setSearchQuery] = useState('')

  // Determine which context to use
  const displayContext = contextProp || currentContext

  // Filter shortcuts based on search
  const filteredShortcuts = useMemo(() => {
    if (!searchQuery.trim()) {
      return activeShortcuts
    }

    const query = searchQuery.toLowerCase()
    return activeShortcuts.filter(
      shortcut =>
        shortcut.description.toLowerCase().includes(query) ||
        shortcut.key.toLowerCase().includes(query) ||
        shortcut.category?.toLowerCase().includes(query)
    )
  }, [activeShortcuts, searchQuery])

  // Group shortcuts by category
  const categorizedShortcuts = useMemo(() => {
    const groups: Record<string, KeyboardShortcut[]> = {}

    filteredShortcuts.forEach(shortcut => {
      const category = shortcut.category || 'other'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(shortcut)
    })

    // Convert to array and sort
    return Object.entries(groups)
      .map(([category, shortcuts]) => ({
        name: SHORTCUT_CATEGORIES[category] || category,
        shortcuts,
      }))
      .sort((a, b) => {
        const order = ['navigation', 'actions', 'formatting', 'ui', 'help']
        const aIndex = order.indexOf(a.name.toLowerCase())
        const bIndex = order.indexOf(b.name.toLowerCase())
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
      })
  }, [filteredShortcuts])

  // Handle close
  const handleClose = useCallback(() => {
    onClose?.()
  }, [onClose])

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  // Don't render if not open
  if (!isOpen) {
    return null
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 ${className}`}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-2xl dark:bg-gray-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-200 p-6 dark:border-gray-700">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
            <button
              onClick={handleClose}
              className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Context selector */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Context: {displayContext}
            </label>
          </div>

          {/* Search */}
          <div className="relative">
            <svg
              className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 transform text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white py-2 pr-4 pl-10 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {categorizedShortcuts.length === 0 ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              No shortcuts found
            </div>
          ) : (
            <div className="space-y-6">
              {categorizedShortcuts.map((category, index) => (
                <div key={category.name}>
                  <h3 className="mb-3 text-sm font-semibold tracking-wide text-gray-700 uppercase dark:text-gray-300">
                    {category.name}
                  </h3>
                  <div className="space-y-2">
                    {category.shortcuts.map(shortcut => (
                      <ShortcutRow key={shortcut.id} shortcut={shortcut} />
                    ))}
                  </div>
                  {index < categorizedShortcuts.length - 1 && (
                    <hr className="my-4 border-gray-200 dark:border-gray-700" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="rounded-b-lg border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Press{' '}
            <kbd className="rounded border border-gray-300 bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
              Esc
            </kbd>{' '}
            to close
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Individual shortcut row
 */
interface ShortcutRowProps {
  shortcut: KeyboardShortcut
}

function ShortcutRow({ shortcut }: ShortcutRowProps) {
  const displayText = getShortcutDisplayText(shortcut)

  return (
    <div className="flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
        {shortcut.description}
      </span>
      <kbd className="ml-4 rounded border border-gray-300 bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
        {displayText}
      </kbd>
    </div>
  )
}

/**
 * Shortcut badge component for displaying individual shortcuts
 */
export interface ShortcutBadgeProps {
  /** Shortcut definition */
  shortcut: KeyboardShortcut
  /** Custom className */
  className?: string
  /** Show description as tooltip */
  showTooltip?: boolean
}

export function ShortcutBadge({
  shortcut,
  className = '',
  showTooltip = true,
}: ShortcutBadgeProps) {
  const displayText = getShortcutDisplayText(shortcut)

  return (
    <kbd
      className={`inline-flex items-center rounded border border-gray-300 bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 ${className}`}
      title={showTooltip ? shortcut.description : undefined}
    >
      {displayText}
    </kbd>
  )
}

/**
 * Quick shortcut display for inline use
 */
export interface ShortcutDisplayProps {
  /** Key combination (e.g., 'Ctrl+K') */
  keys: string
  /** Description (optional) */
  description?: string
  /** Custom className */
  className?: string
}

export function ShortcutDisplay({ keys, description, className = '' }: ShortcutDisplayProps) {
  const keyParts = keys.split('+').map(k => k.trim())

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {keyParts.map((key, index) => (
        <React.Fragment key={index}>
          <kbd className="rounded border border-gray-300 bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
            {key}
          </kbd>
          {index < keyParts.length - 1 && <span className="text-gray-400">+</span>}
        </React.Fragment>
      ))}
      {description && (
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{description}</span>
      )}
    </div>
  )
}

/**
 * Shortcut menu button for toggling the tooltip
 */
export interface ShortcutMenuButtonProps {
  /** Custom icon */
  icon?: React.ReactNode
  /** Button text */
  text?: string
  /** Whether the tooltip is open */
  isOpen?: boolean
  /** Called when the button is clicked */
  onClick?: () => void
  /** Custom className */
  className?: string
}

export function ShortcutMenuButton({
  icon,
  text = 'Shortcuts',
  isOpen = false,
  onClick,
  className = '',
}: ShortcutMenuButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 ${className}`}
      aria-label={text}
      title={`${text} (?)`}
    >
      {icon || (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
      )}
      {text}
      <kbd className="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
        ?
      </kbd>
    </button>
  )
}

/**
 * HOC to add shortcut tooltip to a component
 */
export function withShortcutTooltip<P extends object>(
  Component: React.ComponentType<P>,
  shortcut?: KeyboardShortcut
) {
  return function WithShortcutTooltipComponent(props: P) {
    return (
      <div className="group relative inline-block">
        <Component {...props} />
        {shortcut && (
          <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 transform rounded bg-gray-100 px-2 py-1 text-xs font-medium whitespace-nowrap text-gray-700 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-700 dark:text-gray-300">
            {getShortcutDisplayText(shortcut)}
          </div>
        )}
      </div>
    )
  }
}

export default ShortcutTooltip
