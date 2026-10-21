'use client';

/**
 * Keyboard Shortcuts Settings Panel Component
 */

import React, { useState, useEffect } from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { shortcutRegistry, ShortcutCategory, Shortcut } from '@/lib/keyboard/shortcut-registry';
import { getCategories, getDefaultShortcuts, getPlatformKey } from '@/lib/keyboard/defaults';

interface ShortcutSettingsProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function ShortcutSettings({ isOpen = false, onClose }: ShortcutSettingsProps) {
  const [selectedCategory, setSelectedCategory] = useState<ShortcutCategory>('navigation');
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);

  useEffect(() => {
    setShortcuts(shortcutRegistry.getAll());
  }, []);

  const categories = getCategories();
  const filteredShortcuts = shortcuts.filter(s => s.category === selectedCategory);

  const handleCategoryChange = (category: ShortcutCategory) => {
    setSelectedCategory(category);
  };

  const handleToggleShortcut = (key: string, enabled: boolean) => {
    if (enabled) {
      shortcutRegistry.enable(key);
    } else {
      shortcutRegistry.disable(key);
    }
    setShortcuts(shortcutRegistry.getAll());
  };

  const handleEditShortcut = (key: string) => {
    setIsEditing(key);
  };

  const handleCaptureKey = (key: string, newKeyCombo: string) => {
    shortcutRegistry.update(key, { key: newKeyCombo });
    setIsEditing(null);
    setShortcuts(shortcutRegistry.getAll());
  };

  const handleResetDefaults = () => {
    const defaults = getDefaultShortcuts();
    shortcutRegistry.clear();
    defaults.forEach(shortcut => shortcutRegistry.register(shortcut));
    setShortcuts(shortcutRegistry.getAll());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Keyboard Shortcuts
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex h-[calc(90vh-140px)]">
          {/* Sidebar - Categories */}
          <div className="w-48 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Categories
              </h3>
              <div className="space-y-1">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => handleCategoryChange(category)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedCategory === category
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                    }`}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content - Shortcuts List */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-6">
              <button
                onClick={handleResetDefaults}
                className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Reset to defaults
              </button>
            </div>

            <div className="space-y-4">
              {filteredShortcuts.map((shortcut) => (
                <div
                  key={shortcut.key}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm px-3 py-1 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
                        {getPlatformKey(shortcut.key)}
                      </span>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {shortcut.description}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Enable/Disable Toggle */}
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={shortcut.enabled !== false}
                        onChange={(e) => handleToggleShortcut(shortcut.key, e.target.checked)}
                        className="w-4 h-4 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Enabled
                      </span>
                    </label>

                    {/* Edit Button */}
                    <button
                      onClick={() => handleEditShortcut(shortcut.key)}
                      className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}

              {filteredShortcuts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">
                    No shortcuts in this category
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Shortcut Key Capture Component
 */
interface KeyCaptureProps {
  onClose: () => void;
  onSave: (keyCombo: string) => void;
}

function KeyCapture({ onClose, onSave }: KeyCaptureProps) {
  const [capturedKeys, setCapturedKeys] = useState<string[]>([]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const parts: string[] = [];
      if (event.ctrlKey) parts.push('ctrl');
      if (event.metaKey) parts.push('cmd');
      if (event.shiftKey) parts.push('shift');
      if (event.altKey) parts.push('alt');

      const key = event.key.toLowerCase();
      if (
        key !== 'control' &&
        key !== 'meta' &&
        key !== 'shift' &&
        key !== 'alt'
      ) {
        parts.push(key);
        setCapturedKeys(parts);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (capturedKeys.length > 0) {
      const timer = setTimeout(() => {
        onSave(capturedKeys.join('+'));
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [capturedKeys, onSave]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Press new key combination
        </h3>
        <div className="font-mono text-3xl text-blue-500 dark:text-blue-400 mb-6">
          {capturedKeys.length > 0 ? getPlatformKey(capturedKeys.join('+')) : '...'}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Press Escape to cancel
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
