'use client';

/**
 * Shortcut Tutorial Mode Component
 * Interactive tutorial for learning keyboard shortcuts
 */

import React, { useState, useEffect, useCallback } from 'react';
import { shortcutManager } from '@/lib/keyboard/shortcut-manager';
import { Shortcut } from '@/lib/keyboard/shortcut-registry';
import ShortcutTooltip from './ShortcutTooltip';
import { KeyboardKey } from './ShortcutTooltip';

interface TutorialStep {
  shortcut: Shortcut;
  instruction: string;
  hint?: string;
}

interface ShortcutTutorialProps {
  isOpen?: boolean;
  onClose?: () => void;
  onComplete?: () => void;
  shortcuts?: Shortcut[];
}

export default function ShortcutTutorial({
  isOpen = false,
  onClose,
  onComplete,
  shortcuts: customShortcuts,
}: ShortcutTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showHint, setShowHint] = useState(false);
  const [progress, setProgress] = useState(0);

  // Get shortcuts to teach
  const tutorialShortcuts = customShortcuts || shortcutManager.getAll().slice(0, 5);

  // Calculate progress
  useEffect(() => {
    const completed = completedSteps.size;
    const total = tutorialShortcuts.length;
    setProgress((completed / total) * 100);
  }, [completedSteps, tutorialShortcuts.length]);

  // Reset tutorial when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setCompletedSteps(new Set());
      setShowHint(false);
    }
  }, [isOpen]);

  // Handle keyboard events for tutorial
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return;

      const currentShortcut = tutorialShortcuts[currentStep];
      if (!currentShortcut) return;

      // Parse the pressed key combination
      const parts: string[] = [];
      if (event.ctrlKey) parts.push('ctrl');
      if (event.metaKey) parts.push('cmd');
      if (event.shiftKey) parts.push('shift');
      if (event.altKey) parts.push('alt');

      const key = event.key.toLowerCase();
      if (
        key !== 'control' &&
        key !== 'meta' &&
        key !== 'shift' &&
        key !== 'alt'
      ) {
        parts.push(key);
      }

      const pressedKey = parts.join('+');

      // Check if the correct shortcut was pressed
      if (pressedKey === currentShortcut.key) {
        event.preventDefault();
        event.stopPropagation();

        // Mark step as completed
        setCompletedSteps(prev => new Set([...prev, currentStep]));
        setShowHint(false);

        // Move to next step after a short delay
        setTimeout(() => {
          if (currentStep < tutorialShortcuts.length - 1) {
            setCurrentStep(prev => prev + 1);
          } else {
            // Tutorial complete
            onComplete?.();
            onClose?.();
          }
        }, 500);
      }
    },
    [isOpen, currentStep, tutorialShortcuts, onComplete, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Handle skip step
  const handleSkip = () => {
    if (currentStep < tutorialShortcuts.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete?.();
      onClose?.();
    }
  };

  // Handle restart
  const handleRestart = () => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setShowHint(false);
  };

  if (!isOpen) return null;

  const currentShortcut = tutorialShortcuts[currentStep];
  const isCompleted = completedSteps.has(currentStep);
  const isLastStep = currentStep === tutorialShortcuts.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Keyboard Shortcuts Tutorial
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="absolute h-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Step {currentStep + 1} of {tutorialShortcuts.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {currentShortcut && (
            <div className="text-center">
              {/* Instruction */}
              <div className="mb-8">
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">
                  {isCompleted ? '✓ Great job!' : 'Try this shortcut:'}
                </p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {currentShortcut.description}
                </h3>
              </div>

              {/* Keyboard Display */}
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 p-6 bg-gray-100 dark:bg-gray-900 rounded-xl">
                  {currentShortcut.key.split('+').map((keyPart, index) => (
                    <React.Fragment key={keyPart}>
                      {index > 0 && <span className="text-gray-400 text-2xl">+</span>}
                      <KeyboardKey
                        keyDisplay={keyPart.trim()}
                        pressed={isCompleted}
                        size="lg"
                      />
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Hint */}
              {showHint && !isCompleted && (
                <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    💡 Hint: Press the keys shown above to complete this step
                  </p>
                </div>
              )}

              {/* Step Navigation */}
              <div className="flex items-center justify-center gap-4">
                {!isCompleted && (
                  <button
                    onClick={() => setShowHint(true)}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Show Hint
                  </button>
                )}

                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Skip
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <button
              onClick={handleRestart}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Restart Tutorial
            </button>

            {isLastStep && completedSteps.size === tutorialShortcuts.length && (
              <button
                onClick={() => {
                  onComplete?.();
                  onClose?.();
                }}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Complete Tutorial
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Tutorial Progress Indicator Component
 */
interface TutorialProgressProps {
  completed: number;
  total: number;
  onClick?: () => void;
}

export function TutorialProgress({ completed, total, onClick }: TutorialProgressProps) {
  const percentage = (completed / total) * 100;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
    >
      <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
        {completed}/{total}
      </span>
      <div className="w-16 h-1.5 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </button>
  );
}

/**
 * Hook to use tutorial mode
 */
export function useShortcutTutorial() {
  const [isOpen, setIsOpen] = useState(false);
  const [completed, setCompleted] = useState(0);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const handleComplete = useCallback(() => {
    setCompleted(prev => prev + 1);
  }, []);

  return {
    isOpen,
    completed,
    open,
    close,
    onComplete: handleComplete,
  };
}