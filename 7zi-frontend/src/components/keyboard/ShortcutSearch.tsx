'use client';

/**
 * Shortcut Search Component
 * Opens with Ctrl+/ and allows searching through all shortcuts
 */

import React, { useState, useEffect, useCallback } from 'react';
import { shortcutManager } from '@/lib/keyboard/shortcut-manager';
import { Shortcut } from '@/lib/keyboard/shortcut-registry';
import ShortcutTooltip from './ShortcutTooltip';
import { getPlatformKey } from '@/lib/keyboard/defaults';

interface ShortcutSearchProps {
  isOpen?: boolean;
  onClose?: () => void;
  onShortcutTriggered?: (shortcut: Shortcut) => void;
}

export default function ShortcutSearch({
  isOpen = false,
  onClose,
  onShortcutTriggered,
}: ShortcutSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredShortcuts, setFilteredShortcuts] = useState<Shortcut[]>([]);

  // Filter shortcuts based on search query
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      return;
    }

    const shortcuts = shortcutManager.search(searchQuery);
    setFilteredShortcuts(shortcuts);
    setSelectedIndex(0);
  }, [isOpen, searchQuery]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev =>
            prev < filteredShortcuts.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          event.preventDefault();
          if (filteredShortcuts[selectedIndex]) {
            handleShortcutSelect(filteredShortcuts[selectedIndex]);
          }
          break;
        case 'Escape':
          event.preventDefault();
          onClose?.();
          break;
      }
    },
    [isOpen, filteredShortcuts, selectedIndex, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Handle shortcut selection
  const handleShortcutSelect = (shortcut: Shortcut) => {
    if (shortcut.enabled !== false) {
      shortcut.action();
      onShortcutTriggered?.(shortcut);
    }
    onClose?.();
  };

  // Group shortcuts by category
  const groupedShortcuts = filteredShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Search Input */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shortcuts..."
              className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-500"
              autoFocus
            />
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">Esc</kbd>
              Close
            </span>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {filteredShortcuts.length === 0 ? (
            <div className="p-8 text-center">
              <svg
                className="w-12 h-12 mx-auto text-gray-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">
                No shortcuts found for "{searchQuery}"
              </p>
            </div>
          ) : (
            Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
              <div key={category} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50">
                  <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {category}
                  </h3>
                </div>
                {shortcuts.map((shortcut, index) => {
                  const globalIndex = filteredShortcuts.indexOf(shortcut);
                  const isSelected = globalIndex === selectedIndex;
                  const isDisabled = shortcut.enabled === false;

                  return (
                    <button
                      key={shortcut.key}
                      onClick={() => handleShortcutSelect(shortcut)}
                      disabled={isDisabled}
                      className={`
                        w-full px-4 py-3 flex items-center justify-between
                        transition-colors duration-150
                        ${isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-900/50 border-l-4 border-transparent'
                        }
                        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <div className="flex-1 text-left">
                        <p className={`font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                          {shortcut.description}
                        </p>
                        {isDisabled && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Disabled
                          </p>
                        )}
                      </div>
                      <ShortcutTooltip shortcut={shortcut.key} size="sm" />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            {filteredShortcuts.length} shortcut{filteredShortcuts.length !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to use shortcut search
 */
export function useShortcutSearch() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return {
    isOpen,
    open,
    close,
  };
}