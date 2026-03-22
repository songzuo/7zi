/**
 * @fileoverview History Viewer Component
 * @description Displays undo-redo history as a list with details
 */

'use client';

import { Undo2, Redo2, Clock, User, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Tooltip } from '@/components/ui/Tooltip';
import { useUndoRedo } from '@/lib/undo-redo';
import type { HistoryEntry as LibHistoryEntry } from '@/lib/undo-redo/types';
import { cn } from '@/lib/utils';
import { useState } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * History entry type (extends the library type with index signature for flexibility)
 */
export interface HistoryEntry extends LibHistoryEntry {
  [key: string]: unknown;
}

export interface HistoryViewerProps {
  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Max height of the history list
   * @default '400px'
   */
  maxHeight?: string;

  /**
   * Show timestamps
   * @default true
   */
  showTimestamp?: boolean;

  /**
   * Show user information
   * @default true
   */
  showUser?: boolean;

  /**
   * Show action type badges
   * @default true
   */
  showBadges?: boolean;

  /**
   * Compact mode
   * @default false
   */
  compact?: boolean;

  /**
   * On entry click handler
   */
  onEntryClick?: (entry: HistoryEntry, index: number) => void;

  /**
   * Custom render function for history entries
   */
  renderEntry?: (entry: HistoryEntry, index: number, isCurrent: boolean) => React.ReactNode;

  /**
   * Filter function
   */
  filter?: (entry: HistoryEntry) => boolean;
}

// ============================================================================
// Component
// ============================================================================

export function HistoryViewer({
  className,
  maxHeight = '400px',
  showTimestamp = true,
  showUser = true,
  showBadges = true,
  compact = false,
  onEntryClick,
  renderEntry,
  filter,
}: HistoryViewerProps) {
  const { history, currentIndex, canUndo, canRedo, undo, redo } = useUndoRedo();
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);

  // Filter history
  const filteredHistory = filter
    ? (history as HistoryEntry[]).filter(filter)
    : (history as HistoryEntry[]);

  // Format timestamp
  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Format full timestamp
  const formatFullTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Helper to safely access group data
  const getGroupEntriesCount = (entry: HistoryEntry): number | null => {
    if (entry.type !== 'group' || !entry.data || typeof entry.data !== 'object') {
      return null;
    }
    const data = entry.data as Record<string, unknown>;
    if ('entries' in data && Array.isArray(data.entries)) {
      return data.entries.length;
    }
    return null;
  };

  // Get action type color
  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      group: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      create: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      move: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      copy: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    };

    return colors[type] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
  };

  // Custom render or default render
  const renderEntryContent = (entry: HistoryEntry, index: number, isCurrent: boolean) => {
    if (renderEntry) {
      return renderEntry(entry, index, isCurrent);
    }

    const isExpanded = expandedEntry === index;

    return (
      <div
        key={entry.id}
        className={cn(
          'group flex items-start gap-3 rounded-lg border p-3 transition-all',
          isCurrent
            ? 'border-primary bg-primary/5 dark:bg-primary/10'
            : 'border-border hover:bg-muted/50',
          onEntryClick && 'cursor-pointer'
        )}
        onClick={() => onEntryClick?.(entry, index)}
      >
        {/* Status Icon */}
        <div className="mt-0.5">
          {isCurrent ? (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Clock className="h-3.5 w-3.5" />
            </div>
          ) : index < currentIndex ? (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Undo2 className="h-3.5 w-3.5" />
            </div>
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Redo2 className="h-3.5 w-3.5" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title and Badge */}
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium truncate">{entry.description || '未命名操作'}</p>
            {showBadges && (
              <Badge variant="info" className={cn('text-xs', getTypeColor(entry.type || 'default'))}>
                {entry.type || 'default'}
              </Badge>
            )}
          </div>

          {/* Metadata */}
          {!compact && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {showTimestamp && entry.timestamp && (
                <Tooltip content={formatFullTime(entry.timestamp)}>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(entry.timestamp)}
                  </span>
                </Tooltip>
              )}

              {showUser && entry.userId && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {entry.userId}
                </span>
              )}

              {(() => {
                const count = getGroupEntriesCount(entry);
                return count !== null ? (
                  <Badge variant="outline" className="text-xs">
                    {count} 操作
                  </Badge>
                ) : null;
              })()}
            </div>
          )}

          {/* Expanded Details */}
          {!compact && isExpanded && (
            <div className="mt-2 p-2 rounded bg-muted/50 text-xs">
              <pre className="whitespace-pre-wrap break-all font-mono">
                {JSON.stringify(entry.data || {}, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Expand Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            setExpandedEntry(isExpanded ? null : index);
          }}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };

  return (
    <Card className={cn('p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">操作历史</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={!canUndo}
          >
            <Undo2 className="h-4 w-4 mr-1" />
            撤销
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={!canRedo}
          >
            <Redo2 className="h-4 w-4 mr-1" />
            重做
          </Button>
        </div>
      </div>

      {/* History List */}
      <div
        className="overflow-y-auto space-y-2 pr-2"
        style={{ maxHeight }}
      >
        {filteredHistory.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            暂无操作历史
          </div>
        ) : (
          filteredHistory.map((entry, index) =>
            renderEntryContent(entry, index, index === currentIndex)
          )
        )}
      </div>

      {/* Footer Stats */}
      {filteredHistory.length > 0 && (
        <div className="mt-4 pt-3 border-t text-xs text-muted-foreground flex items-center justify-between">
          <span>
            共 {filteredHistory.length} 条记录
          </span>
          <span>
            已撤销: {currentIndex + 1} / {filteredHistory.length}
          </span>
        </div>
      )}
    </Card>
  );
}

// ============================================================================
// History Mini View (Compact)
// ============================================================================

export interface HistoryMiniViewProps {
  className?: string;
  limit?: number;
}

export function HistoryMiniView({
  className,
  limit = 5,
}: HistoryMiniViewProps) {
  const { history, currentIndex } = useUndoRedo();
  const recentHistory = history.slice(0, limit);

  if (recentHistory.length === 0) {
    return null;
  }

  return (
    <div className={cn('text-xs text-muted-foreground', className)}>
      <div className="flex items-center gap-2">
        <span className="font-medium">最近操作:</span>
        <span className="truncate">
          {recentHistory.map((entry, i) => (
            <span
              key={entry.id}
              className={cn(
                'inline-block mr-2',
                i <= currentIndex ? 'opacity-100' : 'opacity-50'
              )}
            >
              {entry.description}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
