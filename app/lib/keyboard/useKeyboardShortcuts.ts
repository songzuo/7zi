/**
 * 键盘快捷键 Hook
 * Keyboard Shortcuts Hook
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { KeyboardShortcut, matchesShortcut, UseKeyboardShortcutsOptions } from './types';

// 全局快捷键注册表
const globalShortcuts = new Map<string, KeyboardShortcut>();
const scopeShortcuts = new Map<string, Map<string, KeyboardShortcut>>();

/**
 * 注册单个快捷键
 */
function registerShortcut(shortcut: KeyboardShortcut, scope?: string): void {
  if (scope) {
    if (!scopeShortcuts.has(scope)) {
      scopeShortcuts.set(scope, new Map());
    }
    scopeShortcuts.get(scope)!.set(shortcut.id, shortcut);
  } else {
    globalShortcuts.set(shortcut.id, shortcut);
  }
}

/**
 * 注销单个快捷键
 */
function unregisterShortcut(id: string, scope?: string): void {
  if (scope) {
    scopeShortcuts.get(scope)?.delete(id);
  } else {
    globalShortcuts.delete(id);
  }
}

/**
 * 获取所有活动的快捷键
 */
function getActiveShortcuts(): KeyboardShortcut[] {
  const active: KeyboardShortcut[] = [];
  
  // 添加全局快捷键
  globalShortcuts.forEach(shortcut => {
    if (shortcut.enabled !== false) {
      active.push(shortcut);
    }
  });
  
  // 添加当前 scope 的快捷键
  scopeShortcuts.forEach(scopeMap => {
    scopeMap.forEach(shortcut => {
      if (shortcut.enabled !== false) {
        active.push(shortcut);
      }
    });
  });
  
  return active;
}

/**
 * 检查是否在输入元素中
 */
function isInputElement(element: EventTarget | null): boolean {
  if (!element || !(element instanceof HTMLElement)) return false;
  
  const tagName = element.tagName.toLowerCase();
  const isEditable = element.isContentEditable;
  const isInput = ['input', 'textarea', 'select'].includes(tagName);
  
  return isInput || isEditable;
}

/**
 * 键盘快捷键 Hook
 * 
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   {
 *     id: 'open-command-palette',
 *     keys: ['ctrl', 'k'],
 *     description: '打开命令面板',
 *     handler: () => setOpen(true),
 *   },
 *   {
 *     id: 'new-task',
 *     keys: ['ctrl', 'n'],
 *     description: '新建任务',
 *     handler: () => createTask(),
 *   },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
): void {
  const { enabled = true, scope, global = false } = options;
  const shortcutsRef = useRef(shortcuts);

  // 更新 ref
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  // 键盘事件处理
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // 检查是否在输入元素中
      const inInput = isInputElement(event.target);
      
      // 获取活动的快捷键
      const activeShortcuts = getActiveShortcuts();

      for (const shortcut of activeShortcuts) {
        // 跳过在输入框中的快捷键（除非明确启用）
        if (inInput && !shortcut.enableInInput && !global) {
          continue;
        }

        // 检查是否匹配
        if (matchesShortcut(event, shortcut)) {
          // 阻止默认行为
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }

          // 执行处理函数
          shortcut.handler(event);
          break;
        }
      }
    },
    [enabled, global]
  );

  // 注册/注销快捷键
  useEffect(() => {
    if (!enabled) return;

    // 注册所有快捷键
    shortcutsRef.current.forEach(shortcut => {
      registerShortcut(shortcut, scope);
    });

    // 添加事件监听
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      // 移除事件监听
      window.removeEventListener('keydown', handleKeyDown);

      // 注销所有快捷键
      shortcutsRef.current.forEach(shortcut => {
        unregisterShortcut(shortcut.id, scope);
      });
    };
  }, [enabled, scope, handleKeyDown]);
}

/**
 * 单个快捷键 Hook
 * 
 * @example
 * ```tsx
 * useKeyboardShortcut(['ctrl', 'k'], () => {
 *   console.log('Command palette opened');
 * }, { description: '打开命令面板' });
 * ```
 */
export function useKeyboardShortcut(
  keys: string[],
  handler: (event: KeyboardEvent) => void,
  options: Omit<UseKeyboardShortcutsOptions, 'scope'> & {
    description?: string;
    id?: string;
    enableInInput?: boolean;
    preventDefault?: boolean;
  } = {}
): void {
  const {
    description = '',
    id,
    enableInInput = false,
    preventDefault = true,
    enabled = true,
    global = false,
  } = options;

  const shortcutId = id || keys.join('-');

  useKeyboardShortcuts(
    [
      {
        id: shortcutId,
        keys,
        description,
        handler,
        enableInInput,
        preventDefault,
        enabled,
      },
    ],
    { enabled, global }
  );
}

/**
 * 获取所有已注册的快捷键
 */
export function useRegisteredShortcuts(): KeyboardShortcut[] {
  return getActiveShortcuts();
}

// 导出工具函数
export { getActiveShortcuts };