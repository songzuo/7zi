/**
 * Tasks Loading State
 *
 * Displays a skeleton screen while tasks data is being fetched.
 * This improves perceived performance and provides immediate visual feedback.
 */

import { TasksLoading } from '@/components/PageLoadingTemplate';

export default function TasksPageLoading() {
  return <TasksLoading />;
}
