'use client';

import { ThemeProvider } from './ThemeProvider';
import { ThemeToggle } from './ThemeToggle';
import { AIChat } from './AIChat';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ThemeProvider defaultTheme="system">
      {children}
    </ThemeProvider>
  );
}

export { ThemeToggle, AIChat };
