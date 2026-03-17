'use client';

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Dynamically import SettingsProvider to avoid SSR issues
const SettingsProvider = dynamic(() => import('@/contexts/SettingsContext').then(m => ({ default: m.SettingsProvider })), {
  ssr: false,
  loading: () => null
});

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