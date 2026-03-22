/**
 * Optimized Collaboration UI Components
 *
 * Demonstrates React.memo and performance best practices for collaboration features
 */

import React, { memo } from 'react';
import { Cursor } from '@/lib/collaboration/manager';
import type { RoomUser } from '@/lib/websocket/server';

// ============================================================================
// Memoized Components
// ============================================================================

interface RemoteCursorProps {
  userId: string;
  userName: string;
  color: string;
  position: number;
  selection?: { start: number; end: number };
}

/**
 * RemoteCursor - memoized to prevent re-renders when other cursors change
 * Only re-renders when its own props change
 */
export const RemoteCursor = memo<RemoteCursorProps>(({
  userId,
  userName,
  color,
  position,
  selection,
}) => {
  // Calculate cursor position (simplified example)
  const left = (position % 80) * 10;
  const top = Math.floor(position / 80) * 20;

  return (
    <div
      className="absolute pointer-events-none transition-all duration-75 ease-out"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        zIndex: 1000,
      }}
    >
      {/* Cursor flag */}
      <div
        className="px-2 py-1 rounded text-xs text-white whitespace-nowrap"
        style={{ backgroundColor: color }}
      >
        {userName}
      </div>
      {/* Cursor indicator */}
      <div
        className="w-0.5 h-4"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to only re-render when position/selection actually changes
  return (
    prevProps.position === nextProps.position &&
    prevProps.selection?.start === nextProps.selection?.start &&
    prevProps.selection?.end === nextProps.selection?.end
  );
});

RemoteCursor.displayName = 'RemoteCursor';

// ============================================================================
// User List Item
// ============================================================================

interface UserListItemProps {
  user: RoomUser;
  isCurrentUser?: boolean;
  onClick?: () => void;
}

/**
 * UserListItem - memoized with shallow comparison
 */
export const UserListItem = memo<UserListItemProps>(({ user, isCurrentUser, onClick }) => {
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded hover:bg-gray-100 cursor-pointer ${
        isCurrentUser ? 'bg-blue-50' : ''
      }`}
      onClick={onClick}
    >
      <div
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: user.color }}
      />
      <div className="flex-1">
        <div className="text-sm font-medium">
          {user.name}
          {isCurrentUser && ' (You)'}
        </div>
        {user.isTyping && (
          <div className="text-xs text-gray-500">Typing...</div>
        )}
      </div>
      {user.lastActivity && (
        <div className="text-xs text-gray-400">
          {formatLastActivity(user.lastActivity)}
        </div>
      )}
    </div>
  );
});

UserListItem.displayName = 'UserListItem';

function formatLastActivity(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return `${Math.floor(diffMins / 1440)}d ago`;
}

// ============================================================================
// Collaboration Status Bar
// ============================================================================

interface CollaborationStatusBarProps {
  isConnected: boolean;
  userCount: number;
  documentRevision: number;
  lastSyncTime?: Date;
}

/**
 * CollaborationStatusBar - memoized to prevent frequent re-renders
 */
export const CollaborationStatusBar = memo<CollaborationStatusBarProps>(({
  isConnected,
  userCount,
  documentRevision,
  lastSyncTime,
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t text-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-gray-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="text-gray-500">
          {userCount} user{userCount !== 1 ? 's' : ''} in room
        </div>
      </div>
      <div className="flex items-center gap-4 text-gray-500">
        <div>Revision: {documentRevision}</div>
        {lastSyncTime && (
          <div>Last sync: {formatLastActivity(lastSyncTime)}</div>
        )}
      </div>
    </div>
  );
});

CollaborationStatusBar.displayName = 'CollaborationStatusBar';

// ============================================================================
// Typing Indicator
// ============================================================================

interface TypingIndicatorProps {
  typingUsers: Array<{ id: string; name: string }>;
}

/**
 * TypingIndicator - memoized with stable prop comparison
 */
export const TypingIndicator = memo<TypingIndicatorProps>(({ typingUsers }) => {
  if (typingUsers.length === 0) {
    return null;
  }

  const names = typingUsers.map(u => u.name).join(', ');

  return (
    <div className="fixed bottom-4 left-4 px-4 py-2 bg-gray-800 text-white rounded-lg shadow-lg text-sm animate-pulse">
      {typingUsers.length === 1 ? (
        <span>{names} is typing...</span>
      ) : (
        <span>{names} are typing...</span>
      )}
    </div>
  );
});

TypingIndicator.displayName = 'TypingIndicator';

// ============================================================================
// Export
// ============================================================================

export default {
  RemoteCursor,
  UserListItem,
  CollaborationStatusBar,
  TypingIndicator,
};
