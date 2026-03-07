'use client';

/**
 * 成就徽章组件
 */

import React, { memo } from 'react';
import type { Achievement } from '@/app/users/[userId]/dashboard/page';

interface AchievementBadgesProps {
  achievements: Achievement[];
}

// 默认成就列表
const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_task',
    name: '初出茅庐',
    description: '完成第一个任务',
    icon: '🌟',
    progress: 1,
    total: 1,
  },
  {
    id: 'task_master',
    name: '任务大师',
    description: '完成 100 个任务',
    icon: '🎯',
    progress: 0,
    total: 100,
  },
  {
    id: 'streak_7',
    name: '连续活跃',
    description: '连续 7 天活跃',
    icon: '🔥',
    progress: 0,
    total: 7,
  },
  {
    id: 'team_player',
    name: '团队协作',
    description: '参与 10 个协作任务',
    icon: '🤝',
    progress: 0,
    total: 10,
  },
  {
    id: 'code_warrior',
    name: '代码战士',
    description: '提交 50 次代码',
    icon: '💻',
    progress: 0,
    total: 50,
  },
  {
    id: 'top_contributor',
    name: '顶级贡献者',
    description: '贡献积分达到 1000',
    icon: '👑',
    progress: 0,
    total: 1000,
  },
];

const AchievementBadges = memo(function AchievementBadges({
  achievements,
}: AchievementBadgesProps) {
  // 合并成就进度
  const displayAchievements = DEFAULT_ACHIEVEMENTS.map((defaultAch) => {
    const userAch = achievements.find((a) => a.id === defaultAch.id);
    return userAch || defaultAch;
  });

  // 计算已获得数量
  const earnedCount = displayAchievements.filter((a) => a.earnedAt || (a.progress && a.progress >= (a.total || 1))).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 transition-colors">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        🏅 成就徽章
        <span className="text-xs font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
          {earnedCount} / {displayAchievements.length}
        </span>
      </h3>

      <div className="grid grid-cols-3 gap-3">
        {displayAchievements.map((achievement) => {
          const isEarned = achievement.earnedAt || 
            (achievement.progress !== undefined && 
             achievement.total !== undefined && 
             achievement.progress >= achievement.total);
          
          const progress = achievement.progress || 0;
          const total = achievement.total || 1;
          const progressPercent = Math.min((progress / total) * 100, 100);

          return (
            <div
              key={achievement.id}
              className={`relative group text-center p-3 rounded-xl transition-all ${
                isEarned
                  ? 'bg-yellow-50 dark:bg-yellow-900/20'
                  : 'bg-gray-50 dark:bg-gray-700/50 opacity-60'
              }`}
              title={`${achievement.name}: ${achievement.description}`}
            >
              <div className={`text-3xl ${isEarned ? '' : 'grayscale'}`}>
                {achievement.icon}
              </div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-1 truncate">
                {achievement.name}
              </p>

              {/* 进度条 */}
              {!isEarned && achievement.progress !== undefined && (
                <div className="mt-1">
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {progress} / {total}
                  </p>
                </div>
              )}

              {/* 已获得标记 */}
              {isEarned && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default AchievementBadges;
