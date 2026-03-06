'use client';

/**
 * 成员贡献图表
 * 水平条形图展示成员贡献
 */

import React, { useMemo, memo } from 'react';

export interface MemberContribution {
  id: string;
  name: string;
  avatar?: string;
  tasksCompleted: number;
  contribution: number;
  efficiency: number;
  role: string;
}

interface MemberContributionChartProps {
  data: MemberContribution[];
  maxItems?: number;
}

const MemberContributionChart = memo(function MemberContributionChart({ 
  data, 
  maxItems = 10 
}: MemberContributionChartProps) {
  // 排序并限制数量
  const sortedData = useMemo(() => {
    return [...data]
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, maxItems);
  }, [data, maxItems]);

  // 计算最大贡献值
  const maxContribution = useMemo(() => {
    return Math.max(...sortedData.map(d => d.contribution), 1);
  }, [sortedData]);

  // 获取排名徽章
  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  // 获取颜色
  const getBarColor = (rank: number) => {
    if (rank === 1) return 'from-yellow-400 to-yellow-500';
    if (rank === 2) return 'from-gray-300 to-gray-400';
    if (rank === 3) return 'from-orange-400 to-orange-500';
    return 'from-blue-400 to-blue-500';
  };

  if (sortedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
        暂无数据
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedData.map((member, index) => {
        const rank = index + 1;
        const barWidth = (member.contribution / maxContribution) * 100;

        return (
          <div 
            key={member.id}
            className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {/* 排名 */}
            <div className="w-10 h-10 flex items-center justify-center text-xl flex-shrink-0">
              {getRankBadge(rank)}
            </div>

            {/* 头像和名称 */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {member.avatar ? (
                <img 
                  src={member.avatar} 
                  alt={member.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                  {member.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">{member.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{member.role}</p>
              </div>
            </div>

            {/* 贡献条 */}
            <div className="flex-1 max-w-xs">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${getBarColor(rank)} rounded-full transition-all duration-500`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>

            {/* 数据 */}
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-gray-900 dark:text-white">{member.contribution}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {member.tasksCompleted} 任务 · {member.efficiency}%
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default MemberContributionChart;