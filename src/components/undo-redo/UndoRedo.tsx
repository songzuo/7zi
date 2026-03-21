/**
 * @fileoverview UndoRedo Component
 * @description A button group for undo/redo functionality with keyboard shortcuts
 */

'use client';

import { Undo2, Redo2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { useUndoRedo } from '@/lib/undo-redo';
import { cn } from '@/lib/utils';

// ============================================================================
// Props
// ============================================================================

export interface UndoRedoProps {
  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Enable keyboard shortcuts (Ctrl+Z / Ctrl+Y)
   * @default true
   */
  enableShortcuts?: boolean;

  /**
   * Custom keyboard shortcuts
   */
  undoShortcut?: string | string[];
  redoShortcut?: string | string[];

  /**
   * Show tooltips
   * @default true
   */
  showTooltips?: boolean;

  /**
   * Button size
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Button variant
   * @default 'outline'
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';

  /**
   * Orientation
   * @default 'horizontal'
   */
  orientation?: 'horizontal' | 'vertical';

  /**
   * Show history count badge
   * @default true
   */
  showCount?: boolean;

  /**
   * Custom labels
   */
  labels?: {
    undo?: string;
    redo?: string;
  };
}

// ============================================================================
// Component
// ============================================================================

export function UndoRedo({
  className,
  enableShortcuts = true,
  undoShortcut = ['Ctrl+Z', 'Cmd+Z'],
  redoShortcut = ['Ctrl+Y', 'Cmd+Shift+Z'],
  showTooltips = true,
  size = 'md',
  variant = 'outline',
  orientation = 'horizontal',
  showCount = true,
  labels,
}: UndoRedoProps) {
  const { undo, redo, canUndo, canRedo, history, currentIndex } = useUndoRedo();

  // Calculate history counts
  const pastCount = currentIndex + 1;
  const futureCount = history.length - currentIndex - 1;

  const content = (
    <div
      className={cn(
        'flex items-center gap-1',
        orientation === 'vertical' && 'flex-col',
        className
      )}
    >
      {/* Undo Button */}
      <Tooltip content={showTooltips ? (labels?.undo || '撤销') : undefined}>
        <Button
          variant={variant}
          size={size}
          onClick={undo}
          disabled={!canUndo}
          className="relative"
        >
          <Undo2 className="h-4 w-4" />
          {showCount && canUndo && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {pastCount}
            </span>
          )}
        </Button>
      </Tooltip>

      {/* Redo Button */}
      <Tooltip content={showTooltips ? (labels?.redo || '重做') : undefined}>
        <Button
          variant={variant}
          size={size}
          onClick={redo}
          disabled={!canRedo}
          className="relative"
        >
          <Redo2 className="h-4 w-4" />
          {showCount && canRedo && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {futureCount}
            </span>
          )}
        </Button>
      </Tooltip>
    </div>
  );

  return content;
}

// ============================================================================
// Shortcut Indicator Component
// ============================================================================

export interface UndoRedoShortcutsProps {
  className?: string;
  shortcuts?: {
    undo?: string | string[];
    redo?: string | string[];
  };
}

export function UndoRedoShortcuts({
  className,
  shortcuts,
}: UndoRedoShortcutsProps) {
  const defaultUndo = ['Ctrl+Z', 'Cmd+Z'];
  const defaultRedo = ['Ctrl+Y', 'Cmd+Shift+Z'];

  const undo = shortcuts?.undo || defaultUndo;
  const redo = shortcuts?.redo || defaultRedo;

  return (
    <div className={cn('flex gap-4 text-xs text-muted-foreground', className)}>
      <span className="flex items-center gap-1">
        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">
          {undo[0]}
        </kbd>
        <span>撤销</span>
      </span>
      <span className="flex items-center gap-1">
        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">
          {redo[0]}
        </kbd>
        <span>重做</span>
      </span>
    </div>
  );
}
