'use client';

import { useRef, useState, RefObject } from 'react';
import Image from 'next/image';
import { GitHubIssue } from '@/types';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';
import { useLongPress } from '@/hooks/useLongPress';
import { formatTimeAgo } from '@/lib/date';

interface TaskCardMobileProps {
  issue: GitHubIssue;
  onComplete?: (issue: GitHubIssue) => void;
  onAssign?: (issue: GitHubIssue) => void;
  onArchive?: (issue: GitHubIssue) => void;
  onDelete?: (issue: GitHubIssue) => void;
  searchQuery?: string;
}

/**
 * Mobile Task Card with Swipe Actions
 * - Swipe right: Mark as complete
 * - Swipe left: Archive/Delete
 * - Long press: Show context menu
 */
export function TaskCardMobile({
  issue,
  onComplete,
  onAssign,
  onArchive,
  onDelete,
  searchQuery,
}: TaskCardMobileProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = useState(false);

  const stateConfig = {
    open: {
      color: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
      label: '🟢 进行中',
      completeAction: '完成',
    },
    closed: {
      color: 'text-zinc-500 bg-zinc-50 border-zinc-200 dark:bg-zinc-900/30 dark:text-zinc-400 dark:border-zinc-700',
      label: '✅ 已完成',
      completeAction: '重新打开',
    },
  };

  const config = stateConfig[issue.state];

  // Swipe handlers
  const handleSwipeRight = () => {
    if (onComplete) {
      onComplete(issue);
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([30, 50, 30]);
      }
    }
  };

  const handleSwipeLeft = () => {
    if (onArchive) {
      onArchive(issue);
    } else if (onDelete) {
      onDelete(issue);
    }
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 50]);
    }
  };

  const { swipeState } = useSwipeGestures(cardRef as RefObject<HTMLElement>, {
    onSwipeRight: handleSwipeRight,
    onSwipeLeft: handleSwipeLeft,
  });

  // Long press handler
  const longPressHandlers = useLongPress({
    delay: 500,
    onLongPress: (e) => {
      setShowMenu(true);
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    },
    onClick: (e) => {
      // Navigate to issue
      window.open(issue.html_url, '_blank');
    },
    shouldPreventDefault: true,
  });

  // Calculate swipe transform
  const getSwipeTransform = () => {
    if (!swipeState.isDragging) return 'translateX(0)';
    return `translateX(${swipeState.deltaX}px)`;
  };

  // Calculate background color based on swipe direction
  const getSwipeBackground = () => {
    const absDeltaX = Math.abs(swipeState.deltaX);
    if (absDeltaX < 20) return 'bg-transparent';

    if (swipeState.deltaX > 0) {
      // Swiping right - complete action
      const opacity = Math.min(absDeltaX / 100, 1) * 0.15;
      return `rgba(34, 197, 94, ${opacity})`; // Green
    } else {
      // Swiping left - archive/delete
      const opacity = Math.min(absDeltaX / 100, 1) * 0.15;
      return `rgba(239, 68, 68, ${opacity})`; // Red
    }
  };

  return (
    <>
      {/* Background swipe indicators */}
      <div className="relative overflow-hidden rounded-xl">
        {/* Complete indicator (swipe right) */}
        <div
          className={`absolute inset-0 flex items-center justify-end pr-6 transition-opacity duration-150 ${
            swipeState.deltaX > 0 ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ opacity: Math.min(Math.max(swipeState.deltaX - 20, 0) / 80, 1) }}
        >
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <span className="text-2xl">✅</span>
            <span className="font-semibold">{config.completeAction}</span>
          </div>
        </div>

        {/* Archive/Delete indicator (swipe left) */}
        <div
          className={`absolute inset-0 flex items-center justify-start pl-6 transition-opacity duration-150 ${
            swipeState.deltaX < 0 ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ opacity: Math.min(Math.max(-swipeState.deltaX - 20, 0) / 80, 1) }}
        >
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <span className="text-2xl">🗑️</span>
            <span className="font-semibold">归档</span>
          </div>
        </div>

        {/* Swipe background overlay */}
        <div
          className="absolute inset-0 transition-all duration-75"
          style={{ backgroundColor: getSwipeBackground() }}
        />

        {/* Card */}
        <div
          ref={cardRef}
          {...longPressHandlers}
          className={`
            relative bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700
            rounded-xl p-4 transition-transform duration-75 cursor-pointer
            active:scale-[0.98]
          `}
          style={{
            transform: getSwipeTransform(),
          }}
          role="button"
          tabIndex={0}
          aria-label={`任务 #${issue.number}: ${issue.title}`}
        >
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            {/* Status badge */}
            <div className="flex-shrink-0 mt-1">
              <span
                className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border ${config.color}`}
              >
                {config.label}
              </span>
            </div>

            {/* Title */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-cyan-600 dark:text-cyan-400">
                  #{issue.number}
                </span>
              </div>
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white line-clamp-2">
                {issue.title}
              </h3>
            </div>
          </div>

          {/* Labels */}
          {issue.labels && issue.labels.length > 0 && (
            <div className="flex items-center gap-1 mb-3 flex-wrap">
              {issue.labels.slice(0, 3).map((label, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: `#${label.color}20`,
                    color: `#${label.color}`,
                  }}
                >
                  {label.name}
                </span>
              ))}
              {issue.labels.length > 3 && (
                <span className="text-xs text-zinc-400">
                  +{issue.labels.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              {issue.assignee && (
                <div className="flex items-center gap-1">
                  <Image
                    src={issue.assignee.avatar_url}
                    alt={issue.assignee.login}
                    width={20}
                    height={20}
                    sizes="20px"
                    className="rounded-full"
                    unoptimized
                  />
                  <span>{issue.assignee.login}</span>
                </div>
              )}
            </div>
            <span title={new Date(issue.updated_at).toLocaleString()}>
              {formatTimeAgo(issue.updated_at)}
            </span>
          </div>

          {/* Quick action hint */}
          <div className="mt-3 flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
            <span className="flex items-center gap-1">
              <span className="text-lg">→</span> 完成
            </span>
            <span className="flex items-center gap-1">
              <span className="text-lg">←</span> 归档
            </span>
            <span className="flex items-center gap-1">
              <span className="text-lg">⎋</span> 长按菜单
            </span>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowMenu(false)}
        >
          <div
            className="bg-white dark:bg-zinc-800 rounded-2xl w-full max-w-sm mx-4 mb-4 sm:mb-0 shadow-2xl overflow-hidden animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Menu header */}
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                任务操作
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                #{issue.number} {issue.title}
              </p>
            </div>

            {/* Menu items */}
            <div className="py-2">
              {/* Toggle complete */}
              <button
                onClick={() => {
                  onComplete?.(issue);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-700/50 active:bg-zinc-100 dark:active:bg-zinc-700 transition-colors min-h-[48px]"
              >
                <span className="text-xl">
                  {issue.state === 'open' ? '✅' : '↩️'}
                </span>
                <div>
                  <div className="text-sm font-medium text-zinc-900 dark:text-white">
                    {issue.state === 'open' ? '标记为完成' : '重新打开'}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {issue.state === 'open'
                      ? '将任务标记为已完成'
                      : '重新开始此任务'}
                  </div>
                </div>
              </button>

              {/* Assign */}
              <button
                onClick={() => {
                  onAssign?.(issue);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-700/50 active:bg-zinc-100 dark:active:bg-zinc-700 transition-colors min-h-[48px]"
              >
                <span className="text-xl">👤</span>
                <div>
                  <div className="text-sm font-medium text-zinc-900 dark:text-white">
                    指派成员
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {issue.assignee
                      ? `当前: ${issue.assignee.login}`
                      : '未指派'}
                  </div>
                </div>
              </button>

              {/* Archive/Delete */}
              <button
                onClick={() => {
                  onArchive?.(issue);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-700/50 active:bg-zinc-100 dark:active:bg-zinc-700 transition-colors min-h-[48px]"
              >
                <span className="text-xl">🗑️</span>
                <div>
                  <div className="text-sm font-medium text-red-600 dark:text-red-400">
                    归档任务
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    从列表中移除此任务
                  </div>
                </div>
              </button>

              {/* Open in GitHub */}
              <a
                href={issue.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-700/50 active:bg-zinc-100 dark:active:bg-zinc-700 transition-colors min-h-[48px]"
              >
                <span className="text-xl">🔗</span>
                <div>
                  <div className="text-sm font-medium text-zinc-900 dark:text-white">
                    在 GitHub 查看
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    打开 GitHub 上的任务详情
                  </div>
                </div>
              </a>
            </div>

            {/* Cancel button */}
            <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50">
              <button
                onClick={() => setShowMenu(false)}
                className="w-full px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors min-h-[48px]"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
