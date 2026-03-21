/**
 * Real-time Task Editor
 *
 * Demonstrates multi-user collaboration features:
 * - Real-time document editing
 * - Remote cursor positions
 * - User presence indicators
 * - Typing status
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useCollaboration } from '@/lib/websocket';
import { ConnectionStatus, UserList, RemoteCursor } from './ConnectionStatus';
import type { Operation } from '@/lib/collaboration/manager';

interface TaskEditorProps {
  taskId: string;
  taskTitle: string;
  initialContent: string;
  token: string;
  userId: string;
  userName: string;
  userAvatar?: string;
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
  const [content, setContent] = useState(initialContent);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
  });

  // Join room when connected
  useEffect(() => {
    if (isConnected && !isInRoom) {
      joinRoom(`task:${taskId}`, 'task', taskId, taskTitle);
    }

    return () => {
      if (isInRoom) {
        leaveRoom();
      }
    };
  }, [isConnected, isInRoom, taskId, taskTitle, joinRoom, leaveRoom]);

  // Listen for document updates
  useEffect(() => {
    const unsubscribe = onDocumentUpdate((updatedDoc) => {
      if (updatedDoc.revision > (document?.revision || 0)) {
        setContent(updatedDoc.content);
      }
    });

    return unsubscribe;
  }, [document, onDocumentUpdate]);

  // Handle cursor movement and selection
  const handleCursorChange = () => {
    if (!textareaRef.current) return;
    const newPosition = textareaRef.current.selectionStart;
    const selectionEnd = textareaRef.current.selectionEnd;
    setCursorPosition(newPosition);

    // Send cursor position
    moveCursor(newPosition, {
      start: Math.min(newPosition, selectionEnd),
      end: Math.max(newPosition, selectionEnd),
    });

    // Selection update is handled automatically by moveCursor
  };

  // Handle text input
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const oldContent = content;

    setContent(newContent);

    // Calculate and send operation
    const operation = calculateOperation(oldContent, newContent, cursorPosition);
    if (operation) {
      sendOperation(operation);
    }

    // Update typing status
    setTyping(true);

    // Clear typing status after 3 seconds of inactivity
    setTimeout(() => {
      setTyping(false);
    }, 3000);
  };

  // Calculate operation to send to server
  const calculateOperation = (
    oldContent: string,
    newContent: string,
    position: number
  ): Operation | null => {
    if (oldContent === newContent) {
      return null;
    }

    // Simple implementation: treat as insert or delete at cursor position
    if (newContent.length > oldContent.length) {
      // Insert operation
      const insertedContent = newContent.slice(position, position + (newContent.length - oldContent.length));
      return {
        type: 'insert',
        position,
        content: insertedContent,
      };
    } else {
      // Delete operation
      const deletedLength = oldContent.length - newContent.length;
      return {
        type: 'delete',
        position,
        length: deletedLength,
      };
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
        <div>
          <h2 className="text-xl font-semibold">{taskTitle}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Task ID: {taskId}
          </p>
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

      {/* Editor */}
      <div className="flex-1 relative overflow-hidden">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInputChange}
          onSelect={handleCursorChange}
          onKeyUp={handleCursorChange}
          onClick={handleCursorChange}
          className="w-full h-full p-4 resize-none border-none focus:outline-none dark:bg-gray-800 dark:text-white"
          placeholder="Start typing to edit the task..."
          disabled={!isConnected || !isInRoom}
        />

        {/* Remote cursors overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from(cursors.values()).map((cursor) => (
            <RemoteCursor
              key={cursor.userId}
              cursor={cursor}
              currentUserId={userId}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
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
  );
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
    <div className="h-screen flex flex-col">
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
  );
}

export default TaskEditor;
