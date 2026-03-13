'use client';

interface StatsCardsProps {
  totalMembers: number;
  overallProgress: number;
  completedTasks: number;
  activityCount: number;
}

export function StatsCards({ totalMembers, overallProgress, completedTasks, activityCount }: StatsCardsProps) {
  const stats = [
    { value: totalMembers, label: 'AI 成员', colorClass: 'text-cyan-600 dark:text-cyan-400' },
    { value: `${overallProgress}%`, label: '任务完成率', colorClass: 'text-purple-600 dark:text-purple-400' },
    { value: completedTasks, label: '已完成任务', colorClass: 'text-green-600 dark:text-green-400' },
    { value: activityCount, label: '近期活动', colorClass: 'text-pink-600 dark:text-pink-400' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {stats.map((stat, index) => (
        <div 
          key={index} 
          className="bg-white dark:bg-zinc-800 rounded-2xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          <div className={`text-2xl md:text-3xl font-bold ${stat.colorClass}`}>{stat.value}</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 md:mt-2">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}