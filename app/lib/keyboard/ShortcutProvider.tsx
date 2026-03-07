/**
 * 全局快捷键 Provider
 * 在应用根部包装，提供全局快捷键支持
 */

'use client';

import React, { createContext, useContext, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useShortcutStore, getPlatformModifier, formatShortcutForDisplay } from './shortcut-store';
import type { KeyboardShortcut } from './types';

/** 快捷键上下文 */
interface ShortcutContextValue {
  /** 是否启用 */
  enabled: boolean;
  /** 注册快捷键 */
  register: (shortcut: KeyboardShortcut) => void;
  /** 注销快捷键 */
  unregister: (id: string) => void;
  /** 触发快捷键 */
  trigger: (id: string) => void;
  /** 获取所有快捷键 */
  getAll: () => KeyboardShortcut[];
  /** 格式化快捷键显示 */
  formatDisplay: (keys: string[]) => string;
  /** 平台修饰键 */
  platformModifier: 'ctrl' | 'meta';
}

const ShortcutContext = createContext<ShortcutContextValue | null>(null);

/** 快捷键 Provider Props */
interface ShortcutProviderProps {
  children: ReactNode;
  /** 是否启用全局快捷键 */
  enabled?: boolean;
  /** 默认快捷键列表 */
  defaultShortcuts?: KeyboardShortcut[];
}

/**
 * 全局快捷键 Provider
 * 
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { ShortcutProvider } from '@/lib/keyboard';
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <ShortcutProvider>
 *       {children}
 *     </ShortcutProvider>
 *   );
 * }
 * ```
 */
export function ShortcutProvider({
  children,
  enabled = true,
  defaultShortcuts = [],
}: ShortcutProviderProps): JSX.Element {
  const store = useShortcutStore();
  
  // 注册默认快捷键
  useEffect(() => {
    defaultShortcuts.forEach(shortcut => {
      store.register(shortcut);
    });
    
    return () => {
      defaultShortcuts.forEach(shortcut => {
        store.unregister(shortcut.id);
      });
    };
  }, [defaultShortcuts, store]);
  
  // 设置全局启用状态
  useEffect(() => {
    store.setGlobalEnabled(enabled);
  }, [enabled, store]);
  
  // 检查事件是否匹配快捷键
  const matchesShortcut = useCallback(
    (event: KeyboardEvent, shortcut: KeyboardShortcut): boolean => {
      const keys = shortcut.keys.map(k => k.toLowerCase());
      
      // 检查修饰键
      const hasCtrl = keys.includes('ctrl');
      const hasAlt = keys.includes('alt');
      const hasShift = keys.includes('shift');
      const hasMeta = keys.includes('meta');
      
      // Ctrl 在 Mac 上映射为 Meta
      const ctrlPressed = event.ctrlKey || (getPlatformModifier() === 'meta' && event.metaKey);
      const metaPressed = event.metaKey || (getPlatformModifier() === 'ctrl' && event.ctrlKey);
      
      if (hasCtrl && !ctrlPressed) return false;
      if (hasAlt && !event.altKey) return false;
      if (hasShift && !event.shiftKey) return false;
      if (hasMeta && !metaPressed) return false;
      
      // 检查主键
      const modifierKeys = ['ctrl', 'alt', 'shift', 'meta'];
      const mainKeys = keys.filter(k => !modifierKeys.includes(k));
      
      if (mainKeys.length === 0) return false;
      
      // 支持多个主键（如 Enter, Space）
      const eventKey = event.key.toLowerCase();
      return mainKeys.some(k => {
        // 特殊键映射
        const keyMap: Record<string, string> = {
          'enter': 'enter',
          'escape': 'escape',
          'space': ' ',
          'delete': 'delete',
          'backspace': 'backspace',
          'f1': 'f1',
          'f2': 'f2',
          'f3': 'f3',
          'f4': 'f4',
          'f5': 'f5',
          'f6': 'f6',
          'f7': 'f7',
          'f8': 'f8',
          'f9': 'f9',
          'f10': 'f10',
          'f11': 'f11',
          'f12': 'f12',
        };
        
        const normalizedKey = keyMap[k] || k;
        return eventKey === normalizedKey;
      });
    },
    []
  );
  
  // 检查是否在输入元素中
  const isInInputElement = useCallback((target: EventTarget | null): boolean => {
    if (!target || !(target instanceof HTMLElement)) return false;
    
    const tagName = target.tagName.toLowerCase();
    const isEditable = target.isContentEditable;
    const isInput = ['input', 'textarea', 'select'].includes(tagName);
    
    return isInput || isEditable;
  }, []);
  
  // 键盘事件处理
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!store.enabled) return;
      
      const inInput = isInInputElement(event.target);
      const shortcuts = store.getAll();
      
      // 按优先级排序（快捷键数量少的优先，更精确）
      const sortedShortcuts = [...shortcuts].sort(
        (a, b) => b.keys.length - a.keys.length
      );
      
      for (const shortcut of sortedShortcuts) {
        // 跳过输入框中的快捷键（除非明确启用）
        if (inInput && !shortcut.enableInInput) {
          continue;
        }
        
        if (matchesShortcut(event, shortcut)) {
          // 阻止默认行为
          event.preventDefault();
          event.stopPropagation();
          
          // 执行处理器
          shortcut.handler(event);
          break;
        }
      }
    },
    [store, matchesShortcut, isInInputElement]
  );
  
  // 注册全局事件监听
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handleKeyDown]);
  
  // 触发快捷键
  const trigger = useCallback(
    (id: string) => {
      const handler = store.handlers.get(id);
      if (handler) {
        const event = new KeyboardEvent('keydown');
        handler(event);
      }
    },
    [store.handlers]
  );
  
  // 上下文值
  const contextValue = useMemo<ShortcutContextValue>(() => ({
    enabled: store.enabled,
    register: store.register,
    unregister: store.unregister,
    trigger,
    getAll: store.getAll,
    formatDisplay: formatShortcutForDisplay,
    platformModifier: getPlatformModifier(),
  }), [store.enabled, store.register, store.unregister, trigger, store.getAll]);
  
  return (
    <ShortcutContext.Provider value={contextValue}>
      {children}
    </ShortcutContext.Provider>
  );
}

/**
 * 使用快捷键上下文 Hook
 */
export function useShortcutContext(): ShortcutContextValue {
  const context = useContext(ShortcutContext);
  if (!context) {
    throw new Error('useShortcutContext must be used within ShortcutProvider');
  }
  return context;
}

/**
 * 注册快捷键 Hook
 * 组件卸载时自动注销
 */
export function useRegisterShortcut(shortcut: KeyboardShortcut): void {
  const { register, unregister } = useShortcutContext();
  
  useEffect(() => {
    register(shortcut);
    return () => unregister(shortcut.id);
  }, [shortcut, register, unregister]);
}

/**
 * 批量注册快捷键 Hook
 */
export function useRegisterShortcuts(shortcuts: KeyboardShortcut[]): void {
  const { register, unregister } = useShortcutContext();
  
  useEffect(() => {
    shortcuts.forEach(s => register(s));
    return () => shortcuts.forEach(s => unregister(s.id));
  }, [shortcuts, register, unregister]);
}

export default ShortcutProvider;