'use client';

import type { Project } from './types';

interface ProgressOverviewProps {
  projects: Project[];
}

export function ProgressOverview({ projects }: ProgressOverviewProps) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-2xl p-8 shadow-lg">
      <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">项目进度概览</h3>
      <div className="space-y-6">
        {projects.map((project) => (
          <div key={project.id}>
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-zinc-800 dark:text-zinc-200">{project.name}</span>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">{project.progress}%</span>
            </div>
            <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  project.status === 'completed'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                    : 'bg-gradient-to-r from-cyan-500 to-purple-500'
                }`}
                style={{ width: `${project.progress}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-2">
              <div className="flex -space-x-2">
                {project.team.slice(0, 3).map((member, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-[10px] text-white border-2 border-white dark:border-zinc-800"
                    title={member}
                  >
                    {member[0]}
                  </div>
                ))}
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                任务数：{project.tasks.completed}/{project.tasks.total}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}