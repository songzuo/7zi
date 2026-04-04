'use client';

/**
 * Enhanced Keyboard Shortcuts Settings Panel Component
 * Supports custom key bindings and conflict detection
 */

import React, { useState, useEffect } from 'react';
import { shortcutManager, ShortcutConflict } from '@/lib/keyboard/shortcut-manager';
import { Shortcut, ShortcutCategory } from '@/lib/keyboard/shortcut-registry';
import { getCategories, getDefaultShortcuts, getPlatformKey } from '@/lib/keyboard/defaults';
import ShortcutTooltip from './ShortcutTooltip';

interface ShortcutSettingsEnhancedProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function ShortcutSettingsEnhanced({
  isOpen = false,
  onClose,
}: ShortcutSettingsEnhancedProps) {
  const [selectedCategory, setSelectedCategory] = useState<ShortcutCategory>('navigation');
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ShortcutConflict | null>(null);
  const [captureMode, setCaptureMode] = useState(false);
  const [capturedKeys, setCapturedKeys] = useState<string[]>([]);

  useEffect(() => {
    setShortcuts(shortcutManager.getAll());
  }, []);

  const categories = getCategories();
  const filteredShortcuts = shortcuts.filter(s => s.category === selectedCategory);

  const handleCategoryChange = (category: ShortcutCategory) => {
    setSelectedCategory(category);
  };

  const handleToggleShortcut = (key: string, enabled: boolean) => {
    if (enabled) {
      shortcutManager.enable(key);
    } else {
      shortcutManager.disable(key);
    }
    setShortcuts(shortcutManager.getAll());
  };

  const handleEditShortcut = (key: string) => {
    setIsEditing(key);
    setCaptureMode(true);
    setCapturedKeys([]);
    setConflict(null);
  };

  const handleCaptureKey = (newKeyCombo: string) => {
    const originalKey = isEditing;
    if (!originalKey) return;

    const result = shortcutManager.setCustomBinding(originalKey, newKeyCombo);

    if (result.success) {
      setIsEditing(null);
      setCaptureMode(false);
      setShortcuts(shortcutManager.getAll());
    } else if (result.conflict) {
      setConflict(result.conflict);
      setCaptureMode(false);
    }
  };

  const handleResolveConflict = (overwrite: boolean) => {
    if (!conflict || !isEditing) return;

    if (overwrite) {
      // Unregister the conflicting shortcut
      shortcutManager.unregister(conflict.existingShortcut.key);
      // Try again
      const result = shortcutManager.setCustomBinding(isEditing, conflict.newShortcut.key);
      if (result.success) {
        setIsEditing(null);
        setCaptureMode(false);
        setConflict(null);
        setShortcuts(shortcutManager.getAll());
      }
    } else {
      // Keep existing, cancel edit
      setConflict(null);
      setCaptureMode(false);
      setIsEditing(null);
    }
  };

  const handleResetShortcut = (key: string) => {
    // Find default key for this shortcut
    const defaults = getDefaultShortcuts();
    const defaultShortcut = defaults.find(s => s.key === key);
    if (defaultShortcut) {
      shortcutManager.resetToDefault(key, defaultShortcut.key);
      setShortcuts(shortcutManager.getAll());
    }
  };

  const handleResetDefaults = () => {
    const defaults = getDefaultShortcuts();
    shortcutManager.clear();
    defaults.forEach(shortcut => {
      shortcutManager.register(shortcut);
    });
    setShortcuts(shortcutManager.getAll());
  };

  const handleCancelCapture = () => {
    setCaptureMode(false);
    setIsEditing(null);
    setCapturedKeys([]);
    setConflict(null);
  };

  if (!isOpen) return null;

  return (
    <>
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
              <div className="mb-6 flex items-center justify-between">
                <button
                  onClick={handleResetDefaults}
                  className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Reset to defaults
                </button>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {filteredShortcuts.length} shortcuts
                </div>
              </div>

              <div className="space-y-4">
                {filteredShortcuts.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                      isEditing === shortcut.key
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                        : 'bg-gray-50 dark:bg-gray-900'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <ShortcutTooltip shortcut={shortcut.key} size="md" />
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
                          disabled={isEditing === shortcut.key}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Enabled
                        </span>
                      </label>

                      {/* Reset Button */}
                      <button
                        onClick={() => handleResetShortcut(shortcut.key)}
                        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                        disabled={isEditing === shortcut.key}
                      >
                        Reset
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => handleEditShortcut(shortcut.key)}
                        className={`text-sm ${
                          isEditing === shortcut.key
                            ? 'text-blue-500 font-medium'
                            : 'text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300'
                        }`}
                        disabled={!!isEditing}
                      >
                        {isEditing === shortcut.key ? 'Press new keys...' : 'Edit'}
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

      {/* Key Capture Modal */}
      {captureMode && (
        <KeyCapture
          onCancel={handleCancelCapture}
          onSave={handleCaptureKey}
          capturedKeys={capturedKeys}
        />
      )}

      {/* Conflict Resolution Modal */}
      {conflict && (
        <ConflictResolution
          conflict={conflict}
          onResolve={handleResolveConflict}
          onCancel={handleCancelCapture}
        />
      )}
    </>
  );
}

/**
 * Key Capture Component
 */
interface KeyCaptureProps {
  capturedKeys: string[];
  onCancel: () => void;
  onSave: (keyCombo: string) => void;
}

function KeyCapture({ capturedKeys: propCapturedKeys, onCancel, onSave }: KeyCaptureProps) {
  const [capturedKeys, setCapturedKeys] = useState<string[]>(propCapturedKeys);

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
      }

      if (parts.length > 0) {
        setCapturedKeys(parts);
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center max-w-md mx-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Press new key combination
        </h3>
        <div className="font-mono text-3xl text-blue-500 dark:text-blue-400 mb-6 min-h-[48px]">
          {capturedKeys.length > 0 ? getPlatformKey(capturedKeys.join('+')) : '...'}
        </div>
        <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <p>Press the keys you want to use</p>
          <p>Press Escape to cancel</p>
        </div>
        <button
          onClick={onCancel}
          className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/**
 * Conflict Resolution Component
 */
interface ConflictResolutionProps {
  conflict: ShortcutConflict;
  onResolve: (overwrite: boolean) => void;
  onCancel: () => void;
}

function ConflictResolution({ conflict, onResolve, onCancel }: ConflictResolutionProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg mx-4">
        <div className="flex items-center gap-3 mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Shortcut Conflict
          </h3>
        </div>

        <p className="text-gray-700 dark:text-gray-300 mb-6">
          The key combination <strong>{getPlatformKey(conflict.newShortcut.key)}</strong> is already in use by:
        </p>

        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <ShortcutTooltip shortcut={conflict.existingShortcut.key} size="sm" />
            <span className="font-medium text-gray-900 dark:text-white">
              {conflict.existingShortcut.description}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Category: {conflict.existingShortcut.category}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onResolve(false)}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Keep Existing
          </button>
          <button
            onClick={() => onResolve(true)}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Overwrite
          </button>
        </div>
      </div>
    </div>
  );
}