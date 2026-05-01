'use client';

/**
 * Example component demonstrating keyboard shortcuts usage
 */

import React, { useState } from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Shortcut } from '@/lib/keyboard';
import ShortcutSettings from '@/components/keyboard/ShortcutSettings';

export default function KeyboardShortcutsExample() {
  const [showSettings, setShowSettings] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');

  // Define shortcut actions
  const handleGlobalSearch = () => {
    setSearchOpen(true);
    setLastAction('Global Search opened');
    console.log('Global Search opened');
  };

  const handleSave = () => {
    setLastAction('Saved');
    console.log('Saved');
  };

  const handleNewWorkflow = () => {
    setLastAction('New workflow created');
    console.log('New workflow created');
  };

  const handleExecuteWorkflow = () => {
    setLastAction('Workflow executed');
    console.log('Workflow executed');
  };

  // Register shortcuts
  const shortcuts: Shortcut[] = [
    {
      key: 'cmd+k',
      description: 'Open global search',
      category: 'navigation',
      action: handleGlobalSearch,
      enabled: true,
    },
    {
      key: 'cmd+s',
      description: 'Save current work',
      category: 'system',
      action: handleSave,
      enabled: true,
    },
    {
      key: 'cmd+n',
      description: 'Create new workflow',
      category: 'workflow',
      action: handleNewWorkflow,
      enabled: true,
    },
    {
      key: 'cmd+e',
      description: 'Execute current workflow',
      category: 'workflow',
      action: handleExecuteWorkflow,
      enabled: true,
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Keyboard Shortcuts Demo</h1>

        {/* Last Action Display */}
        {lastAction && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Last action: <strong>{lastAction}</strong>
            </p>
          </div>
        )}

        {/* Quick Reference */}
        <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Quick Reference</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <kbd className="px-3 py-1 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 font-mono text-sm">
                ⌘K
              </kbd>
              <span className="text-gray-700 dark:text-gray-300">Global Search</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="px-3 py-1 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 font-mono text-sm">
                ⌘S
              </kbd>
              <span className="text-gray-700 dark:text-gray-300">Save</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="px-3 py-1 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 font-mono text-sm">
                ⌘N
              </kbd>
              <span className="text-gray-700 dark:text-gray-300">New Workflow</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="px-3 py-1 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 font-mono text-sm">
                ⌘E
              </kbd>
              <span className="text-gray-700 dark:text-gray-300">Execute Workflow</span>
            </div>
          </div>
        </div>

        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(true)}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Open Keyboard Settings
        </button>

        {/* Search Modal (Demo) */}
        {searchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-900 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  autoFocus
                />
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-900 rounded font-mono">Esc</kbd> to close
                </p>
              </div>
              <button
                onClick={() => setSearchOpen(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        <ShortcutSettings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      </div>
    </div>
  );
}