'use client';

import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider';
import { Dashboard } from '@/features/dashboard/components/Dashboard';

export function DashboardClient() {
  return (
    <OnboardingProvider>
      <Dashboard />
    </OnboardingProvider>
  );
}
