'use client';

/**
 * 贡献度排行榜组件
 */

import React, { memo } from 'react';

interface ContributionRankingProps {
  currentUserId: string;
  stats: {
    score: number;
    ranking: number;
    totalMembers: number;
  };
}

const ContributionRanking = memo(function ContributionRanking({
  stats,
}: ContributionRankingProps) {
  const { score, ranking, totalMembers } = stats;

  // 计算排名百分比
  const topPercent = totalMembers > 0 
    ? Math.round((1 - (ranking - 1) / totalMembers) * 100) 
    : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 transition-colors">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        🏆 贡献排行
      </h3>

      <div className="text-center py-4">
        <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">
          #{ranking}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          在 {totalMembers} 位成员中排名
        </p>

        <div className="mt-4 flex items-center justify-center gap-2">
          <div className="text-2xl">⭐</div>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {score.toLocaleString()}
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">积分</span>
        </div>

        <div className="mt-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            超越了 {topPercent}% 的成员
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
              style={{ width: `${topPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-center">
        <a
          href="/dashboard"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          查看完整排行榜 →
        </a>
      </div>
    </div>
  );
});

export default ContributionRanking;
