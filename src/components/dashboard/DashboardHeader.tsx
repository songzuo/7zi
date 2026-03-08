'use client';

export function DashboardHeader() {
  return (
    <div className="text-center mb-12">
      <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
        📊 AI 团队任务看板
      </h2>
      <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
        实时追踪 AI 团队的任务分配和执行进度
      </p>
    </div>
  );
}