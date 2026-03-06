'use client';

import { SettingsProvider } from '@/contexts/SettingsContext';
import { ThemeToggle } from './ThemeToggle';
import { AIChat } from './AIChat';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <SettingsProvider>
      {children}
    </SettingsProvider>
  );
}

export { ThemeToggle, AIChat };