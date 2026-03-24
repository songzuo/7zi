/**
 * Remote Selection Highlight Component
 *
 * Displays text selections from other collaborating users in real-time
 * Shows colored highlights with user labels
 */

'use client';

import type { FC, ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface RemoteSelection {
  userId: string;
  userName: string;
  color: string;
  selection: {
    start: number;
    end: number;
  };
}

interface RemoteSelectionProps {
  selection: RemoteSelection;
  currentUserId: string;
}

// ============================================================================
// Component
// ============================================================================

export function RemoteSelectionHighlight({
  selection,
  currentUserId,
}: RemoteSelectionProps) {
  // Don't show selection for current user
  if (selection.userId === currentUserId) {
    return null;
  }

  return (
    <span
      className="relative inline-block px-0.5"
      style={{
        backgroundColor: `${selection.color}33`, // 20% opacity
        borderBottom: `2px solid ${selection.color}`,
      }}
      title={`${selection.userName} is selecting this text`}
    >
      {/* User label tooltip */}
      <span
        className="absolute -top-6 left-0 px-2 py-0.5 text-white text-xs rounded whitespace-nowrap z-10"
        style={{
          backgroundColor: selection.color,
        }}
      >
        {selection.userName}
      </span>
    </span>
  );
}

// ============================================================================
// Selection Highlighter Component
// ============================================================================

interface SelectionHighlighterProps {
  content: string;
  selections: RemoteSelection[];
  currentUserId: string;
  className?: string;
}

export function SelectionHighlighter({
  content,
  selections,
  currentUserId,
  className = '',
}: SelectionHighlighterProps) {
  // Filter out current user's selections
  const remoteSelections = selections.filter(s => s.userId !== currentUserId);

  if (remoteSelections.length === 0) {
    return <span className={className}>{content}</span>;
  }

  // Sort selections by start position
  const sortedSelections = [...remoteSelections].sort(
    (a, b) => a.selection.start - b.selection.start
  );

  // Build highlighted content
  let lastIndex = 0;
  const parts: ReactNode[] = [];

  sortedSelections.forEach((sel) => {
    const { start, end } = sel.selection;

    // Add content before selection
    if (start > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {content.slice(lastIndex, start)}
        </span>
      );
    }

    // Add highlighted selection
    parts.push(
      <span
        key={`selection-${sel.userId}-${start}`}
        className="relative inline-block px-0.5"
        style={{
          backgroundColor: `${sel.color}33`, // 20% opacity
          borderBottom: `2px solid ${sel.color}`,
        }}
        title={`${sel.userName} is selecting this text`}
      >
        {content.slice(start, end)}

        {/* User label tooltip */}
        <span
          className="absolute -top-6 left-0 px-2 py-0.5 text-white text-xs rounded whitespace-nowrap z-10"
          style={{
            backgroundColor: sel.color,
          }}
        >
          {sel.userName}
        </span>
      </span>
    );

    lastIndex = end;
  });

  // Add remaining content
  if (lastIndex < content.length) {
    parts.push(
      <span key={`text-${lastIndex}`}>
        {content.slice(lastIndex)}
      </span>
    );
  }

  return <span className={className}>{parts}</span>;
}

// ============================================================================
// Cursor with Selection Component
// ============================================================================

interface CursorWithSelectionProps {
  cursor: {
    userId: string;
    userName: string;
    color: string;
    position: number;
    selection?: {
      start: number;
      end: number;
    };
  };
  currentUserId: string;
}

export function CursorWithSelection({
  cursor,
  currentUserId,
}: CursorWithSelectionProps) {
  if (cursor.userId === currentUserId) {
    return null;
  }

  return (
    <div className="relative">
      {/* Cursor caret */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${cursor.position}px`,
          top: 0,
          height: '1.25rem',
          width: '2px',
          backgroundColor: cursor.color,
          transform: 'translateY(-100%)',
        }}
      >
        {/* Cursor label */}
        <div
          className="absolute top-0 left-1 px-2 py-0.5 text-white text-xs rounded-t-sm whitespace-nowrap"
          style={{
            backgroundColor: cursor.color,
          }}
        >
          {cursor.userName}
        </div>
      </div>

      {/* Selection highlight */}
      {cursor.selection && (
        <div
          className="absolute pointer-events-none opacity-30"
          style={{
            left: `${Math.min(cursor.selection.start, cursor.selection.end)}px`,
            top: 0,
            height: '1.25rem',
            width: `${Math.abs(cursor.selection.end - cursor.selection.start)}px`,
            backgroundColor: cursor.color,
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Selection Manager Component
// ============================================================================

interface SelectionManagerProps {
  cursors: Map<string, {
    userId: string;
    userName: string;
    color: string;
    position: number;
    selection?: {
      start: number;
      end: number;
    };
  }>;
  currentUserId: string;
}

export function SelectionManager({
  cursors,
  currentUserId,
}: SelectionManagerProps) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from(cursors.values()).map((cursor) => (
        <CursorWithSelection
          key={cursor.userId}
          cursor={cursor}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Typing Indicator Component
// ============================================================================

interface TypingIndicatorProps {
  typingUsers: Array<{
    userId: string;
    userName: string;
    color: string;
  }>;
  currentUserId: string;
}

export function TypingIndicator({
  typingUsers,
  currentUserId,
}: TypingIndicatorProps) {
  const othersTyping = typingUsers.filter(u => u.userId !== currentUserId);

  if (othersTyping.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
            style={{
              animationDelay: `${i * 0.1}s`,
              animationDuration: '0.6s',
            }}
          />
        ))}
      </div>
      <span className="text-sm text-zinc-600 dark:text-zinc-400">
        {othersTyping.length === 1
          ? `${othersTyping[0].userName} is typing...`
          : `${othersTyping.length} people are typing...`}
      </span>
    </div>
  );
}

export default RemoteSelectionHighlight;
