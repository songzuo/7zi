'use client';

/**
 * SchedulerClient.tsx
 * Client component for the Agent Scheduler Dashboard page
 * Integrates the AgentScheduler Dashboard with the main Next.js application
 */

import { Dashboard } from '@/lib/agent-scheduler/dashboard/Dashboard';
import type { Locale } from '@/i18n/config';

interface SchedulerClientProps {
  locale: Locale;
}

export default function SchedulerClient({ locale }: SchedulerClientProps) {
  return <Dashboard />;
}
