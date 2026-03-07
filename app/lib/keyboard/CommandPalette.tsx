/**
 * 命令面板组件
 * 类似 VS Code 的命令面板，支持搜索和执行命令
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { useShortcutStore, formatShortcutForDisplay, getPlatformModifier } from './shortcut-store';
import { useShortcutContext } from './ShortcutProvider';

// ============================================================================
// 类型定义
// ============================================================================

/** 命令项 */
export interface CommandItem {
  /** 唯一标识 */
  id: string;
  /** 显示标题 */
  title: string;
  /** 描述 */
  description?: string;
  /** 图标 */
  icon?: React.ReactNode;
  /** 分组 */
  group?: string;
  /** 快捷键 */
  shortcut?: string[];
  /** 是否禁用 */
  disabled?: boolean;
  /** 执行函数 */
  action: () => void;
}

/** 命令面板 Props */
interface CommandPaletteProps {
  /** 是否打开 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 额外命令 */
  commands?: CommandItem[];
  /** 标题 */
  title?: string;
  /** 占位符 */
  placeholder?: string;
}

// ============================================================================
// 命令项组件
// ============================================================================

interface CommandItemProps {
  item: CommandItem;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}

const CommandItemComponent = memo(function CommandItemComponent({
  item,
  isSelected,
  onClick,
  onMouseEnter,
}: CommandItemProps) {
  return (
    <button
      role="option"
      aria-selected={isSelected}
      disabled={item.disabled}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`
        w-full flex items-center gap-3 px-4 py-3 text-left
        transition-colors rounded-lg
        ${
          item.disabled
            ? 'opacity-50 cursor-not-allowed'
            : isSelected
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
        }
      `}
    >
      {/* 图标 */}
      {item.icon && (
        <span className="flex-shrink-0 text-lg" aria-hidden="true">
          {item.icon}
        </span>
      )}
      
      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 dark:text-white truncate">
          {item.title}
        </div>
        {item.description && (
          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {item.description}
          </div>
        )}
      </div>
      
      {/* 快捷键 */}
      {item.shortcut && item.shortcut.length > 0 && (
        <kbd className="flex-shrink-0 hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
          {formatShortcutForDisplay(item.shortcut)}
        </kbd>
      )}
    </button>
  );
});

// ============================================================================
// 命令面板组件
// ============================================================================

export function CommandPalette({
  isOpen,
  onClose,
  commands = [],
  title = '命令面板',
  placeholder = '搜索命令...',
}: CommandPaletteProps): JSX.Element | null {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  const store = useShortcutStore();

  // 合并命令
  const allCommands = useMemo<CommandItem[]>(() => {
    // 从快捷键存储生成命令
    const shortcutCommands: CommandItem[] = store.getAll().map(shortcut => ({
      id: shortcut.id,
      title: shortcut.description,
      group: shortcut.group,
      shortcut: shortcut.keys,
      action: () => {
        shortcut.handler(new KeyboardEvent('keydown'));
        onClose();
      },
    }));
    
    return [...shortcutCommands, ...commands];
  }, [store, commands, onClose]);
  
  // 过滤命令
  const filteredCommands = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return allCommands;
    
    return allCommands.filter(cmd => {
      const titleMatch = cmd.title.toLowerCase().includes(query);
      const descMatch = cmd.description?.toLowerCase().includes(query) ?? false;
      const groupMatch = cmd.group?.toLowerCase().includes(query) ?? false;
      return titleMatch || descMatch || groupMatch;
    });
  }, [allCommands, search]);
  
  // 分组
  const groupedCommands = useMemo(() => {
    const groups = new Map<string, CommandItem[]>();
    
    filteredCommands.forEach(cmd => {
      const group = cmd.group || '其他';
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)!.push(cmd);
    });
    
    return groups;
  }, [filteredCommands]);
  
  // 重置选中索引
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);
  
  // 聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);
  
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
  
  // 执行选中命令
  const executeSelected = useCallback(() => {
    const cmd = filteredCommands[selectedIndex];
    if (cmd && !cmd.disabled) {
      cmd.action();
      onClose();
    }
  }, [filteredCommands, selectedIndex, onClose]);
  
  // 键盘导航
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
          
        case 'Enter':
          e.preventDefault();
          executeSelected();
          break;
          
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredCommands.length, executeSelected, onClose]
  );
  
  // 点击背景关闭
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );
  
  // 计算全局索引偏移
  const getGlobalIndex = useCallback((groupIndex: number, itemIndex: number) => {
    let offset = 0;
    const groups = Array.from(groupedCommands.entries());
    
    for (let i = 0; i < groupIndex; i++) {
      offset += groups[i][1].length;
    }
    
    return offset + itemIndex;
  }, [groupedCommands]);
  
  if (!isOpen) return null;
  
  const content = (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="command-palette-title"
    >
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* 面板 */}
      <div className="relative w-full max-w-xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
        {/* 搜索框 */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <svg
            className="w-5 h-5 text-gray-400"
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
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400"
            aria-label={placeholder}
          />
          <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
            ESC
          </kbd>
        </div>
        
        {/* 命令列表 */}
        <div
          ref={listRef}
          className="max-h-[50vh] overflow-y-auto py-2"
          role="listbox"
        >
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              未找到匹配的命令
            </div>
          ) : (
            Array.from(groupedCommands.entries()).map(([group, items], groupIndex) => (
              <div key={group} className="mb-2 last:mb-0">
                {/* 分组标题 */}
                <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {group}
                </div>
                
                {/* 命令项 */}
                {items.map((item, itemIndex) => {
                  const globalIndex = getGlobalIndex(groupIndex, itemIndex);
                  return (
                    <CommandItemComponent
                      key={item.id}
                      item={item}
                      isSelected={globalIndex === selectedIndex}
                      onClick={() => {
                        if (!item.disabled) {
                          item.action();
                          onClose();
                        }
                      }}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                    />
                  );
                })}
              </div>
            ))
          )}
        </div>
        
        {/* 底部提示 */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↑↓</kbd>
              <span>导航</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Enter</kbd>
              <span>选择</span>
            </span>
          </div>
          <span>{filteredCommands.length} 个命令</span>
        </div>
      </div>
    </div>
  );
  
  return createPortal(content, document.body);
}

/**
 * 命令面板触发按钮
 */
export function CommandPaletteTrigger({
  onClick,
  className = '',
}: {
  onClick: () => void;
  className?: string;
}): JSX.Element {
  const platformModifier = getPlatformModifier();
  
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-2 px-3 py-2
        text-gray-600 dark:text-gray-300
        bg-white dark:bg-gray-800
        border border-gray-200 dark:border-gray-700
        rounded-lg shadow-sm
        hover:bg-gray-50 dark:hover:bg-gray-700
        transition-colors
        ${className}
      `}
      title="打开命令面板"
    >
      <svg
        className="w-4 h-4"
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
      <span className="hidden sm:inline text-sm">搜索命令</span>
      <kbd className="hidden md:inline-flex items-center gap-0.5 text-xs text-gray-400">
        {platformModifier === 'meta' ? '⌘' : 'Ctrl'}+K
      </kbd>
    </button>
  );
}

/**
 * 命令面板 Hook
 */
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  
  return {
    isOpen,
    open,
    close,
    toggle,
    bind: {
      isOpen,
      onClose: close,
    },
  };
}

export default CommandPalette;