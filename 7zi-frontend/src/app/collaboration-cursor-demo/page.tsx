/**
 * Collaboration Cursor Demo Page
 *
 * v1.12.3 - 协作光标同步演示页面
 * 展示实时协作中的光标位置同步功能
 */

'use client'

import React, { useState, useEffect } from 'react'
import { CollabProvider, useCollab } from '@/features/collab'

/**
 * Demo Editor Component
 */
function DemoEditor() {
  const { remoteCursors, updateLocalCursor, isConnected } = useCollab()
  const [content, setContent] = useState('')

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    updateLocalCursor({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 dark:bg-gray-900">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
            协作光标同步演示
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            v1.12.3 - 实时协作编辑中的光标位置同步
          </p>
        </div>

        {/* Connection Status */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isConnected ? '已连接' : '未连接'}
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              在线用户: {remoteCursors.size + 1}
            </div>
          </div>
        </div>

        {/* Editor Area */}
        <div
          className="relative min-h-[500px] rounded-lg border-2 border-gray-300 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => updateLocalCursor({ x: -100, y: -100 })}
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="在此输入内容，移动鼠标查看光标同步效果..."
            className="h-full w-full resize-none border-none bg-transparent text-gray-900 outline-none dark:text-white"
            style={{ minHeight: '450px' }}
          />

          {/* Remote Cursors Info */}
          {remoteCursors.size > 0 && (
            <div className="absolute bottom-4 right-4 rounded-lg bg-white p-3 shadow-lg dark:bg-gray-800">
              <div className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                远程光标
              </div>
              {Array.from(remoteCursors.entries()).map(([userId, cursor]) => (
                <div
                  key={userId}
                  className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: cursor.user.color }}
                  />
                  <span>{cursor.user.name}</span>
                  <span className="text-xs text-gray-500">
                    ({Math.round(cursor.cursor.x)}, {Math.round(cursor.cursor.y)})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Features List */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
            <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
              ✨ 核心功能
            </h3>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>• 实时光标位置同步</li>
              <li>• 用户颜色区分</li>
              <li>• 用户名称显示</li>
              <li>• 平滑移动动画</li>
            </ul>
          </div>

          <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
            <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
              🚀 性能优化
            </h3>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>• 50ms 节流发送</li>
              <li>• React.memo 优化</li>
              <li>• CSS transition 动画</li>
              <li>• 自动清理超时光标</li>
            </ul>
          </div>
        </div>

        {/* Usage Example */}
        <div className="mt-8 rounded-lg bg-gray-900 p-6">
          <h3 className="mb-4 font-semibold text-white">使用示例</h3>
          <pre className="overflow-auto text-sm text-gray-300">
            {`import { CollabProvider, useCollab } from '@/features/collab'

function Editor() {
  const { remoteCursors, updateLocalCursor } = useCollab()

  return (
    <div onMouseMove={(e) => updateLocalCursor({ x: e.clientX, y: e.clientY })}>
      {/* 编辑器内容 */}
    </div>
  )
}

export default function Page() {
  return (
    <CollabProvider roomId="room-1" userId="user-123" userName="张三">
      <Editor />
    </CollabProvider>
  )
}`}
          </pre>
        </div>
      </div>
    </div>
  )
}

/**
 * Demo Page
 */
export default function CollaborationCursorDemoPage() {
  return (
    <CollabProvider
      roomId="cursor-demo-room"
      userId="demo-user"
      userName="演示用户"
      autoConnect={true}
    >
      <DemoEditor />
    </CollabProvider>
  )
}