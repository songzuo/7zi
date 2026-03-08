'use client';

import { StatsCards } from './StatsCards';
import { ChartsGrid } from './ChartsGrid';
import { ProgressOverview } from './ProgressOverview';
import type { Task } from '@/lib/types/task-types';
import type { AIMember } from '@/stores/dashboardStore';
import type { Project, ActivityLog } from './types';

interface OverviewTabProps {
  tasks: Task[] | null;
  members: AIMember[];
  dashboardStats: { totalMembers: number };
  projects: Project[];
  activities: ActivityLog[];
  stats: { overallProgress: number; completedTasks: number };
}

export function OverviewTab({ tasks, members, dashboardStats, projects, activities, stats }: OverviewTabProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <StatsCards
        totalMembers={dashboardStats.totalMembers}
        overallProgress={stats.overallProgress}
        completedTasks={stats.completedTasks}
        activityCount={activities.length}
      />

      <ChartsGrid tasks={tasks} members={members} />
      <ProgressOverview projects={projects} />
    </div>
  );
}