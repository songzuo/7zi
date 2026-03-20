/**
 * Dashboard Loading State
 *
 * Displays a skeleton screen while dashboard data is being fetched.
 * This improves perceived performance and provides immediate visual feedback.
 */

import { DashboardLoading } from '@/components/PageLoadingTemplate';

export default function DashboardPageLoading() {
  return <DashboardLoading />;
}
