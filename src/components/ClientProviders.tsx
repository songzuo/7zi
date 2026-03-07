'use client';

import { ThemeProvider, useTheme } from 'next-themes';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { ThemeToggle } from './ThemeToggle';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SettingsProvider>
        {children}
      </SettingsProvider>
    </ThemeProvider>
  );
}

// 重新导出 ThemeToggle 和 useTheme
export { ThemeToggle, useTheme };
