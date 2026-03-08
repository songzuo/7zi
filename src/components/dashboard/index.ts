// Types
export * from './types';

// Components
export { DashboardTabs, type TabId } from './DashboardTabs';
export { StatsCards } from './StatsCards';
export { ProgressOverview } from './ProgressOverview';
export { TaskCard } from './TaskCard';
export { ActivityItem } from './ActivityItem';
export { DashboardHeader } from './DashboardHeader';
export { ChartCard } from './ChartCard';
export { ChartsGrid } from './ChartsGrid';
export { OverviewTab } from './OverviewTab';
export { ProjectsTab } from './ProjectsTab';
export { ActivityTab } from './ActivityTab';

// Re-export hook from hooks folder for convenience
export { useDashboard, type UseDashboardReturn } from '@/hooks/useDashboard';

// Utils
export { formatDate, getTaskEmoji, getActivityColor } from './utils';