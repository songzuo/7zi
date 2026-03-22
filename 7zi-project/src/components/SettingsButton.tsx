'use client';

import { useState, useEffect, useRef } from 'react';
import { SettingsPanel } from './SettingsPanel';

interface SettingsButtonProps {
  className?: string;
  compact?: boolean;
}

export function SettingsButton({ className = '', compact = false }: SettingsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        panelRef.current &&
        buttonRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // ESC 关闭
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-center rounded-lg transition-colors
          ${compact
            ? 'w-10 h-10 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            : 'px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 gap-2'
          }
          ${isOpen ? 'bg-zinc-200 dark:bg-zinc-700' : ''}
        `}
        aria-label="设置"
        aria-expanded={isOpen}
      >
        <span className={compact ? 'text-lg' : 'text-xl'}>⚙️</span>
        {!compact && (
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">设置</span>
        )}
      </button>

      {/* 下拉面板 */}
      {isOpen && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 z-50 animate-fade-in"
        >
          <SettingsPanel onClose={() => setIsOpen(false)} />
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

export default SettingsButton;
