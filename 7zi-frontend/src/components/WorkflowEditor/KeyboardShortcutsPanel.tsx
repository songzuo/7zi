/**
 * 快捷键面板组件
 *
 * 🎨 设计师: Designer
 * 创建日期: 2026-04-03
 * 版本: v1.10.0
 *
 * 显示所有可用的快捷键
 */

import React, { useState } from 'react'
import { X, Keyboard, Search } from 'lucide-react'
import { KEYBOARD_SHORTCUTS } from './constants'

interface ShortcutCategory {
  name: string
  shortcuts: Array<{
    key: string
    description: string
    icon?: string
  }>
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    name: '基础操作',
    shortcuts: [
      { key: KEYBOARD_SHORTCUTS.SAVE, description: '保存工作流', icon: '💾' },
      { key: KEYBOARD_SHORTCUTS.RUN, description: '运行工作流', icon: '▶️' },
      { key: KEYBOARD_SHORTCUTS.VALIDATE, description: '验证工作流', icon: '✓' },
      { key: KEYBOARD_SHORTCUTS.UNDO, description: '撤销', icon: '↩️' },
      { key: KEYBOARD_SHORTCUTS.REDO, description: '重做', icon: '↪️' },
    ],
  },
  {
    name: '编辑操作',
    shortcuts: [
      { key: KEYBOARD_SHORTCUTS.DELETE, description: '删除选中项', icon: '🗑️' },
      { key: KEYBOARD_SHORTCUTS.COPY, description: '复制', icon: '📋' },
      { key: KEYBOARD_SHORTCUTS.PASTE, description: '粘贴', icon: '📄' },
      { key: KEYBOARD_SHORTCUTS.DUPLICATE, description: '复制节点', icon: '👥' },
      { key: KEYBOARD_SHORTCUTS.SELECT_ALL, description: '全选', icon: '🔲' },
    ],
  },
  {
    name: '视图操作',
    shortcuts: [
      { key: KEYBOARD_SHORTCUTS.ZOOM_IN, description: '放大', icon: '🔍' },
      { key: KEYBOARD_SHORTCUTS.ZOOM_OUT, description: '缩小', icon: '🔍' },
      { key: KEYBOARD_SHORTCUTS.ZOOM_RESET, description: '重置缩放', icon: '🎯' },
      { key: KEYBOARD_SHORTCUTS.FIT_VIEW, description: '适应视图', icon: '📐' },
      { key: KEYBOARD_SHORTCUTS.AUTO_LAYOUT, description: '自动布局', icon: '📊' },
    ],
  },
  {
    name: '文件操作',
    shortcuts: [
      { key: KEYBOARD_SHORTCUTS.EXPORT, description: '导出工作流', icon: '📤' },
      { key: KEYBOARD_SHORTCUTS.IMPORT, description: '导入工作流', icon: '📥' },
      { key: KEYBOARD_SHORTCUTS.FIND, description: '搜索节点', icon: '🔎' },
    ],
  },
  {
    name: '其他操作',
    shortcuts: [
      { key: 'Escape', description: '取消选择', icon: '⎋' },
      { key: 'Ctrl+Shift+Z', description: '重做（备选）', icon: '↪️' },
      { key: 'Shift+Click', description: '多选节点', icon: '🖱️' },
      { key: 'Ctrl+Click', description: '添加到选择', icon: '🖱️' },
      { key: 'Space+Drag', description: '平移画布', icon: '🖐️' },
    ],
  },
]

interface KeyboardShortcutsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export const KeyboardShortcutsPanel: React.FC<KeyboardShortcutsPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('')

  if (!isOpen) return null

  // 过滤快捷键
  const filteredCategories = SHORTCUT_CATEGORIES.map((category) => ({
    ...category,
    shortcuts: category.shortcuts.filter(
      (shortcut) =>
        shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shortcut.key.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((category) => category.shortcuts.length > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-800">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Keyboard className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              键盘快捷键
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 搜索框 */}
        <div className="border-b border-gray-200 px-6 py-3 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索快捷键..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* 快捷键列表 */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {filteredCategories.map((category) => (
            <div key={category.name} className="mb-6 last:mb-0">
              <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                {category.name}
              </h3>
              <div className="grid gap-2">
                {category.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2 dark:bg-gray-700/50"
                  >
                    <div className="flex items-center gap-2">
                      {shortcut.icon && (
                        <span className="text-base">{shortcut.icon}</span>
                      )}
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {shortcut.description}
                      </span>
                    </div>
                    <kbd className="rounded bg-gray-200 px-2 py-1 text-xs font-mono text-gray-800 dark:bg-gray-600 dark:text-gray-200">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              未找到匹配的快捷键
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="border-t border-gray-200 px-6 py-3 dark:border-gray-700">
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            按 <kbd className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-700">?</kbd> 显示此面板
          </p>
        </div>
      </div>
    </div>
  )
}

export default KeyboardShortcutsPanel