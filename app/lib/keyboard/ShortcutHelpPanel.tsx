/**
 * 快捷键帮助面板组件
 * Shortcut Help Panel Component
 */

'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useKeyboardShortcut, useRegisteredShortcuts } from './useKeyboardShortcuts';
import { formatShortcutDisplay, getPlatformModifier } from './types';

interface ShortcutHelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
}

/** 默认快捷键 */
const DEFAULT_SHORTCUTS = [
  {
    id: 'command-palette',
    keys: [getPlatformModifier(), 'k'],
    description: '打开命令面板',
    group: '通用',
  },
  {
    id: 'shortcut-help',
    keys: [getPlatformModifier(), '/'],
    description: '显示快捷键帮助',
    group: '通用',
  },
  {
    id: 'new-task',
    keys: [getPlatformModifier(), 'n'],
    description: '新建任务',
    group: '任务',
  },
  {
    id: 'search',
    keys: [getPlatformModifier(), 'f'],
    description: '搜索',
    group: '通用',
  },
  {
    id: 'escape',
    keys: ['Escape'],
    description: '关闭弹窗/取消',
    group: '通用',
  },
  {
    id: 'save',
    keys: [getPlatformModifier(), 's'],
    description: '保存',
    group: '编辑',
  },
];

/**
 * 快捷键帮助面板
 */
export function ShortcutHelpPanel({
  isOpen,
  onClose,
  title = '键盘快捷键',
  className = '',
}: ShortcutHelpPanelProps): JSX.Element | null {
  // ESC 关闭
  useKeyboardShortcut(['Escape'], onClose, {
    enableInInput: true,
    id: 'close-shortcut-help',
  });

  // 点击背景关闭
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // 阻止滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // 获取已注册的快捷键
  const registeredShortcuts = useRegisteredShortcuts();

  // 合并快捷键并按组分类
  const groupedShortcuts = useMemo(() => {
    const groups = new Map<string, typeof DEFAULT_SHORTCUTS>();

    // 添加默认快捷键
    DEFAULT_SHORTCUTS.forEach(shortcut => {
      const group = shortcut.group || '其他';
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)!.push(shortcut);
    });

    // 添加已注册的快捷键
    registeredShortcuts.forEach(shortcut => {
      const group = shortcut.group || '其他';
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      // 检查是否已存在
      const existing = groups.get(group)!;
      if (!existing.find(s => s.id === shortcut.id)) {
        existing.push({
          id: shortcut.id,
          keys: shortcut.keys,
          description: shortcut.description,
          group,
        });
      }
    });

    return groups;
  }, [registeredShortcuts]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-help-title"
    >
      <div
        className={`max-h-[80vh] w-full max-w-lg overflow-auto rounded-lg bg-white shadow-xl dark:bg-gray-800 ${className}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
          <h2
            id="shortcut-help-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            aria-label="关闭"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {Array.from(groupedShortcuts.entries()).map(([group, shortcuts]) => (
            <div key={group} className="mb-6 last:mb-0">
              <h3 className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                {group}
              </h3>
              <div className="space-y-2">
                {shortcuts.map(shortcut => (
                  <div
                    key={shortcut.id}
                    className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {shortcut.description}
                    </span>
                    <kbd className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {formatShortcutDisplay(shortcut.keys)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 text-center text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
          按 <kbd className="rounded bg-gray-200 px-1 py-0.5 dark:bg-gray-700">Esc</kbd> 关闭此面板
        </div>
      </div>
    </div>
  );
}

/**
 * 快捷键帮助按钮
 */
export function ShortcutHelpButton({
  onClick,
  className = '',
}: {
  onClick: () => void;
  className?: string;
}): JSX.Element {
  useKeyboardShortcut([getPlatformModifier(), '/'], onClick, {
    description: '显示快捷键帮助',
    id: 'shortcut-help-trigger',
  });

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 ${className}`}
      title="键盘快捷键"
    >
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
      <kbd className="hidden rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-700 sm:inline-block">
        {formatShortcutDisplay([getPlatformModifier(), '/'])}
      </kbd>
    </button>
  );
}

export default ShortcutHelpPanel;