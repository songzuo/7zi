'use client';

import { useCallback } from 'react';
import type { ThemeValue } from '../types';

interface ThemeOptionProps {
  value?: ThemeValue;
  label?: string;
  icon?: string;
  desc?: string;
  option?: { value: ThemeValue; label: string; icon: string; desc: string };
  isSelected: boolean;
  onSelect: (theme: ThemeValue) => void;
}

export function ThemeOption({ 
  value, 
  label, 
  icon, 
  desc,
  option,
  isSelected, 
  onSelect 
}: ThemeOptionProps) {
  const actualValue = option?.value ?? value ?? 'system';
  const actualLabel = option?.label ?? label ?? '';
  const actualIcon = option?.icon ?? icon ?? '';
  const actualDesc = option?.desc ?? desc ?? '';
  
  const handleClick = useCallback(() => {
    onSelect(actualValue);
  }, [actualValue, onSelect]);

  return (
    <button
      onClick={handleClick}
      className={`
        p-6 rounded-xl border-2 text-center transition-all
        ${isSelected
          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
          : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
        }
      `}
    >
      <div className="text-4xl mb-3">{actualIcon}</div>
      <div className="font-medium text-zinc-900 dark:text-white">{actualLabel}</div>
      <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{actualDesc}</div>
    </button>
  );
}

export default ThemeOption;