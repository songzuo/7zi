'use client';

/**
 * Comprehensive Demo Component for Enhanced Keyboard Shortcuts
 * Demonstrates all new features: conflict detection, tooltips, search, custom bindings, and tutorial
 */

import React, { useState } from 'react';
import { useKeyboardShortcutsEnhanced } from '@/hooks/useKeyboardShortcutsEnhanced';
import { Shortcut } from '@/lib/keyboard/shortcut-registry';
import { shortcutManager } from '@/lib/keyboard/shortcut-manager';
import ShortcutSettingsEnhanced from './ShortcutSettingsEnhanced';
import ShortcutSearch, { useShortcutSearch } from './ShortcutSearch';
import ShortcutTutorial, { TutorialProgress, useShortcutTutorial } from './ShortcutTutorial';
import ShortcutTooltip, { ShortcutBadge, KeyboardKey } from './ShortcutTooltip';

export default function KeyboardShortcutsDemo() {
  const [showSettings, setShowSettings] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');
  const [conflicts, setConflicts] = useState<any[]>([]);

  const search = useShortcutSearch();
  const tutorial = useShortcutTutorial();

  // Define shortcut actions
  const handleGlobalSearch = () => {
    setLastAction('Global Search opened');
    console.log('Global Search opened');
  };

  const handleSave = () => {
    setLastAction('Document saved');
    console.log('Document saved');
  };

  const handleNewWorkflow = () => {
    setLastAction('New workflow created');
    console.log('New workflow created');
  };

  const handleExecuteWorkflow = () => {
    setLastAction('Workflow executed');
    console.log('Workflow executed');
  };

  const handleUndo = () => {
    setLastAction('Undo performed');
    console.log('Undo performed');
  };

  const handleRedo = () => {
    setLastAction('Redo performed');
    console.log('Redo performed');
  };

  const handleFocusSearch = () => {
    search.open();
    setLastAction('Shortcut search opened');
    console.log('Shortcut search opened');
  };

  // Define shortcuts
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
    {
      key: 'cmd+z',
      description: 'Undo last action',
      category: 'editing',
      action: handleUndo,
      enabled: true,
    },
    {
      key: 'cmd+shift+z',
      description: 'Redo last action',
      category: 'editing',
      action: handleRedo,
      enabled: true,
    },
    {
      key: 'ctrl+/',
      description: 'Open shortcut search',
      category: 'navigation',
      action: handleFocusSearch,
      enabled: true,
    },
  ];

  // Use enhanced keyboard shortcuts hook with conflict detection
  const { conflicts: hookConflicts, manager } = useKeyboardShortcutsEnhanced(shortcuts, {
    onConflict: (conflict) => {
      console.warn('Shortcut conflict detected:', conflict);
      setConflicts(prev => [...prev, conflict]);
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Enhanced Keyboard Shortcuts
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            v1.14 - Conflict Detection, Custom Bindings, Search & Tutorial
          </p>
        </div>

        {/* Last Action Display */}
        {lastAction && (
          <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg animate-pulse">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Last action: <strong>{lastAction}</strong>
            </p>
          </div>
        )}

        {/* Conflicts Warning */}
        {conflicts.length > 0 && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <h3 className="font-bold text-red-800 dark:text-red-200 mb-2">
              ⚠️ Shortcut Conflicts Detected
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">
              {conflicts.length} conflict(s) found. Open settings to resolve.
            </p>
          </div>
        )}

        {/* Feature Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Quick Reference */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Quick Reference
            </h2>
            <div className="space-y-3">
              {shortcuts.slice(0, 6).map((shortcut) => (
                <div key={shortcut.key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {shortcut.description}
                  </span>
                  <ShortcutTooltip shortcut={shortcut.key} size="sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Visual Key Examples */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Visual Key Examples
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Keyboard Keys</p>
                <div className="flex gap-2">
                  <KeyboardKey keyDisplay="⌘" size="md" />
                  <KeyboardKey keyDisplay="K" size="md" />
                  <KeyboardKey keyDisplay="⇧" size="md" />
                  <KeyboardKey keyDisplay="⌥" size="md" />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Shortcut Badges</p>
                <div className="flex gap-2">
                  <ShortcutBadge shortcut="cmd+k" />
                  <ShortcutBadge shortcut="cmd+s" />
                  <ShortcutBadge shortcut="ctrl+/" />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Full Tooltips</p>
                <ShortcutTooltip shortcut="cmd+shift+e" description="Export" showIcon />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg mb-8">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
            Explore Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => setShowSettings(true)}
              className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>

            <button
              onClick={search.open}
              className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search Shortcuts
              <ShortcutBadge shortcut="ctrl+/" size="sm" />
            </button>

            <button
              onClick={() => setShowTutorial(true)}
              className="px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Start Tutorial
            </button>

            <button
              onClick={() => {
                const config = manager.exportConfig();
                console.log('Exported config:', config);
                alert('Configuration exported to console');
              }}
              className="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Export Config
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow">
            <div className="text-3xl font-bold text-blue-500 dark:text-blue-400">
              {manager.getAll().length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Shortcuts
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow">
            <div className="text-3xl font-bold text-green-500 dark:text-green-400">
              {manager.getAll().filter(s => s.enabled !== false).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Enabled
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow">
            <div className="text-3xl font-bold text-purple-500 dark:text-purple-400">
              {manager.getCustomBindings().length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Custom Bindings
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow">
            <div className="text-3xl font-bold text-orange-500 dark:text-orange-400">
              {conflicts.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Conflicts
            </div>
          </div>
        </div>

        {/* Tutorial Progress Indicator */}
        {tutorial.completed > 0 && (
          <div className="fixed bottom-4 right-4 z-40">
            <TutorialProgress
              completed={tutorial.completed}
              total={shortcuts.length}
              onClick={() => setShowTutorial(true)}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <ShortcutSettingsEnhanced
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <ShortcutSearch
        isOpen={search.isOpen}
        onClose={search.close}
        onShortcutTriggered={(shortcut) => {
          console.log('Shortcut triggered via search:', shortcut);
        }}
      />

      <ShortcutTutorial
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        onComplete={tutorial.onComplete}
        shortcuts={shortcuts}
      />
    </div>
  );
}