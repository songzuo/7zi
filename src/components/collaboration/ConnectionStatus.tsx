/**
 * Connection Status Indicator
 *
 * Displays the current WebSocket connection status
 * Shows online users and typing indicators
 */

'use client';

import type { ConnectionState } from '@/lib/websocket';
import type { RoomUser } from '@/lib/websocket/types';
import type { FC } from 'react';

interface ConnectionStatusProps {
  connectionState: ConnectionState;
  isInRoom?: boolean;
  users?: RoomUser[];
  typingUsers?: string[];
  onReconnect?: () => void;
}

export function ConnectionStatus({
  connectionState,
  isInRoom = false,
  users = [],
  typingUsers = [],
  onReconnect,
}: ConnectionStatusProps) {
  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
      case 'reconnecting':
        return 'bg-yellow-500';
      case 'disconnected':
        return 'bg-zinc-400';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-zinc-400';
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  };

  const activeUsers = users.filter(
    (u) => new Date().getTime() - u.lastActivity.getTime() < 5 * 60 * 1000
  );

  return (
    <div className="flex items-center gap-2 text-sm">
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`} />
        <span className="text-zinc-600 dark:text-zinc-400">
          {getStatusText()}
        </span>
      </div>

      {/* Room info */}
      {isInRoom && (
        <>
          <span className="text-zinc-300 dark:text-zinc-700">|</span>
          <div className="flex items-center gap-2">
            <span className="text-zinc-600 dark:text-zinc-400">
              {activeUsers.length} {activeUsers.length === 1 ? 'user' : 'users'}
            </span>
          </div>
        </>
      )}

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <>
          <span className="text-zinc-300 dark:text-zinc-700">|</span>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '0.6s',
                  }}
                />
              ))}
            </div>
            <span className="text-zinc-600 dark:text-zinc-400">
              {typingUsers.length === 1
                ? `${typingUsers[0]} is typing...`
                : `${typingUsers.length} people are typing...`}
            </span>
          </div>
        </>
      )}

      {/* Reconnect button */}
      {connectionState === 'disconnected' || connectionState === 'error' ? (
        <button
          onClick={onReconnect}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Reconnect
        </button>
      ) : null}
    </div>
  );
}

interface UserListProps {
  users: RoomUser[];
  currentUserId?: string;
}

export function UserList({ users, currentUserId }: UserListProps) {
  const activeUsers = users.filter(
    (u) => new Date().getTime() - u.lastActivity.getTime() < 5 * 60 * 1000
  );

  if (activeUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      {activeUsers.map((user) => (
        <div
          key={user.id}
          className="flex items-center gap-1"
          title={`${user.name} ${user.id === currentUserId ? '(you)' : ''}`}
        >
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-6 h-6 rounded-full border-2"
              style={{ borderColor: user.color }}
            />
          ) : (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium border-2"
              style={{ backgroundColor: user.color, borderColor: user.color }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface RemoteCursorProps {
  cursor: {
    userId: string;
    userName: string;
    position: number;
    selection?: { start: number; end: number };
    color: string;
  };
  currentUserId: string;
}

export function RemoteCursor({ cursor, currentUserId }: RemoteCursorProps) {
  if (cursor.userId === currentUserId) {
    return null;
  }

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${cursor.position}px`,
        top: 0,
        transform: 'translateY(-100%)',
      }}
    >
      {/* Cursor caret */}
      <div
        className="w-0.5 h-5"
        style={{ backgroundColor: cursor.color }}
      />

      {/* Cursor label */}
      <div
        className="px-2 py-0.5 text-white text-xs rounded-t-sm whitespace-nowrap"
        style={{ backgroundColor: cursor.color }}
      >
        {cursor.userName}
      </div>

      {/* Selection highlight */}
      {cursor.selection && (
        <div
          className="absolute h-5 opacity-30"
          style={{
            left: 0,
            top: 0,
            width: `${cursor.selection.end - cursor.selection.start}px`,
            backgroundColor: cursor.color,
          }}
        />
      )}
    </div>
  );
}
