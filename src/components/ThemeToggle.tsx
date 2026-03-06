'use client';

import { useTheme } from '@/contexts/SettingsContext';

export function ThemeToggle() {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-12 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
      aria-label="Toggle theme"
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 dark:from-cyan-400 dark:to-blue-500 transition-transform duration-300 shadow-md ${
          isDark ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
      <span className="absolute left-1.5 top-1.5 text-[10px] transition-opacity duration-300 dark:opacity-0">
        ☀️
      </span>
      <span className="absolute right-1.5 top-1.5 text-[10px] opacity-0 transition-opacity duration-300 dark:opacity-100">
        🌙
      </span>
    </button>
  );
}
