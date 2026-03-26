/**
 * Task Editor with Collaboration Support
 *
 * Enhanced task editor that integrates real-time collaboration
 * features into the existing task management UI.
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useCollaboration } from '@/lib/websocket';
import { ConnectionStatus, UserList, RemoteCursor } from './ConnectionStatus';
import { TypingIndicator } from './RemoteSelection';

interface Task {
  id: string;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  assignee?: string;
  labels?: Array<{ name: string; color: string }>;
}

interface TaskEditorCollaborationProps {
  task: Task;
  token?: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  showCollaboration?: boolean; // Toggle collaboration features
}

export function TaskEditorCollaboration({
  task,
  token = '',
  userId = 'guest',
  userName = 'Guest User',
  userAvatar,
  onTaskUpdate,
  showCollaboration = true,
}: TaskEditorCollaborationProps) {
  const [content, setContent] = useState(task.body || '');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize collaboration if enabled
  const collaboration = useCollaboration({
    url: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000',
    token,
    userId,
    userName,
    userAvatar,
    roomType: 'task',
    documentId: String(task.id),
    autoConnect: showCollaboration,
  });

  // Join room when connected
  useEffect(() => {
    if (collaboration.isConnected && !collaboration.isInRoom && showCollaboration) {
      collaboration.joinRoom(
        `task:${task.id}`,
        'task',
        String(task.id),
        task.title
      );
    }

    return () => {
      if (collaboration.isInRoom) {
        collaboration.leaveRoom();
      }
    };
  }, [collaboration.isConnected, collaboration.isInRoom, task.id, task.title, collaboration, showCollaboration]);

  // Listen for document updates
  useEffect(() => {
    const unsubscribe = collaboration.onDocumentUpdate((updatedDoc) => {
      if (updatedDoc.revision > (collaboration.document?.revision || 0)) {
        setContent(updatedDoc.content);
        // Notify parent of update
        onTaskUpdate?.(task.id, { body: updatedDoc.content });
      }
    });

    return unsubscribe;
  }, [collaboration.document, collaboration, task.id, onTaskUpdate]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, []);

  // Handle cursor movement and selection
  const handleCursorChange = () => {
    if (!textareaRef.current) return;
    const newPosition = textareaRef.current.selectionStart;
    const selectionEnd = textareaRef.current.selectionEnd;
    setCursorPosition(newPosition);

    if (showCollaboration) {
      collaboration.moveCursor(newPosition, {
        start: Math.min(newPosition, selectionEnd),
        end: Math.max(newPosition, selectionEnd),
      });
    }
  };

  // Handle text input
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const oldContent = content;

    setContent(newContent);

    if (showCollaboration && collaboration.isConnected) {
      // Calculate and send operation
      const operation = calculateOperation(oldContent, newContent, cursorPosition);
      if (operation) {
        collaboration.sendOperation(operation);
      }

      // Update typing status
      collaboration.setTyping(true);

      // Clear typing status after 3 seconds of inactivity - properly clean up timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        collaboration.setTyping(false);
        typingTimeoutRef.current = null;
      }, 3000);
    }

    // Notify parent of changes (debounced in real implementation)
    onTaskUpdate?.(task.id, { body: newContent });
  };

  // Calculate operation to send to server
  const calculateOperation = (
    oldContent: string,
    newContent: string,
    position: number
  ) => {
    if (oldContent === newContent) {
      return null;
    }

    // Simple implementation: treat as insert or delete at cursor position
    if (newContent.length > oldContent.length) {
      // Insert operation
      const insertedContent = newContent.slice(position, position + (newContent.length - oldContent.length));
      return {
        type: 'insert' as const,
        position,
        content: insertedContent,
      };
    } else {
      // Delete operation
      const deletedLength = oldContent.length - newContent.length;
      return {
        type: 'delete' as const,
        position,
        length: deletedLength,
      };
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Collaboration Header */}
      {showCollaboration && (
        <div className="flex items-center justify-between p-3 border-b dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {task.title}
            </h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              #{task.number}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* User list */}
            <UserList users={collaboration.users} currentUserId={userId} />

            {/* Connection status */}
            <ConnectionStatus
              connectionState={collaboration.connectionState}
              isInRoom={collaboration.isInRoom}
              users={collaboration.users}
              typingUsers={collaboration.typingUsers}
              onReconnect={collaboration.reconnect}
            />
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 relative overflow-hidden">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInputChange}
          onSelect={handleCursorChange}
          onKeyUp={handleCursorChange}
          onClick={handleCursorChange}
          className="w-full h-full p-4 resize-none border-none focus:outline-none dark:bg-zinc-800 dark:text-white font-mono text-sm"
          placeholder="Add task description..."
          disabled={showCollaboration && (!collaboration.isConnected || !collaboration.isInRoom)}
        />

        {/* Remote cursors overlay */}
        {showCollaboration && collaboration.isConnected && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from(collaboration.cursors.values()).map((cursor) => (
              <RemoteCursor
                key={cursor.userId}
                cursor={cursor}
                currentUserId={userId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {showCollaboration && (
        <div className="p-3 border-t dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
            {collaboration.document && (
              <>
                <span>Revision: {collaboration.document.revision}</span>
                <span>Characters: {content.length}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {collaboration.typingUsers.length > 0 && (
              <TypingIndicator
                typingUsers={collaboration.users.filter(u =>
                  collaboration.typingUsers.includes(u.id)
                ).map(u => ({
                  userId: u.id,
                  userName: u.name,
                  color: u.color,
                }))}
                currentUserId={userId}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Collaboration Toggle Button
 *
 * Small button to enable/disable collaboration for a task
 */
interface CollaborationToggleProps {
  isCollaborating: boolean;
  onToggle: () => void;
  userCount?: number;
}

export function CollaborationToggle({
  isCollaborating,
  onToggle,
  userCount = 0,
}: CollaborationToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        isCollaborating
          ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300'
      }`}
      title={isCollaborating ? 'Disable collaboration' : 'Enable collaboration'}
    >
      <span className={`w-2 h-2 rounded-full ${isCollaborating ? 'bg-green-500' : 'bg-zinc-400'}`} />
      <span>
        {isCollaborating ? `Collaborating (${userCount})` : 'Enable Collaboration'}
      </span>
    </button>
  );
}

/**
 * Collaboration Status Indicator
 *
 * Small indicator showing collaboration status
 */
interface CollaborationStatusProps {
  isConnected: boolean;
  isInRoom: boolean;
  userCount: number;
}

export function CollaborationStatus({
  isConnected,
  isInRoom,
  userCount,
}: CollaborationStatusProps) {
  if (!isConnected || !isInRoom) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      <span>{userCount} user{userCount !== 1 ? 's' : ''} editing</span>
    </div>
  );
}

export default TaskEditorCollaboration;
