'use client';

import Link from 'next/link';
import { TaskCard } from './TaskCard';
import type { Task } from '@/lib/types/task-types';
import type { AIMember } from '@/stores/dashboardStore';

interface ProjectsTabProps {
  tasks: Task[];
  members: AIMember[];
  getTaskAssigneeName: (task: Task) => string;
}

export function ProjectsTab({ tasks, members, getTaskAssigneeName }: ProjectsTabProps) {
  if (!tasks || tasks.length === 0) {
    return <EmptyTasksState />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} assigneeName={getTaskAssigneeName(task)} />
      ))}
    </div>
  );
}

function EmptyTasksState() {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-4">📋</div>
      <h3 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200 mb-2">暂无任务</h3>
      <p className="text-zinc-600 dark:text-zinc-400">创建第一个任务开始协作吧！</p>
      <Link
        href="/tasks/new"
        className="mt-4 inline-block px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-full font-medium hover:shadow-lg transition-all"
      >
        创建任务
      </Link>
    </div>
  );
}