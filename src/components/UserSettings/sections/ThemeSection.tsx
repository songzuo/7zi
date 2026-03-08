'use client';

import { useCallback } from 'react';
import type { ThemeValue } from '../types';
import SectionCard from '../SectionCard';
import ThemeOption from '../subcomponents/ThemeOption';

// ============================================================================
// Theme Options
// ============================================================================

const THEME_OPTIONS = [
  { value: 'light' as const, label: '浅色模式', icon: '☀️', desc: '适合白天使用' },
  { value: 'dark' as const, label: '深色模式', icon: '🌙', desc: '适合夜间使用' },
  { value: 'system' as const, label: '跟随系统', icon: '💻', desc: '自动适应系统设置' },
];

interface ThemeSectionProps {
  theme: ThemeValue;
  setTheme: (theme: ThemeValue) => void;
}

export function ThemeSection({ theme, setTheme }: ThemeSectionProps) {
  const handleThemeChange = useCallback((newTheme: ThemeValue) => {
    setTheme(newTheme);
  }, [setTheme]);

  return (
    <SectionCard title="主题设置" icon="🎨">
      <div className="space-y-6">
        <div>
          <h4 className="font-medium text-zinc-900 dark:text-white mb-4">选择主题</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {THEME_OPTIONS.map(option => (
              <ThemeOption
                key={option.value}
                option={option}
                isSelected={theme === option.value}
                onSelect={handleThemeChange}
              />
            ))}
          </div>
        </div>

        {/* Theme Preview */}
        <div className="pt-6 border-t border-zinc-200 dark:border-zinc-700">
          <h4 className="font-medium text-zinc-900 dark:text-white mb-4">预览</h4>
          <div className="p-6 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500" />
              <div>
                <div className="font-medium text-zinc-900 dark:text-white">示例用户</div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">这是主题预览</div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-700">
              <p className="text-zinc-700 dark:text-zinc-300">
                当前主题: {theme === 'light' ? '浅色模式' : theme === 'dark' ? '深色模式' : '跟随系统'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

export default ThemeSection;