'use client';

import { useMemo } from 'react';
import { TaskStatusChart } from '@/components/charts/TaskStatusChart';
import { TaskProgressChart } from '@/components/charts/TaskProgressChart';
import { TeamWorkloadChart } from '@/components/charts/TeamWorkloadChart';
import { ChartCard } from './ChartCard';
import type { Task } from '@/lib/types/task-types';
import type { AIMember } from '@/stores/dashboardStore';

// Local types matching what TeamWorkloadChart expects
interface ChartTask {
  id: string;
  title: string;
  assignee: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  type: 'development' | 'design' | 'research' | 'marketing' | 'other';
}

interface ChartMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

interface ChartsGridProps {
  tasks: Task[] | null;
  members: AIMember[];
}

export function ChartsGrid({ tasks, members }: ChartsGridProps) {
  // Prepare data for TaskProgressChart
  const progressData = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return {
        labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
        completed: [3, 5, 4, 7, 6, 2, 1],
        total: [5, 8, 6, 10, 9, 3, 2],
      };
    }

    // Group tasks by date for the last 7 days
    const last7Days: string[] = [];
    const completedByDay: number[] = [];
    const totalByDay: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('zh-CN', { weekday: 'short' });
      last7Days.push(dateStr);

      const dayTasks = tasks.filter(t => {
        const taskDate = new Date(t.createdAt);
        return taskDate.toDateString() === date.toDateString();
      });

      totalByDay.push(dayTasks.length);
      completedByDay.push(dayTasks.filter(t => t.status === 'completed').length);
    }

    return {
      labels: last7Days,
      completed: completedByDay,
      total: totalByDay,
    };
  }, [tasks]);

  // Adapt members for TeamWorkloadChart
  const chartMembers: ChartMember[] = useMemo(() => {
    return members.map(m => ({
      id: m.id,
      name: m.name,
      role: m.role,
      avatar: m.avatar,
    }));
  }, [members]);

  // Adapt tasks for TeamWorkloadChart (convert to expected format)
  const chartTasks: ChartTask[] = useMemo(() => {
    if (!tasks) return [];
    return tasks.map(t => ({
      id: t.id,
      title: t.title,
      assignee: t.assignee || '',
      status: t.status,
      // Map 'urgent' to 'high' for chart display
      priority: t.priority === 'urgent' ? 'high' : t.priority as 'low' | 'medium' | 'high',
      type: t.type,
    }));
  }, [tasks]);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="任务状态分布">
          <TaskStatusChart tasks={tasks || []} />
        </ChartCard>
        <ChartCard title="团队成员工作量">
          <TeamWorkloadChart tasks={chartTasks} members={chartMembers} />
        </ChartCard>
      </div>

      <ChartCard title="任务进度趋势">
        <TaskProgressChart data={progressData} />
      </ChartCard>
    </>
  );
}