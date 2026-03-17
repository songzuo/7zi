'use client';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Pass children through without wrapping
  // ClientProviders and SettingsProvider cause SSR issues
  // Theme switching is handled separately
  return <>{children}</>;
}
