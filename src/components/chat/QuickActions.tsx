/**
 * @fileoverview 快捷操作组件
 * @description 显示可快速点击的常用问题按钮
 */

'use client';

interface QuickActionsProps {
  actions: string[];
  onAction: (action: string) => void;
}

/**
 * 快捷操作组件
 * @param actions - 快捷操作列表
 * @param onAction - 点击快捷操作的回调
 */
export function QuickActions({ actions, onAction }: QuickActionsProps) {
  return (
    <div className="px-4 py-2 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {actions.map((action) => (
          <button
            key={action}
            onClick={() => onAction(action)}
            className="flex-shrink-0 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 text-zinc-700 dark:text-zinc-300 hover:text-cyan-600 dark:hover:text-cyan-400 rounded-full text-xs transition-colors"
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}