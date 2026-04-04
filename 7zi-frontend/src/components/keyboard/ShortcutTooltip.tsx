'use client';

/**
 * Shortcut Tooltip Component
 * Displays keyboard shortcuts with visual keyboard icons
 */

import React from 'react';
import { getPlatformKey } from '@/lib/keyboard/defaults';

interface ShortcutTooltipProps {
  shortcut: string;
  description?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function ShortcutTooltip({
  shortcut,
  description,
  showIcon = true,
  size = 'md',
  className = '',
}: ShortcutTooltipProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const keys = shortcut.split('+').map(k => k.trim());

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {keys.map((key, index) => (
        <React.Fragment key={key}>
          {index > 0 && <span className="text-gray-400">+</span>}
          <kbd
            className={`
              inline-flex items-center gap-1.5
              bg-white dark:bg-gray-800
              border border-gray-300 dark:border-gray-600
              rounded shadow-sm
              font-mono font-medium
              text-gray-700 dark:text-gray-300
              ${sizeClasses[size]}
            `}
          >
            {showIcon && getKeyIcon(key, iconSize[size])}
            <span>{formatKey(key)}</span>
          </kbd>
        </React.Fragment>
      ))}
      {description && (
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
          {description}
        </span>
      )}
    </div>
  );
}

/**
 * Format key for display
 */
function formatKey(key: string): string {
  const keyMap: Record<string, string> = {
    'ctrl': 'Ctrl',
    'cmd': '⌘',
    'meta': '⌘',
    'shift': '⇧',
    'alt': '⌥',
    'option': '⌥',
    'escape': 'Esc',
    'enter': '↵',
    'return': '↵',
    'tab': '⇥',
    'space': '␣',
    'backspace': '⌫',
    'delete': '⌦',
    'arrowup': '↑',
    'arrowdown': '↓',
    'arrowleft': '←',
    'arrowright': '→',
  };

  const lowerKey = key.toLowerCase();
  return keyMap[lowerKey] || key.toUpperCase();
}

/**
 * Get keyboard icon for modifier keys
 */
function getKeyIcon(key: string, sizeClass: string): React.ReactNode {
  const lowerKey = key.toLowerCase();

  switch (lowerKey) {
    case 'ctrl':
    case 'cmd':
    case 'meta':
      return (
        <svg className={sizeClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M6 8h12M6 12h12M6 16h8" />
        </svg>
      );
    case 'shift':
      return (
        <svg className={sizeClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M4 17l8-10 8 10H4z" />
        </svg>
      );
    case 'alt':
    case 'option':
      return (
        <svg className={sizeClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M4 12h16M4 12l4-4M4 12l4 4" />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * Shortcut Badge Component
 * Compact version for inline use
 */
interface ShortcutBadgeProps {
  shortcut: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function ShortcutBadge({ shortcut, size = 'sm', className = '' }: ShortcutBadgeProps) {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-1 text-xs',
  };

  const displayKey = getPlatformKey(shortcut);

  return (
    <kbd
      className={`
        inline-flex items-center justify-center
        bg-gray-100 dark:bg-gray-800
        border border-gray-300 dark:border-gray-600
        rounded
        font-mono font-medium
        text-gray-700 dark:text-gray-300
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {displayKey}
    </kbd>
  );
}

/**
 * Keyboard Icons Component
 * Visual representation of a keyboard key
 */
interface KeyboardKeyProps {
  keyDisplay: string;
  pressed?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function KeyboardKey({ keyDisplay, pressed = false, size = 'md', className = '' }: KeyboardKeyProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const pressedClasses = pressed
    ? 'bg-blue-500 text-white border-blue-600 scale-95'
    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600';

  return (
    <div
      className={`
        inline-flex items-center justify-center
        border-2 rounded-lg shadow-sm
        font-mono font-medium
        transition-all duration-150
        ${sizeClasses[size]}
        ${pressedClasses}
        ${className}
      `}
    >
      {formatKey(keyDisplay)}
    </div>
  );
}