/**
 * @fileoverview Undo-Redo Example Page
 * @description Demo page showing undo-redo functionality
 */

'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { UndoRedo, HistoryViewer } from '@/components/undo-redo'
import { Input } from '@/components/ui/Input'
import { useUndoRedo } from '@/lib/undo-redo'
import { createHistoryEntry, pushOperation } from '@/lib/undo-redo'
import { Undo2, Redo2, Plus, Trash2, RefreshCw } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface TodoItem {
  id: string
  text: string
  completed: boolean
}

// ============================================================================
// Main Component
// ============================================================================

export default function UndoRedoExamplePage() {
  // All hooks must be called at the top level
  const [todos, setTodos] = useState<TodoItem[]>([
    { id: '1', text: '学习 Zustand', completed: true },
    { id: '2', text: '实现 Undo-Redo 功能', completed: false },
    { id: '3', text: '编写测试用例', completed: false },
  ])
  const [newTodo, setNewTodo] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const { undo, redo, canUndo, canRedo } = useUndoRedo()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true)
  }, [])

  // Skip SSR
  if (!isMounted) {
    return null
  }

  // Add todo with undo-redo
  const addTodo = () => {
    if (!newTodo.trim()) return

    const todo: TodoItem = {
      id: crypto.randomUUID(),
      text: newTodo,
      completed: false,
    }

    setTodos(prev => [...prev, todo])

    pushOperation(
      'create',
      `添加待办事项: ${todo.text}`,
      () => {
        setTodos(prev => prev.filter(t => t.id !== todo.id))
      },
      () => {
        setTodos(prev => [...prev, todo])
      }
    )

    setNewTodo('')
  }

  // Delete todo with undo-redo
  const deleteTodo = (id: string, text: string) => {
    setTodos(prev => prev.filter(t => t.id !== id))

    pushOperation(
      'delete',
      `删除待办事项: ${text}`,
      () => {
        setTodos(prev => [...prev, { id, text, completed: false }])
      },
      () => {
        setTodos(prev => prev.filter(t => t.id !== id))
      }
    )
  }

  // Toggle todo with undo-redo
  const toggleTodo = (id: string, text: string) => {
    const previousState = todos.find(t => t.id === id)
    if (!previousState) return

    const newCompleted = !previousState.completed

    setTodos(prev => prev.map(t => (t.id === id ? { ...t, completed: newCompleted } : t)))

    pushOperation(
      'update',
      `切换状态: ${text}`,
      () => {
        setTodos(prev =>
          prev.map(t => (t.id === id ? { ...t, completed: previousState.completed } : t))
        )
      },
      () => {
        setTodos(prev => prev.map(t => (t.id === id ? { ...t, completed: newCompleted } : t)))
      }
    )
  }

  // Clear all todos with undo-redo
  const clearAllTodos = () => {
    const previousTodos = [...todos]

    setTodos([])

    pushOperation(
      'delete',
      `清空所有待办事项 (${previousTodos.length} 条)`,
      () => {
        setTodos(previousTodos)
      },
      () => {
        setTodos([])
      }
    )
  }

  // Bulk operations with grouping
  const markAllComplete = () => {
    const incompleteTodos = todos.filter(t => !t.completed)

    if (incompleteTodos.length === 0) return

    const previousStates = incompleteTodos.map(t => ({
      id: t.id,
      completed: t.completed,
    }))

    setTodos(prev => prev.map(t => ({ ...t, completed: true })))

    const manager = createHistoryEntry(
      'update',
      `批量标记完成 (${incompleteTodos.length} 条)`,
      () => {
        setTodos(prev =>
          prev.map(t => {
            const previousState = previousStates.find(ps => ps.id === t.id)
            return previousState ? { ...t, completed: previousState.completed } : t
          })
        )
      },
      () => {
        setTodos(prev => prev.map(t => ({ ...t, completed: true })))
      }
    )

    pushOperation(manager.type, manager.description, manager.undo!, manager.redo!)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 dark:from-slate-900 dark:to-slate-800">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
            Undo-Redo 功能演示
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            完整的撤销/重做功能，支持历史记录、操作分组和键盘快捷键
          </p>

          {/* Undo-Redo Controls */}
          <div className="flex items-center justify-center gap-4">
            <UndoRedo size="lg" variant="primary" showCount showTooltips />
            <span className="text-muted-foreground text-sm">快捷键: Ctrl+Z / Ctrl+Y</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Todo List */}
          <Card className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">待办事项列表</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllComplete}
                  disabled={todos.filter(t => !t.completed).length === 0}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  全部完成
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllTodos}
                  disabled={todos.length === 0}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  清空
                </Button>
              </div>
            </div>

            {/* Add Todo Input */}
            <div className="mb-6 flex gap-2">
              <Input
                placeholder="添加新的待办事项..."
                value={newTodo}
                onChange={e => setNewTodo(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    addTodo()
                  }
                }}
              />
              <Button onClick={addTodo} disabled={!newTodo.trim()}>
                <Plus className="mr-2 h-4 w-4" />
                添加
              </Button>
            </div>

            {/* Todo List */}
            <div className="space-y-2">
              {todos.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">暂无待办事项</div>
              ) : (
                todos.map(todo => (
                  <div
                    key={todo.id}
                    className="bg-card hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-3 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => toggleTodo(todo.id, todo.text)}
                      className="h-4 w-4"
                    />
                    <span
                      className={`flex-1 ${
                        todo.completed ? 'text-muted-foreground line-through' : ''
                      }`}
                    >
                      {todo.text}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTodo(todo.id, todo.text)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* History Viewer */}
          <div className="space-y-6">
            <HistoryViewer
              maxHeight="500px"
              showTimestamp
              showUser={false}
              showBadges
              compact={false}
            />
          </div>
        </div>

        {/* Feature List */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">功能特性</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 font-medium">
                <Undo2 className="text-primary h-5 w-5" />
                撤销/重做
              </h3>
              <p className="text-muted-foreground text-sm">完整的撤销和重做功能，支持多步操作</p>
            </div>
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 font-medium">📝 历史记录</h3>
              <p className="text-muted-foreground text-sm">详细的操作历史，可查看每一步的变化</p>
            </div>
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 font-medium">⌨️ 键盘快捷键</h3>
              <p className="text-muted-foreground text-sm">支持 Ctrl+Z 撤销和 Ctrl+Y 重做</p>
            </div>
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 font-medium">📦 操作分组</h3>
              <p className="text-muted-foreground text-sm">批量操作可自动分组，一次性撤销</p>
            </div>
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 font-medium">💾 导入导出</h3>
              <p className="text-muted-foreground text-sm">支持历史记录的导入和导出</p>
            </div>
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 font-medium">🔧 Zustand 集成</h3>
              <p className="text-muted-foreground text-sm">可作为 Zustand 中间件使用</p>
            </div>
          </div>
        </Card>

        {/* Usage Example */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">代码示例</h2>
          <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
            <code>{`// 1. 创建带 Undo-Redo 的 Store
import { create } from 'zustand';
import { undoRedo } from '@/lib/undo-redo/middleware';

const useStore = create<StoreState>()(
  undoRedo(
    devtools((set, get) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
      decrement: () => set((state) => ({ count: state.count - 1 })),
    })),
    { maxHistorySize: 50 }
  )
);

// 2. 使用 Undo-Redo
const { undo, redo, canUndo, canRedo } = useStore.getState();
undo(); // 撤销
redo(); // 重做

// 3. 在组件中使用
import { UndoRedo } from '@/components/undo-redo';

<UndoRedo showCount showTooltips />

// 4. 手动记录操作
import { pushOperation } from '@/lib/undo-redo';

pushOperation(
  'update',
  '更新用户状态',
  () => undoFunction(),
  () => redoFunction()
);`}</code>
          </pre>
        </Card>
      </div>
    </div>
  )
}
