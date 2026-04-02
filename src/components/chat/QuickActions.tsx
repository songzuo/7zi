/**
 * @fileoverview 快捷操作组件
 * @description 显示可快速点击的常用问题按钮
 */

'use client'

interface QuickActionsProps {
  actions: string[]
  onAction: (action: string) => void
}

/**
 * 快捷操作组件
 * @param actions - 快捷操作列表
 * @param onAction - 点击快捷操作的回调
 */
export function QuickActions({ actions, onAction }: QuickActionsProps) {
  return (
    <div className="border-t border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-2">
        {actions.map(action => (
          <button
            key={action}
            onClick={() => onAction(action)}
            className="flex-shrink-0 rounded-full bg-zinc-100 px-3 py-1.5 text-xs text-zinc-700 transition-colors hover:bg-cyan-100 hover:text-cyan-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-cyan-900/30 dark:hover:text-cyan-400"
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  )
}
