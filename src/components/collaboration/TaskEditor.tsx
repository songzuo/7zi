/**
 * Real-time Task Editor
 *
 * Demonstrates multi-user collaboration features:
 * - Real-time document editing
 * - Remote cursor positions
 * - User presence indicators
 * - Typing status
 */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useCollaboration } from '@/lib/websocket'
import { ConnectionStatus, UserList, RemoteCursor } from './ConnectionStatus'
import type { Operation } from '@/lib/collaboration/manager'

interface TaskEditorProps {
  taskId: string
  taskTitle: string
  initialContent: string
  token: string
  userId: string
  userName: string
  userAvatar?: string
}

export function TaskEditor({
  taskId,
  taskTitle,
  initialContent,
  token,
  userId,
  userName,
  userAvatar,
}: TaskEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [cursorPosition, setCursorPosition] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Initialize collaboration
  const {
    connectionState,
    isConnected,
    isInRoom,
    users,
    cursors,
    document,
    typingUsers,
    connect,
    disconnect,
    reconnect,
    joinRoom,
    leaveRoom,
    sendOperation,
    moveCursor,
    setTyping,
    onDocumentUpdate,
  } = useCollaboration({
    url: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000',
    token,
    userId,
    userName,
    userAvatar,
    roomType: 'task',
    documentId: taskId,
    autoConnect: true,
  })

  // Join room when connected
  useEffect(() => {
    if (isConnected && !isInRoom) {
      joinRoom(`task:${taskId}`, 'task', taskId, taskTitle)
    }

    return () => {
      if (isInRoom) {
        leaveRoom()
      }
    }
  }, [isConnected, isInRoom, taskId, taskTitle, joinRoom, leaveRoom])

  // Listen for document updates
  useEffect(() => {
    const unsubscribe = onDocumentUpdate(updatedDoc => {
      if (updatedDoc.revision > (document?.revision || 0)) {
        setContent(updatedDoc.content)
      }
    })

    return unsubscribe
  }, [document, onDocumentUpdate])

  // Handle cursor movement and selection
  const handleCursorChange = () => {
    if (!textareaRef.current) return
    const newPosition = textareaRef.current.selectionStart
    const selectionEnd = textareaRef.current.selectionEnd
    setCursorPosition(newPosition)

    // Send cursor position
    moveCursor(newPosition, {
      start: Math.min(newPosition, selectionEnd),
      end: Math.max(newPosition, selectionEnd),
    })

    // Selection update is handled automatically by moveCursor
  }

  // Handle text input
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    const oldContent = content

    setContent(newContent)

    // Calculate and send operation
    const operation = calculateOperation(oldContent, newContent, cursorPosition)
    if (operation) {
      sendOperation(operation)
    }

    // Update typing status
    setTyping(true)

    // Clear typing status after 3 seconds of inactivity
    setTimeout(() => {
      setTyping(false)
    }, 3000)
  }

  // Calculate operation to send to server
  const calculateOperation = (
    oldContent: string,
    newContent: string,
    position: number
  ): Operation | null => {
    if (oldContent === newContent) {
      return null
    }

    // Simple implementation: treat as insert or delete at cursor position
    if (newContent.length > oldContent.length) {
      // Insert operation
      const insertedContent = newContent.slice(
        position,
        position + (newContent.length - oldContent.length)
      )
      return {
        type: 'insert',
        position,
        content: insertedContent,
      }
    } else {
      // Delete operation
      const deletedLength = oldContent.length - newContent.length
      return {
        type: 'delete',
        position,
        length: deletedLength,
      }
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4 dark:border-zinc-700">
        <div>
          <h2 className="text-xl font-semibold">{taskTitle}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Task ID: {taskId}</p>
        </div>

        <div className="flex items-center gap-4">
          {/* User list */}
          <UserList users={users} currentUserId={userId} />

          {/* Connection status */}
          <ConnectionStatus
            connectionState={connectionState}
            isInRoom={isInRoom}
            users={users}
            typingUsers={typingUsers}
            onReconnect={reconnect}
          />
        </div>
      </div>

      {/* Collaboration Banner - shows when collaborating */}
      {isInRoom && users.length > 1 && (
        <div className="border-b border-blue-200 bg-blue-50 px-4 py-2 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            <span>
              <strong>{users.length}</strong> people are collaborating on this task
            </span>
            <span className="mx-2 text-blue-400">•</span>
            <span className="text-blue-600 dark:text-blue-400">
              {users
                .filter(u => u.id !== userId)
                .map(u => u.name)
                .join(', ')}
              {users.filter(u => u.id !== userId).length > 0 ? ' and you' : 'you'}
            </span>
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="relative flex-1 overflow-hidden">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInputChange}
          onSelect={handleCursorChange}
          onKeyUp={handleCursorChange}
          onClick={handleCursorChange}
          className="h-full w-full resize-none border-none p-4 font-mono text-sm leading-relaxed focus:outline-none dark:bg-zinc-800 dark:text-white"
          placeholder="Start typing to edit the task..."
          disabled={!isConnected || !isInRoom}
          style={{
            backgroundColor: '#1f2937',
            color: '#f9fafb',
          }}
        />

        {/* Remote cursors overlay - positioned absolutely over textarea */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from(cursors.values()).map(cursor => {
            if (cursor.userId === userId) return null

            // Calculate cursor position based on textarea content
            const textarea = textareaRef.current
            if (!textarea) return null

            // Get cursor coordinates
            const cursorStyle = {
              position: 'absolute' as const,
              pointerEvents: 'none' as const,
              zIndex: 10,
            }

            return (
              <div key={cursor.userId} style={cursorStyle}>
                {/* Cursor caret */}
                <div
                  className="h-5 w-0.5 animate-pulse"
                  style={{ backgroundColor: cursor.color }}
                />
                {/* User label */}
                <div
                  className="rounded-t-sm px-2 py-0.5 text-xs whitespace-nowrap text-white"
                  style={{ backgroundColor: cursor.color, fontSize: '10px' }}
                >
                  {cursor.userName}
                </div>
              </div>
            )
          })}
        </div>

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="absolute right-4 bottom-4 rounded-lg bg-white px-3 py-2 shadow-lg dark:bg-zinc-700">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500"
                    style={{
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: '0.6s',
                    }}
                  />
                ))}
              </div>
              <span className="text-sm text-zinc-600 dark:text-zinc-300">
                {typingUsers.length === 1
                  ? `${typingUsers[0]} is typing...`
                  : `${typingUsers.length} people are typing...`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t p-4 dark:border-zinc-700">
        <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
          {document && (
            <>
              <span>Revision: {document.revision}</span>
              <span>Characters: {content.length}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {typingUsers.length > 0 && (
            <span className="text-sm text-blue-500 dark:text-blue-400">
              {typingUsers.length === 1
                ? `${typingUsers[0]} is typing...`
                : `${typingUsers.length} people are typing...`}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Task Editor Page Component
 * Full page wrapper for the task editor
 */
export function TaskEditorPage({
  taskId,
  taskTitle,
  initialContent,
  token,
  userId,
  userName,
  userAvatar,
}: TaskEditorProps) {
  return (
    <div className="flex h-screen flex-col">
      <TaskEditor
        taskId={taskId}
        taskTitle={taskTitle}
        initialContent={initialContent}
        token={token}
        userId={userId}
        userName={userName}
        userAvatar={userAvatar}
      />
    </div>
  )
}

export default TaskEditor
