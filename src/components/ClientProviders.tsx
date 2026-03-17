'use client';

import { ComponentType } from 'react';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  // ClientProviders now just passes children through
  // SettingsProvider is handled in the root layout via Providers component
  return <>{children}</>;
}
