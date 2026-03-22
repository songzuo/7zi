/**
 * @fileoverview Feedback widget component
 * @description Floating widget for quick access to feedback forms
 */

'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import { FeedbackModal, type FeedbackData } from './FeedbackModal';
import { BugReportForm, type BugReportData } from './BugReportForm';

interface FeedbackWidgetProps {
  onFeedbackSubmit?: (feedback: FeedbackData) => Promise<void> | void;
  onBugReportSubmit?: (bug: BugReportData) => Promise<void> | void;
  position?: 'bottom-right' | 'bottom-left';
  showLabel?: boolean;
}

type FeedbackMode = 'menu' | 'feedback' | 'bug';

const POSITION_CLASSES = {
  'bottom-right': 'bottom-6 right-6',
  'bottom-left': 'bottom-6 left-6',
} as const;

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({
  onFeedbackSubmit,
  onBugReportSubmit,
  position = 'bottom-right',
  showLabel = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<FeedbackMode>('menu');

  const handleFeedbackSubmit = useCallback(async (feedback: FeedbackData) => {
    await onFeedbackSubmit?.(feedback);
    setIsOpen(false);
    setMode('menu');
  }, [onFeedbackSubmit]);

  const handleBugReportSubmit = useCallback(async (bug: BugReportData) => {
    await onBugReportSubmit?.(bug);
    setIsOpen(false);
    setMode('menu');
  }, [onBugReportSubmit]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => setMode('menu'), 300);
  }, []);

  const toggleMenu = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const positionClass = useMemo(() => POSITION_CLASSES[position], [position]);

  return (
    <>
      {/* Floating Button */}
      <div className={`fixed z-40 ${positionClass}`}>
        <button
          onClick={toggleMenu}
          className={`
            flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg
            transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-500/30
          `}
          aria-label="打开反馈"
          aria-expanded={isOpen}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          {showLabel && <span className="font-medium">反馈</span>}
        </button>
      </div>

      {/* Modal Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-lg transform rounded-lg bg-white dark:bg-zinc-900 shadow-xl transition-all">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-6 py-4">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {mode === 'menu' ? '反馈帮助' : mode === 'feedback' ? '提交反馈' : '报告问题'}
                </h3>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-zinc-400 hover:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1"
                  aria-label="关闭"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-4">
                {mode === 'menu' ? (
                  <Menu onSelect={setMode} />
                ) : mode === 'feedback' ? (
                  <FeedbackModal
                    isOpen={true}
                    onClose={() => setMode('menu')}
                    onSubmit={handleFeedbackSubmit}
                  />
                ) : (
                  <BugReportForm
                    onSubmit={handleBugReportSubmit}
                    showTitle={false}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface MenuProps {
  onSelect: (mode: FeedbackMode) => void;
}

const Menu: React.FC<MenuProps> = memo(({ onSelect }) => {
  const options = useMemo(() => [
    {
      id: 'feedback' as const,
      icon: '💬',
      title: '一般反馈',
      description: '分享您的想法、建议或意见',
      color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30',
    },
    {
      id: 'bug' as const,
      icon: '🐛',
      title: '报告问题',
      description: '报告您遇到的错误或问题',
      color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30',
    },
  ], []);

  const handleSelect = useCallback((mode: FeedbackMode) => {
    onSelect(mode);
  }, [onSelect]);

  return (
    <div className="space-y-3">
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => handleSelect(option.id)}
          className={`
            w-full flex items-start gap-4 p-4 rounded-lg border-2 transition-all text-left
            ${option.color}
          `}
        >
          <span className="text-3xl">{option.icon}</span>
          <div className="flex-1">
            <h4 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">
              {option.title}
            </h4>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {option.description}
            </p>
          </div>
          <svg
            className="w-5 h-5 text-zinc-400 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      ))}
    </div>
  );
});

Menu.displayName = 'Menu';

export default FeedbackWidget;
