'use client';

import { useState } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { useDashboard } from '@/hooks/useDashboard';
import {
  DashboardTabs,
  DashboardHeader,
  OverviewTab,
  ProjectsTab,
  ActivityTab,
  type TabId,
} from '@/components/dashboard';

export function ProjectDashboard() {
  const { tasks, members, dashboardStats, projects, activities, stats, getTaskAssigneeName } = useDashboard();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  if (!tasks) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <section className="py-16 px-6 bg-zinc-50 dark:bg-zinc-900">
      <div className="max-w-6xl mx-auto">
        <DashboardHeader />
        <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'overview' && (
          <OverviewTab
            tasks={tasks}
            members={members}
            dashboardStats={dashboardStats}
            projects={projects}
            activities={activities}
            stats={stats}
          />
        )}

        {activeTab === 'projects' && (
          <ProjectsTab tasks={tasks} members={members} getTaskAssigneeName={getTaskAssigneeName} />
        )}

        {activeTab === 'activity' && <ActivityTab activities={activities} />}
      </div>
    </section>
  );
}